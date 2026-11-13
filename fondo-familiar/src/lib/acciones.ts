"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { requerirAdmin, requerirPerfil, requerirSesion as requerirSesionPerfil } from "@/lib/auth";
import { hoyColombia, pesos } from "@/lib/format";
import { enviarCorreos, plantilla } from "@/lib/correo";
import { resumenPrestamo } from "@/lib/cuentas";
import { cicloCerrado, datosCierre, plazoVencido } from "@/lib/cierre";
import { gmfPorPagar } from "@/lib/prestamos";
import { enviarPush, enviarPushAdmins } from "@/lib/push";

export type EstadoForm = { error?: string; ok?: boolean };

const CELULAR = /^3\d{9}$/;
const limpiarCelular = (v: FormDataEntryValue | null) =>
  String(v ?? "").replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

// Primer ingreso: solo con el celular. Funciona mientras la cuenta no haya sido completada.
export async function primerIngreso(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const celular = limpiarCelular(formData.get("celular"));
  if (!CELULAR.test(celular)) return { error: "Escribe tu celular de 10 dígitos." };

  const admin = clienteAdmin();
  const { data: perfil, error: errorConsulta } = await admin
    .from("perfiles")
    .select("id, activo, primer_ingreso_completo")
    .eq("celular", celular)
    .maybeSingle();

  if (errorConsulta) {
    console.error("primerIngreso: fallo la consulta de perfiles", errorConsulta.message);
    return { error: "Error del servidor al verificar tu celular. Avisa a un administrador." };
  }
  if (!perfil) {
    // Con una clave sin permisos de administrador, RLS devuelve vacío sin error: se comprueba aparte.
    const { error: errorClave } = await admin.auth.admin.listUsers({ perPage: 1 });
    if (errorClave) {
      console.error("primerIngreso: SUPABASE_SERVICE_ROLE_KEY no es válida", errorClave.message);
      return { error: "Error de configuración del servidor (clave de administración). Avisa a un administrador." };
    }
  }
  if (!perfil || !perfil.activo) return { error: "Ese celular no está registrado en el fondo." };
  if (perfil.primer_ingreso_completo) {
    return { error: "Tu cuenta ya está activada. Ingresa con tu correo y contraseña." };
  }

  const { data: usuario } = await admin.auth.admin.getUserById(perfil.id);
  const email = usuario.user?.email;
  if (!email) return { error: "No se pudo iniciar. Avisa a un administrador." };

  const { data: enlace, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !enlace) return { error: "No se pudo iniciar. Intenta de nuevo." };

  const supabase = await crearClienteServidor();
  const { error: errorSesion } = await supabase.auth.verifyOtp({
    token_hash: enlace.properties.hashed_token,
    type: "magiclink",
  });
  if (errorSesion) return { error: "No se pudo iniciar. Intenta de nuevo." };

  redirect("/completar-cuenta");
}

// Segundo paso del primer ingreso: correo real y contraseña propia.
export async function completarCuenta(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const clave = String(formData.get("clave") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");
  const cuentaPago = String(formData.get("cuenta_pago") ?? "").trim().slice(0, 120);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: "Escribe un correo válido." };
  if (clave.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (clave !== confirmar) return { error: "Las contraseñas no coinciden." };
  if (cuentaPago.length < 3) return { error: "Escribe la cuenta o llave donde recibirás tus pagos." };

  const admin = clienteAdmin();
  const { data: perfil } = await admin
    .from("perfiles")
    .select("primer_ingreso_completo")
    .eq("id", user.id)
    .single();
  // Evita usar esta acción para cambiar el correo de una cuenta ya completada.
  if (perfil?.primer_ingreso_completo) redirect("/");

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: correo,
    password: clave,
    email_confirm: true,
  });
  if (error) {
    return {
      error: /already|registered|exists/i.test(error.message)
        ? "Ese correo ya está en uso."
        : "No se pudo guardar. Intenta de nuevo.",
    };
  }

  await admin.from("perfiles").update({ correo, cuenta_pago: cuentaPago, primer_ingreso_completo: true }).eq("id", user.id);
  await supabase.auth.signInWithPassword({ email: correo, password: clave });
  redirect("/elegir-panel");
}

// Cuenta o llave donde el asociado recibe sus pagos (la ven quienes deben consignarle).
export async function guardarCuentaPago(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  const cuenta = String(formData.get("cuenta_pago") ?? "").trim().slice(0, 120);
  if (cuenta.length < 3) return { error: "Escribe tu cuenta o llave." };

  // Los asociados no tienen permiso de escritura sobre perfiles; se actualiza solo su propia fila.
  const { error } = await clienteAdmin().from("perfiles").update({ cuenta_pago: cuenta }).eq("id", perfil.id);
  if (error) return { error: "No se pudo guardar. Intenta de nuevo." };
  revalidatePath("/perfil");
  revalidatePath("/");
  return { ok: true };
}

// ───────── Panel de administración ─────────
export async function actualizarAsociado(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirAdmin();

  const id = String(formData.get("id"));
  const celularTexto = String(formData.get("celular") ?? "").trim();
  const celular = celularTexto ? limpiarCelular(celularTexto) : null;
  const ciudad = String(formData.get("ciudad") ?? "").trim() || null;
  const cuentaPago = String(formData.get("cuenta_pago") ?? "").trim().slice(0, 120) || null;

  if (celular && !CELULAR.test(celular)) return { error: "Celular de 10 dígitos que empiece por 3." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("perfiles").update({ celular, ciudad, cuenta_pago: cuentaPago }).eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "Ese celular ya lo tiene otro asociado." : "No se pudo guardar." };
  }
  revalidatePath("/admin/asociados");
  return { ok: true };
}

