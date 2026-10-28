"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { requerirAdmin, requerirPerfil } from "@/lib/auth";
import { hoyColombia } from "@/lib/format";

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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: "Escribe un correo válido." };
  if (clave.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (clave !== confirmar) return { error: "Las contraseñas no coinciden." };

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

  await admin.from("perfiles").update({ correo, primer_ingreso_completo: true }).eq("id", user.id);
  await supabase.auth.signInWithPassword({ email: correo, password: clave });
  redirect("/elegir-panel");
}

// ───────── Panel de administración ─────────
export async function actualizarAsociado(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requerirAdmin();

  const id = String(formData.get("id"));
  const celularTexto = String(formData.get("celular") ?? "").trim();
  const celular = celularTexto ? limpiarCelular(celularTexto) : null;
  const ciudad = String(formData.get("ciudad") ?? "").trim() || null;

  if (celular && !CELULAR.test(celular)) return { error: "Celular de 10 dígitos que empiece por 3." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("perfiles").update({ celular, ciudad }).eq("id", id);
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
export async function registrarPagoCuota(formData: FormData) {
  const admin = await requerirAdmin();
  const fecha = String(formData.get("fecha") ?? "") || hoyColombia();
  const supabase = await crearClienteServidor();
  await supabase
    .from("cuotas")
    .update({ estado: "pagada", fecha_pago: fecha, registrado_por: admin.id })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/cuotas");
}

// Corrige un registro equivocado; queda en la auditoría.
export async function deshacerPagoCuota(formData: FormData) {
  const admin = await requerirAdmin();
  const supabase = await crearClienteServidor();
  await supabase
    .from("cuotas")
    .update({ estado: "pendiente", fecha_pago: null, registrado_por: admin.id })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/cuotas");
}

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
  revalidatePath("/admin/capturas");
  return { ok: true };
}

// ───────── Préstamos ─────────
const montoDe = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/\D/g, ""));

export async function solicitarPrestamo(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const perfil = await requerirPerfil();
  const monto = montoDe(formData.get("monto"));
  const externo = String(formData.get("externo") ?? "").trim();
  const hoy = hoyColombia();

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
  revalidatePath("/prestamos");
  revalidatePath("/");
  return { ok: true };
}

export async function votarPrestamo(formData: FormData) {
  const admin = await requerirAdmin();
  const voto = String(formData.get("voto"));
  if (voto !== "aprobar" && voto !== "rechazar") return;
  const supabase = await crearClienteServidor();
  await supabase
    .from("votos_prestamo")
    .insert({ prestamo_id: String(formData.get("id")), admin_id: admin.id, voto });
  revalidatePath("/admin/prestamos");
}

export async function desembolsarPrestamo(formData: FormData) {
  const admin = await requerirAdmin();
  const id = String(formData.get("id"));
  const supabase = await crearClienteServidor();
  const [{ data: prestamo }, { data: caja }] = await Promise.all([
    supabase.from("prestamos").select("monto, estado").eq("id", id).single(),
    supabase.rpc("caja_disponible"),
  ]);
  // La caja ya descuenta los préstamos aprobados, incluido este.
  if (!prestamo || prestamo.estado !== "aprobado" || Number(caja) < 0) return;

  const fecha = hoyColombia();
  const { error } = await supabase
    .from("movimientos_prestamo")
    .insert({ prestamo_id: id, tipo: "desembolso", monto: prestamo.monto, fecha, registrado_por: admin.id });
  if (error) return;
  await supabase.from("prestamos").update({ estado: "vigente", desembolsado_en: fecha }).eq("id", id);
  revalidatePath("/admin/prestamos");
}

export async function registrarMovimientoPrestamo(formData: FormData) {
  const admin = await requerirAdmin();
  const id = String(formData.get("id"));
  const tipo = String(formData.get("tipo"));
  const monto = montoDe(formData.get("monto"));
  if (!["interes", "abono_capital", "interes_mora"].includes(tipo) || monto <= 0) return;

  const supabase = await crearClienteServidor();
  const { data: movs } = await supabase.from("movimientos_prestamo").select("tipo, monto").eq("prestamo_id", id);
  const saldo = (movs ?? []).reduce(
    (s, m) => s + (m.tipo === "desembolso" ? Number(m.monto) : m.tipo === "abono_capital" ? -Number(m.monto) : 0),
    0,
  );
  if (tipo === "abono_capital" && monto > saldo) return;

  const { error } = await supabase
    .from("movimientos_prestamo")
    .insert({ prestamo_id: id, tipo, monto, fecha: hoyColombia(), registrado_por: admin.id });
  if (error) return;
  if (tipo === "abono_capital" && monto === saldo) {
    await supabase.from("prestamos").update({ estado: "pagado" }).eq("id", id);
  }
  revalidatePath("/admin/prestamos");
}

// ───────── Asistencia, multas y juegos ─────────
const ESTADOS_ASISTENCIA = ["puntual", "tarde", "ausente", "justificada"] as const;

// Guarda la asistencia de una reunión y genera las multas que correspondan.
// Retraso: multa de retraso. Ausencia injustificada: multa solo a residentes en Pasto.
export async function guardarAsistencia(formData: FormData) {
  await requerirAdmin();
  const reunionId = String(formData.get("reunion_id"));
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
    const estado = String(formData.get(`estado_${persona.id}`) ?? "");
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

  await supabase.from("asistencias").upsert(asistencias, { onConflict: "reunion_id,asociado_id" });
  await supabase.from("multas").delete().eq("reunion_id", reunionId).eq("pagada", false);
  if (nuevasMultas.length) await supabase.from("multas").insert(nuevasMultas);
  revalidatePath("/admin/asistencia");
  revalidatePath("/admin/multas");
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

// ───────── Cadena ─────────
// Registra que el recaudo de cadena del mes ya se entregó a quien tenía el turno.
export async function registrarEntregaCadena(formData: FormData) {
  const admin = await requerirAdmin();
  const supabase = await crearClienteServidor();
  await supabase.from("entregas_cadena").upsert({
    turno: Number(formData.get("turno")),
    monto: montoDe(formData.get("monto")),
    fecha_entrega: hoyColombia(),
    registrado_por: admin.id,
  });
  revalidatePath("/admin/cadena");
}

export async function deshacerEntregaCadena(formData: FormData) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  await supabase.from("entregas_cadena").delete().eq("turno", Number(formData.get("turno")));
  revalidatePath("/admin/cadena");
}
