"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { requerirAdmin } from "@/lib/auth";

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