// Permite que la persona vuelva a usar "Primer ingreso" (por ejemplo, si olvidó su contraseña).
export async function reiniciarPrimerIngreso(formData: FormData) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  await supabase
    .from("perfiles")
    .update({ primer_ingreso_completo: false })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/asociados");
}

// ───────── Cuotas y aportes (tesorero / contador / fiscal) ─────────
export async function registrarAporte(formData: FormData) {
  const admin = await requerirAdmin();
  const tipo = String(formData.get("tipo"));
  if (tipo !== "inicial" && tipo !== "tecnologico") return;
  const clave = tipo === "inicial" ? "aporte_inicial" : "aporte_tecnologico";
  const supabase = await crearClienteServidor();
  const { data: parametro } = await supabase.from("parametros").select("valor").eq("clave", clave).single();
  await supabase.from("aportes_unicos").insert({
    asociado_id: String(formData.get("asociado_id")),
    tipo,
    monto: Number(parametro?.valor ?? 0),
    fecha_pago: String(formData.get("fecha") ?? "") || hoyColombia(),
    registrado_por: admin.id,
  });
  revalidatePath("/admin/aportes");
}

export async function deshacerAporte(formData: FormData) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  await supabase.from("aportes_unicos").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/aportes");
}

// ───────── Captura mensual de la cuenta NU ─────────
export async function subirCaptura(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requerirAdmin();
  const mes = String(formData.get("mes") ?? ""); // YYYY-MM
  const archivo = formData.get("archivo");
  const saldoTexto = String(formData.get("saldo") ?? "").replace(/\D/g, "");

  if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Elige el mes." };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Adjunta la captura de pantalla." };
  if (!archivo.type.startsWith("image/")) return { error: "El archivo debe ser una imagen." };
  if (archivo.size > 8 * 1024 * 1024) return { error: "La imagen pesa más de 8 MB." };

  const supabase = await crearClienteServidor();
  const { data: previa } = await supabase
    .from("capturas_cuenta")
    .select("ruta_archivo")
    .eq("periodo", `${mes}-01`)
    .maybeSingle();
  const ruta = `${mes}/${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
  const { error: errorSubida } = await supabase.storage.from("capturas-nu").upload(ruta, archivo);
  if (errorSubida) return { error: "No se pudo subir la imagen." };

  const { error } = await supabase.from("capturas_cuenta").upsert(
    {
      periodo: `${mes}-01`,
      ruta_archivo: ruta,
      saldo_declarado: saldoTexto ? Number(saldoTexto) : null,
      subido_por: admin.id,
      subido_en: new Date().toISOString(),
    },
    { onConflict: "periodo" },
  );
  if (error) return { error: "No se pudo guardar el registro." };
  if (previa?.ruta_archivo) await supabase.storage.from("capturas-nu").remove([previa.ruta_archivo]);
  revalidatePath("/admin/capturas");
  return { ok: true };
}

// Corrige una captura ya subida: cambia el saldo declarado y, si se adjunta, reemplaza la imagen.
export async function editarCaptura(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requerirAdmin();
  const periodo = String(formData.get("periodo") ?? "");
  const archivo = formData.get("archivo");
  const saldoTexto = String(formData.get("saldo") ?? "").replace(/\D/g, "");
  if (!/^\d{4}-\d{2}-01$/.test(periodo)) return { error: "Captura no válida." };

  const supabase = await crearClienteServidor();
  const { data: previa } = await supabase.from("capturas_cuenta").select("ruta_archivo").eq("periodo", periodo).maybeSingle();
  if (!previa) return { error: "La captura ya no existe." };

  const cambios: Record<string, unknown> = {
    saldo_declarado: saldoTexto ? Number(saldoTexto) : null,
    subido_por: admin.id,
  };
  let rutaNueva: string | null = null;
  if (archivo instanceof File && archivo.size > 0) {
    if (!archivo.type.startsWith("image/")) return { error: "El archivo debe ser una imagen." };
    if (archivo.size > 8 * 1024 * 1024) return { error: "La imagen pesa más de 8 MB." };
    rutaNueva = `${periodo.slice(0, 7)}/${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
    const { error: errorSubida } = await supabase.storage.from("capturas-nu").upload(rutaNueva, archivo);
    if (errorSubida) return { error: "No se pudo subir la imagen." };
    cambios.ruta_archivo = rutaNueva;
    cambios.subido_en = new Date().toISOString();
  }

  const { error } = await supabase.from("capturas_cuenta").update(cambios).eq("periodo", periodo);
  if (error) return { error: "No se pudo guardar el cambio." };
  if (rutaNueva) await supabase.storage.from("capturas-nu").remove([previa.ruta_archivo]);
  revalidatePath("/admin/capturas");
  return { ok: true };
}

export async function eliminarCaptura(periodo: string): Promise<EstadoForm> {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const { data: previa } = await supabase.from("capturas_cuenta").select("ruta_archivo").eq("periodo", periodo).maybeSingle();
  if (!previa) return { ok: true };
  const { error } = await supabase.from("capturas_cuenta").delete().eq("periodo", periodo);
  if (error) return { error: "No se pudo eliminar." };
  await supabase.storage.from("capturas-nu").remove([previa.ruta_archivo]);
  revalidatePath("/admin/capturas");
  return { ok: true };
}

// ───────── Pagos reportados por los asociados ─────────
// El asociado sube el comprobante de lo que pagó (al fondo y/o a quien tiene la cadena ese mes).
export async function reportarPago(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  const cuotaId = String(formData.get("cuota_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const archivo = formData.get("archivo");

  if (tipo !== "fondo" && tipo !== "cadena") return { error: "Tipo de pago no válido." };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Adjunta la captura del pago." };
  if (!archivo.type.startsWith("image/")) return { error: "El archivo debe ser una imagen (pantallazo o foto del comprobante)." };
  if (archivo.size > 8 * 1024 * 1024) return { error: "La imagen pesa más de 8 MB." };

  const supabase = await crearClienteServidor();
  const { data: cuota } = await supabase
    .from("cuotas")
    .select("id, ahorro, cadena, juegos, estado")
    .eq("id", cuotaId)
    .eq("asociado_id", perfil.id)
    .maybeSingle();
  if (!cuota) return { error: "No se encontró la cuota." };
  if (cuota.estado === "pagada") return { error: "Esta cuota ya está registrada como pagada." };

  const monto = tipo === "fondo" ? Number(cuota.ahorro) + Number(cuota.juegos) : Number(cuota.cadena);
  if (monto <= 0) return { error: "Este mes no tienes que pagar esa parte." };

  const { data: previo } = await supabase
    .from("pagos_reportados")
    .select("estado, ruta_archivo")
    .eq("cuota_id", cuotaId)
    .eq("tipo", tipo)
    .maybeSingle();
  if (previo?.estado === "aprobado") return { error: "Este pago ya fue aprobado." };

  const ruta = `${perfil.id}/${cuotaId}-${tipo}-${Date.now()}.jpg`;
  const { error: errorSubida } = await supabase.storage.from("comprobantes-pago").upload(ruta, archivo);
  if (errorSubida) return { error: "No se pudo subir la imagen." };

  const { error } = await supabase.from("pagos_reportados").upsert(
    {
      cuota_id: cuotaId,
      asociado_id: perfil.id,
      tipo,
      monto,
      ruta_archivo: ruta,
      subido_por: perfil.id,
      estado: "pendiente",
      nota: null,
      creado_en: new Date().toISOString(),
      revisado_por: null,
      revisado_en: null,
    },
    { onConflict: "cuota_id,tipo" },
  );
  if (error) {
    await supabase.storage.from("comprobantes-pago").remove([ruta]);
    return { error: "No se pudo registrar el pago." };
  }
  if (previo?.ruta_archivo) await supabase.storage.from("comprobantes-pago").remove([previo.ruta_archivo]);
  revalidatePath("/pagos");
  revalidatePath("/admin/pagos");
  return { ok: true };
}

// La cuota queda pagada cuando el pago al fondo y (si tiene cadena) el de la cadena están aprobados.
// Si se deshace una aprobación, vuelve a pendiente.
async function sincronizarCuota(db: SupabaseClient, cuotaId: string, usuarioId: string, estabaAprobado: boolean) {
  const [{ data: cuota }, { data: pagos }] = await Promise.all([
    db.from("cuotas").select("cadena, estado").eq("id", cuotaId).single(),
    db.from("pagos_reportados").select("tipo, estado").eq("cuota_id", cuotaId),
  ]);
  const aprobado = (t: string) => (pagos ?? []).some((x) => x.tipo === t && x.estado === "aprobado");
  const completa = aprobado("fondo") && (Number(cuota?.cadena ?? 0) === 0 || aprobado("cadena"));

  if (completa && cuota?.estado !== "pagada") {
    await db.from("cuotas").update({ estado: "pagada", fecha_pago: hoyColombia(), registrado_por: usuarioId }).eq("id", cuotaId);
  } else if (!completa && estabaAprobado && cuota?.estado === "pagada") {
    await db.from("cuotas").update({ estado: "pendiente", fecha_pago: null, registrado_por: usuarioId }).eq("id", cuotaId);
  }
}

// Quien tiene el turno de cadena confirma (o niega) haber recibido el pago de cada socio.
// Basta una de las dos partes: la confirmación del receptor o la aprobación de un administrador.
export async function confirmarRecepcion(
  pagoId: string,
  decision: "recibido" | "no_recibido" | "deshacer",
): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  const db = clienteAdmin();

  const { data: pago } = await db
    .from("pagos_reportados")
    .select("cuota_id, tipo, estado, revisado_por")
    .eq("id", pagoId)
    .maybeSingle();
  if (!pago || pago.tipo !== "cadena") return { error: "El pago ya no existe." };

  const { data: cuota } = await db.from("cuotas").select("periodo").eq("id", pago.cuota_id).single();
  const { data: turnos } = await db.from("cadena_turnos").select("fecha_reunion").eq("asociado_id", perfil.id);
  const esMiTurno = (turnos ?? []).some((t) => t.fecha_reunion.slice(0, 7) === cuota?.periodo.slice(0, 7));
  if (!esMiTurno) return { error: "Solo quien tiene el turno de este mes puede confirmar." };

  let cambios: Record<string, unknown>;
  if (decision === "recibido") {
    cambios = { estado: "aprobado", nota: null, revisado_por: perfil.id, revisado_en: new Date().toISOString() };
  } else if (decision === "no_recibido") {
    if (pago.estado === "aprobado" && pago.revisado_por !== perfil.id) {
      return { error: "Un administrador ya aprobó este pago. Avísale para revisarlo." };
    }
    cambios = { estado: "rechazado", nota: "El receptor indica que no lo recibió", revisado_por: perfil.id, revisado_en: new Date().toISOString() };
  } else {
    if (pago.estado !== "pendiente" && pago.revisado_por !== perfil.id) return { error: "Solo puedes deshacer tus propias confirmaciones." };
    cambios = { estado: "pendiente", nota: null, revisado_por: null, revisado_en: null };
  }

  const { error } = await db.from("pagos_reportados").update(cambios).eq("id", pagoId);
  if (error) return { error: "No se pudo guardar." };
  await sincronizarCuota(db, pago.cuota_id, perfil.id, pago.estado === "aprobado");
  revalidatePath("/recibos");
  revalidatePath("/admin/pagos");
  revalidatePath("/pagos");
  revalidatePath("/");
  return { ok: true };
}

// Un administrador sube el comprobante de un asociado que no supo hacerlo. Sin comprobante no hay aprobación.
// Se usa el cliente de servicio porque la política de almacenamiento solo deja subir a la carpeta propia.
export async function subirComprobanteAdmin(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requerirAdmin();
  const cuotaId = String(formData.get("cuota_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const archivo = formData.get("archivo");

  if (tipo !== "fondo" && tipo !== "cadena") return { error: "Tipo de pago no válido." };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Adjunta la captura del pago." };
  if (!archivo.type.startsWith("image/")) return { error: "El archivo debe ser una imagen (pantallazo o foto del comprobante)." };
  if (archivo.size > 8 * 1024 * 1024) return { error: "La imagen pesa más de 8 MB." };

  const db = clienteAdmin();
  const { data: cuota } = await db
    .from("cuotas")
    .select("id, asociado_id, ahorro, cadena, juegos, estado")
    .eq("id", cuotaId)
    .maybeSingle();
  if (!cuota) return { error: "No se encontró la cuota." };
  if (cuota.estado === "pagada") return { error: "Esta cuota ya está registrada como pagada." };

  const monto = tipo === "fondo" ? Number(cuota.ahorro) + Number(cuota.juegos) : Number(cuota.cadena);
  if (monto <= 0) return { error: "Esa parte no aplica para este asociado en este mes." };

  const { data: previo } = await db
    .from("pagos_reportados")
    .select("estado, ruta_archivo")
    .eq("cuota_id", cuotaId)
    .eq("tipo", tipo)
    .maybeSingle();
  if (previo?.estado === "aprobado") return { error: "Este pago ya fue aprobado." };

  const ruta = `${cuota.asociado_id}/${cuotaId}-${tipo}-${Date.now()}.jpg`;
  const { error: errorSubida } = await db.storage.from("comprobantes-pago").upload(ruta, archivo);
  if (errorSubida) return { error: "No se pudo subir la imagen." };

  const { error } = await db.from("pagos_reportados").upsert(
    {
      cuota_id: cuotaId,
      asociado_id: cuota.asociado_id,
      tipo,
      monto,
      ruta_archivo: ruta,
      subido_por: admin.id,
      estado: "pendiente",
      nota: null,
      creado_en: new Date().toISOString(),
      revisado_por: null,
      revisado_en: null,
    },
    { onConflict: "cuota_id,tipo" },
  );
  if (error) {
    await db.storage.from("comprobantes-pago").remove([ruta]);
    return { error: "No se pudo registrar el pago." };
  }
  if (previo?.ruta_archivo) await db.storage.from("comprobantes-pago").remove([previo.ruta_archivo]);
  revalidatePath("/admin/pagos");
  revalidatePath("/pagos");
  return { ok: true };
}

// Un administrador aprueba, rechaza o reabre un pago reportado. Cuando el fondo y (si corresponde)
// la cadena de la cuota están aprobados, la cuota pasa a pagada y cambia el estado de cuenta.
export async function revisarPago(
  id: string,
  decision: "aprobado" | "rechazado" | "pendiente",
  nota?: string,
): Promise<EstadoForm> {
  const admin = await requerirAdmin();
  if (!["aprobado", "rechazado", "pendiente"].includes(decision)) return { error: "Decisión no válida." };
  const supabase = await crearClienteServidor();

  const { data: pago } = await supabase.from("pagos_reportados").select("cuota_id, estado").eq("id", id).maybeSingle();
  if (!pago) return { error: "El pago ya no existe." };

  const { error } = await supabase
    .from("pagos_reportados")
    .update({
      estado: decision,
      nota: decision === "rechazado" ? (nota ?? "").trim().slice(0, 200) || null : null,
      revisado_por: decision === "pendiente" ? null : admin.id,
      revisado_en: decision === "pendiente" ? null : new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "No se pudo guardar la revisión." };

  await sincronizarCuota(supabase, pago.cuota_id, admin.id, pago.estado === "aprobado");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/cuotas");
  revalidatePath("/pagos");
  revalidatePath("/");
  return { ok: true };
}

// ───────── Préstamos ─────────
const montoDe = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/\D/g, ""));

export async function solicitarPrestamo(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  const monto = montoDe(formData.get("monto"));
  const externo = String(formData.get("externo") ?? "").trim();
  const hoy = hoyColombia();

  if (await cicloCerrado()) return { error: "El ciclo está cerrado: ya no se reciben solicitudes de préstamo." };

  const supabase = await crearClienteServidor();
  const [{ data: tope }, { data: impagas }, { data: turnos }, { data: multas }] = await Promise.all([
    supabase.from("parametros").select("valor").eq("clave", "tope_prestamo").single(),
    supabase.from("cuotas").select("periodo").eq("asociado_id", perfil.id).neq("estado", "pagada"),
    supabase.from("cadena_turnos").select("fecha_reunion"),
    supabase.from("multas").select("id").eq("asociado_id", perfil.id).eq("pagada", false),
  ]);

  if (!monto || monto < 10000) return { error: "Escribe un monto de al menos $10.000." };
  if (monto > Number(tope?.valor ?? 1_000_000)) {
    return { error: "El monto supera el tope por asociado." };
  }
  const vencidas = (impagas ?? []).some((c) =>
    (turnos ?? []).some((t) => t.fecha_reunion.slice(0, 7) === c.periodo.slice(0, 7) && t.fecha_reunion < hoy),
  );
  if (vencidas || (multas ?? []).length > 0) {
    return { error: "Debes estar al día (cuotas y multas) para solicitar un préstamo." };
  }

  let externoId: string | null = null;
  if (externo) {
    const { data, error } = await clienteAdmin()
      .from("externos")
      .insert({ nombre: externo, padrino_id: perfil.id })
      .select("id")
      .single();
    if (error) return { error: "No se pudo registrar al externo." };
    externoId = data.id;
  }

  const { error } = await supabase
    .from("prestamos")
    .insert({ asociado_id: perfil.id, externo_id: externoId, monto, estado: "radicado" });
  if (error) {
    return {
      error: error.code === "23505" ? "Ya tienes una solicitud o un préstamo en curso." : "No se pudo radicar la solicitud.",
    };
  }
  // Aviso a los directivos (si falla el correo, la solicitud ya quedó radicada).
  try {
    const { data: admins } = await clienteAdmin().from("perfiles").select("correo").in("rol", ["tesorero", "contador", "fiscal"]).eq("activo", true);
    await enviarCorreos(
      (admins ?? []).map((a) => a.correo),
      "Nueva solicitud de préstamo",
      plantilla("Nueva solicitud de préstamo", [`${perfil.nombre} solicitó ${pesos(monto)}.`, "Revísala y vota en el panel de administración."], { texto: "Ir a préstamos", ruta: "/admin/prestamos" }),
    );
    await enviarPushAdmins({
      titulo: "Nueva solicitud de préstamo",
      cuerpo: `${perfil.nombre} solicitó ${pesos(monto)}. Revísala y vota.`,
      url: "/admin/prestamos",
      tag: "solicitud",
    });
  } catch (e) {
    console.error("Aviso de solicitud falló", e);
  }
  revalidatePath("/prestamos");
  revalidatePath("/");
  return { ok: true };
}

export async function votarPrestamo(formData: FormData) {
  const admin = await requerirAdmin();
  const voto = String(formData.get("voto"));
  if (voto !== "aprobar" && voto !== "rechazar") return;
  const supabase = await crearClienteServidor();
  const prestamoId = String(formData.get("id"));
  const { error } = await supabase.from("votos_prestamo").insert({ prestamo_id: prestamoId, admin_id: admin.id, voto });
  if (!error) {
    // Si con este voto se decidió la solicitud, se avisa al solicitante.
    const { data: p } = await supabase.from("prestamos").select("estado, monto, asociado_id").eq("id", prestamoId).single();
    if (p && (p.estado === "aprobado" || p.estado === "rechazado")) {
      await enviarPush([p.asociado_id], {
        titulo: p.estado === "aprobado" ? "Tu préstamo fue aprobado" : "Tu solicitud de préstamo fue rechazada",
        cuerpo:
          p.estado === "aprobado"
            ? `Los directivos aprobaron ${pesos(Number(p.monto))}. Pronto se te entregará el dinero.`
            : "Los directivos no aprobaron tu solicitud. Consulta con ellos los detalles.",
        url: "/prestamos",
        tag: "prestamo-decision",
      }).catch(() => 0);
    }
  }
  revalidatePath("/admin/prestamos");
}

export async function desembolsarPrestamo(formData: FormData) {
  const admin = await requerirAdmin();
  const id = String(formData.get("id"));
  if (await cicloCerrado()) return;
  const supabase = await crearClienteServidor();
  const [{ data: prestamo }, { data: caja }] = await Promise.all([
    supabase.from("prestamos").select("monto, estado, asociado_id").eq("id", id).single(),
    supabase.rpc("caja_disponible"),
  ]);
  // La caja ya descuenta los préstamos aprobados, incluido este.
  if (!prestamo || prestamo.estado !== "aprobado" || Number(caja) < 0) return;
  // No se desembolsa a quien tenga multas pendientes.
  const { data: multasPend } = await supabase
    .from("multas")
    .select("id")
    .eq("asociado_id", prestamo.asociado_id)
    .eq("pagada", false)
    .limit(1);
  if ((multasPend ?? []).length > 0) return;

  const fecha = hoyColombia();
  const { error } = await supabase
    .from("movimientos_prestamo")
    .insert({ prestamo_id: id, tipo: "desembolso", monto: prestamo.monto, fecha, registrado_por: admin.id });
  if (error) return;
  await supabase.from("prestamos").update({ estado: "vigente", desembolsado_en: fecha, cobrar_4x1000: true }).eq("id", id);
  await enviarPush([prestamo.asociado_id], {
    titulo: "Tu préstamo fue desembolsado",
    cuerpo: `Se habilitó tu préstamo de ${pesos(Number(prestamo.monto))}. Pagarás el interés cada mes, el día ${Number(fecha.slice(8, 10))}.`,
    url: "/prestamos",
    tag: "prestamo-desembolso",
  }).catch(() => 0);
  revalidatePath("/admin/prestamos");
}

// Cierra el ciclo: bloquea préstamos nuevos y avisa a todos. Solo si no hay préstamos por cancelar.
export async function cerrarCiclo(): Promise<void> {
  await requerirAdmin();
  if ((await datosCierre()).pendientes.length > 0) return;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("parametros").upsert({ clave: "ciclo_cerrado", valor: 1, descripcion: "Cierre de ciclo: 1 = cerrado, bloquea préstamos nuevos" });
  if (error) return;
  await enviarPush(null, {
    titulo: "El ciclo del fondo se cerró",
    cuerpo: "Ya no se reciben nuevos préstamos. Pronto se hará la liquidación y la devolución de ahorros y utilidades.",
    url: "/",
    tag: "ciclo-cerrado",
  }).catch(() => 0);
  revalidatePath("/admin/cierre");
  revalidatePath("/prestamos");
  revalidatePath("/");
}

// Reabre el ciclo (por si se cerró por error).
export async function reabrirCiclo(): Promise<void> {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  await supabase.from("parametros").update({ valor: 0 }).eq("clave", "ciclo_cerrado");
  revalidatePath("/admin/cierre");
  revalidatePath("/prestamos");
  revalidatePath("/");
}

// El asociado reporta un pago de su préstamo (interés, mora y/o abono a capital) con comprobante.
export async function reportarPagoPrestamo(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  const interes = montoDe(formData.get("interes"));
  const mora = montoDe(formData.get("mora"));
  const capital = montoDe(formData.get("capital"));
  const archivo = formData.get("archivo");

  const vencido = await plazoVencido();
  if (vencido) {
    return { error: `El plazo para devolver préstamos terminó a las ${vencido.horaLimite}, antes de la reunión de liquidación. Habla con un directivo.` };
  }
  if (interes + mora + capital <= 0) return { error: "Escribe cuánto vas a pagar (interés, mora o abono a capital)." };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Adjunta la captura del pago." };
  if (!archivo.type.startsWith("image/")) return { error: "El archivo debe ser una imagen (pantallazo o foto del comprobante)." };
  if (archivo.size > 8 * 1024 * 1024) return { error: "La imagen pesa más de 8 MB." };

  const { prestamo } = await resumenPrestamo(perfil.id);
  if (!prestamo || prestamo.estado !== "vigente" || !("cuentas" in prestamo)) return { error: "No tienes un préstamo vigente." };
  const c = prestamo.cuentas;
  if (capital > c.saldoCapital) return { error: `El abono a capital no puede superar tu saldo (${c.saldoCapital.toLocaleString("es-CO")}).` };
  if (capital > 0 && capital === c.saldoCapital && interes < c.interesPendiente) {
    return { error: "Para cancelar el préstamo también debes pagar el interés pendiente." };
  }

  const supabase = await crearClienteServidor();
  const ruta = `${perfil.id}/prestamo-${prestamo.id}-${Date.now()}.jpg`;
  const { error: errorSubida } = await supabase.storage.from("comprobantes-pago").upload(ruta, archivo);
  if (errorSubida) return { error: "No se pudo subir la imagen." };

  // De lo que paga como interés, primero se cubre el reembolso del 4x1000 pendiente.
  const gmf = Math.min(interes, c.gmfPendiente);
  const { error } = await supabase.from("pagos_prestamo").insert({
    prestamo_id: prestamo.id,
    asociado_id: perfil.id,
    monto_interes: interes - gmf,
    monto_4x1000: gmf,
    monto_mora: mora,
    monto_capital: capital,
    ruta_archivo: ruta,
    subido_por: perfil.id,
  });
  if (error) {
    await supabase.storage.from("comprobantes-pago").remove([ruta]);
    return { error: "No se pudo registrar el pago." };
  }

  try {
    const { data: admins } = await clienteAdmin().from("perfiles").select("correo").in("rol", ["tesorero", "contador", "fiscal"]).eq("activo", true);
    await enviarCorreos(
      (admins ?? []).map((a) => a.correo),
      "Pago de préstamo por revisar",
      plantilla("Pago de préstamo por revisar", [`${perfil.nombre} reportó un pago de ${pesos(interes + mora + capital)} a su préstamo.`], { texto: "Revisar pagos", ruta: "/admin/pagos" }),
    );
    await enviarPushAdmins({
      titulo: "Pago de préstamo por revisar",
      cuerpo: `${perfil.nombre} reportó un pago de ${pesos(interes + mora + capital)}.`,
      url: "/admin/pagos?tipo=prestamo",
      tag: "pago-prestamo",
    });
  } catch (e) {
    console.error("Aviso de pago de préstamo falló", e);
  }

  revalidatePath("/pagos");
  revalidatePath("/prestamos");
  revalidatePath("/admin/pagos");
  return { ok: true };
}

// Un administrador aprueba (crea los movimientos y, si se cancela el capital, libera al asociado) o rechaza.
export async function revisarPagoPrestamo(id: string, decision: "aprobado" | "rechazado", nota?: string): Promise<EstadoForm> {
  const admin = await requerirAdmin();
  const supabase = await crearClienteServidor();
  const { data: reportado } = await supabase.from("pagos_prestamo").select("asociado_id").eq("id", id).maybeSingle();

  if (decision === "aprobado") {
    const { data, error } = await supabase.rpc("aprobar_pago_prestamo", { p_id: id });
    if (error) return { error: "No se pudo aprobar el pago." };
    if (data !== "ok") return { error: String(data) };
  } else {
    const { data, error } = await supabase
      .from("pagos_prestamo")
      .update({ estado: "rechazado", nota: (nota ?? "").trim().slice(0, 200) || null, revisado_por: admin.id, revisado_en: new Date().toISOString() })
      .eq("id", id)
      .eq("estado", "pendiente")
      .select("id");
    if (error || !data?.length) return { error: "No se pudo rechazar (¿ya fue revisado?)." };
  }
  if (reportado) {
    await enviarPush([reportado.asociado_id], {
      titulo: decision === "aprobado" ? "Pago de préstamo aprobado" : "Pago de préstamo rechazado",
      cuerpo: decision === "aprobado" ? "Un administrador confirmó tu pago. ¡Gracias!" : "Revisa el motivo y vuelve a enviar tu comprobante.",
      url: "/prestamos",
      tag: "pago-prestamo-revisado",
    }).catch(() => 0);
  }
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/prestamos");
  revalidatePath("/prestamos");
  revalidatePath("/pagos");
  revalidatePath("/");
  return { ok: true };
}

// ───────── Asistencia, multas y juegos ─────────
const ESTADOS_ASISTENCIA = ["puntual", "tarde", "ausente", "justificada"] as const;

// Guarda la asistencia de una reunión y genera las multas que correspondan.
// Retraso: multa de retraso. Ausencia injustificada: multa solo a residentes en Pasto.
// Es idempotente: repetirla (doble clic, dos admins) no duplica multas gracias al índice único.
export async function guardarAsistencia(reunionId: string, estados: Record<string, string>): Promise<EstadoForm> {
  await requerirAdmin();
  const supabase = await crearClienteServidor();

  const [{ data: perfiles }, { data: params }, { data: multasPrevias }] = await Promise.all([
    supabase.from("perfiles").select("id, ciudad").eq("activo", true),
    supabase.from("parametros").select("clave, valor").in("clave", ["multa_tarde", "multa_ausencia"]),
    supabase.from("multas").select("id, asociado_id, pagada").eq("reunion_id", reunionId),
  ]);
  const p = Object.fromEntries((params ?? []).map((x) => [x.clave, Number(x.valor)]));

  const asistencias: { reunion_id: string; asociado_id: string; estado: string }[] = [];
  const nuevasMultas: { asociado_id: string; reunion_id: string; motivo: string; monto: number }[] = [];

  for (const persona of perfiles ?? []) {
    const estado = String(estados[persona.id] ?? "");
    if (!(ESTADOS_ASISTENCIA as readonly string[]).includes(estado)) continue;
    asistencias.push({ reunion_id: reunionId, asociado_id: persona.id, estado });

    // Las multas ya pagadas no se tocan ni se duplican.
    if ((multasPrevias ?? []).some((m) => m.asociado_id === persona.id && m.pagada)) continue;
    if (estado === "tarde") {
      nuevasMultas.push({ asociado_id: persona.id, reunion_id: reunionId, motivo: "Retraso a la reunión", monto: p.multa_tarde ?? 5000 });
    } else if (estado === "ausente" && persona.ciudad === "Pasto") {
      nuevasMultas.push({ asociado_id: persona.id, reunion_id: reunionId, motivo: "Inasistencia injustificada", monto: p.multa_ausencia ?? 8000 });
    }
  }

  const { error } = await supabase.from("asistencias").upsert(asistencias, { onConflict: "reunion_id,asociado_id" });
  if (error) return { error: "No se pudo guardar la asistencia." };
  await supabase.from("multas").delete().eq("reunion_id", reunionId).eq("pagada", false);
  if (nuevasMultas.length) {
    await supabase.from("multas").upsert(nuevasMultas, { onConflict: "reunion_id,asociado_id", ignoreDuplicates: true });
  }
  revalidatePath("/admin/asistencia");
  revalidatePath("/admin/multas");
  return { ok: true };
}

export async function marcarMultaPagada(formData: FormData) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  await supabase
    .from("multas")
    .update(
      formData.get("pagada") === "si" ? { pagada: true, pagada_en: hoyColombia() } : { pagada: false, pagada_en: null },
    )
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/multas");
}

// Resultado de los juegos de una reunión: la mitad del recaudo va a premios y la otra mitad a utilidad.
export async function guardarJuegos(formData: FormData) {
  await requerirAdmin();
  const reunionId = String(formData.get("reunion_id"));
  const recaudo = montoDe(formData.get("recaudo"));
  const supabase = await crearClienteServidor();
  await supabase.from("juegos").delete().eq("reunion_id", reunionId);
  await supabase.from("juegos").insert({
    reunion_id: reunionId,
    recaudo,
    premios: Math.floor(recaudo / 2),
    utilidad: recaudo - Math.floor(recaudo / 2),
  });
  revalidatePath("/admin/asistencia");
}

// Un administrador sube por el deudor el comprobante de un pago de préstamo (queda "por revisar").
export async function subirPagoPrestamoAdmin(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await requerirAdmin();
  const prestamoId = String(formData.get("prestamo_id") ?? "");
  const interes = montoDe(formData.get("interes"));
  const mora = montoDe(formData.get("mora"));
  const capital = montoDe(formData.get("capital"));
  const archivo = formData.get("archivo");

  if (interes + mora + capital <= 0) return { error: "Escribe cuánto se pagó (interés, mora o abono a capital)." };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Adjunta la captura del pago." };
  if (!archivo.type.startsWith("image/")) return { error: "El archivo debe ser una imagen." };
  if (archivo.size > 8 * 1024 * 1024) return { error: "La imagen pesa más de 8 MB." };

  const db = clienteAdmin();
  const [{ data: prestamo }, { data: movs }] = await Promise.all([
    db.from("prestamos").select("id, asociado_id, estado, cobrar_4x1000").eq("id", prestamoId).maybeSingle(),
    db.from("movimientos_prestamo").select("tipo, monto, fecha").eq("prestamo_id", prestamoId),
  ]);
  if (!prestamo || prestamo.estado !== "vigente") return { error: "Ese préstamo no está vigente." };
  const gmf = Math.min(interes, gmfPorPagar(prestamo.cobrar_4x1000, movs ?? []));
  const saldo = (movs ?? []).reduce(
    (s, m) => s + (m.tipo === "desembolso" ? Number(m.monto) : m.tipo === "abono_capital" ? -Number(m.monto) : 0),
    0,
  );
  if (capital > saldo) return { error: "El abono a capital supera el saldo del préstamo." };

  const ruta = `${prestamo.asociado_id}/prestamo-${prestamoId}-${Date.now()}.jpg`;
  const { error: errorSubida } = await db.storage.from("comprobantes-pago").upload(ruta, archivo);
  if (errorSubida) return { error: "No se pudo subir la imagen." };

  const { error } = await db.from("pagos_prestamo").insert({
    prestamo_id: prestamoId,
    asociado_id: prestamo.asociado_id,
    monto_interes: interes - gmf,
    monto_4x1000: gmf,
    monto_mora: mora,
    monto_capital: capital,
    ruta_archivo: ruta,
    subido_por: admin.id,
  });
  if (error) {
    await db.storage.from("comprobantes-pago").remove([ruta]);
    return { error: "No se pudo registrar el pago." };
  }
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/prestamos");
  return { ok: true };
}

// Marca que el usuario ya vio el tutorial de su panel (si la columna aún no existe, no pasa nada).
export async function marcarTutorialVisto(panel: "asociado" | "admin") {
  const perfil = await requerirPerfil();
  if (panel === "admin" && perfil.rol === "asociado") return;
  await clienteAdmin()
    .from("perfiles")
    .update(panel === "admin" ? { tutorial_admin: true } : { tutorial_asociado: true })
    .eq("id", perfil.id);
}

// ───────── Notificaciones push ─────────
export async function guardarSuscripcionPush(sub: { endpoint: string; p256dh: string; auth: string }): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  if (!sub.endpoint.startsWith("https://") || !sub.p256dh || !sub.auth) return { error: "Suscripción no válida." };
  const { error } = await clienteAdmin()
    .from("push_suscripciones")
    .upsert({ asociado_id: perfil.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { onConflict: "endpoint" });
  if (error) return { error: "No se pudo activar las notificaciones." };
  return { ok: true };
}

export async function quitarSuscripcionPush(endpoint: string) {
  const perfil = await requerirPerfil();
  await clienteAdmin().from("push_suscripciones").delete().eq("endpoint", endpoint).eq("asociado_id", perfil.id);
}

// ───────── Foto de perfil y Recuerdos ─────────
// La foto ya la subió el navegador (comprimida) a «fotos-perfil/<id>/…»; aquí solo se guarda la ruta.
export async function guardarFotoPerfil(ruta: string): Promise<EstadoForm> {
  const perfil = await requerirSesionPerfil();
  if (!ruta.startsWith(`${perfil.id}/`) || ruta.includes("..")) return { error: "Foto no válida." };
  const db = clienteAdmin();
  const { data: previo } = await db.from("perfiles").select("foto_ruta").eq("id", perfil.id).maybeSingle();
  const { error } = await db.from("perfiles").update({ foto_ruta: ruta }).eq("id", perfil.id);
  if (error) return { error: "No se pudo guardar la foto." };
  if (previo?.foto_ruta && previo.foto_ruta !== ruta) await db.storage.from("fotos-perfil").remove([previo.foto_ruta]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function quitarFotoPerfil(): Promise<EstadoForm> {
  const perfil = await requerirSesionPerfil();
  const db = clienteAdmin();
  const { data: previo } = await db.from("perfiles").select("foto_ruta").eq("id", perfil.id).maybeSingle();
  await db.from("perfiles").update({ foto_ruta: null }).eq("id", perfil.id);
  if (previo?.foto_ruta) await db.storage.from("fotos-perfil").remove([previo.foto_ruta]);
  revalidatePath("/", "layout");
  return { ok: true };
}

// Registra las fotos de recuerdo que el navegador ya subió (comprimidas) a «recuerdos/<id>/<reunión>/…». Máximo 5 por persona.
export async function registrarRecuerdos(reunionId: string, fotos: { ruta: string; mini: string }[]): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  const prefijo = `${perfil.id}/${reunionId}/`;
  const db = clienteAdmin();
  const limpiar = () => db.storage.from("recuerdos").remove(fotos.flatMap((f) => [f.ruta, f.mini]));

  if (fotos.length === 0 || fotos.some((f) => !f.ruta.startsWith(prefijo) || !f.mini.startsWith(prefijo) || f.ruta.includes(".."))) {
    await limpiar();
    return { error: "Fotos no válidas." };
  }
  const supabase = await crearClienteServidor();
  const [{ data: reunion }, { count }] = await Promise.all([
    supabase.from("reuniones").select("fecha").eq("id", reunionId).maybeSingle(),
    supabase.from("recuerdos").select("id", { count: "exact", head: true }).eq("reunion_id", reunionId).eq("asociado_id", perfil.id),
  ]);
  if (!reunion || reunion.fecha > hoyColombia()) {
    await limpiar();
    return { error: "Esa reunión todavía no ha llegado." };
  }
  if ((count ?? 0) + fotos.length > 5) {
    await limpiar();
    return { error: "Puedes subir máximo 5 fotos por reunión." };
  }
  const { error } = await supabase
    .from("recuerdos")
    .insert(fotos.map((f) => ({ reunion_id: reunionId, asociado_id: perfil.id, ruta: f.ruta, ruta_mini: f.mini })));
  if (error) {
    await limpiar();
    return { error: "No se pudieron guardar las fotos." };
  }
  revalidatePath("/recuerdos", "layout");
  return { ok: true };
}

export async function eliminarRecuerdo(id: string): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  const db = clienteAdmin();
  const { data: r } = await db.from("recuerdos").select("asociado_id, ruta, ruta_mini").eq("id", id).maybeSingle();
  if (!r) return { ok: true };
  if (r.asociado_id !== perfil.id && perfil.rol === "asociado") return { error: "Solo puedes borrar tus fotos." };
  await db.from("recuerdos").delete().eq("id", id);
  await db.storage.from("recuerdos").remove([r.ruta, r.ruta_mini]);
  revalidatePath("/recuerdos", "layout");
  return { ok: true };
}

// Marca como leídos todos los avisos de la bandeja del usuario.
export async function marcarAvisosLeidos() {
  const perfil = await requerirPerfil();
  const supabase = await crearClienteServidor();
  await supabase.from("avisos").update({ leido: true }).eq("asociado_id", perfil.id).eq("leido", false);
  revalidatePath("/", "layout");
}
