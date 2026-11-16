// Crea o elimina el usuario de prueba (asociado activo, sin cuotas ni turno) en la base de Supabase de .env.local.
// Uso (desde fondo-familiar/):  node scripts/usuario-prueba.mjs crear   |   node scripts/usuario-prueba.mjs eliminar
// Al crearlo guarda PRUEBA_TURNO_ID en .env.local y muestra la contraseña generada. Con `npm run dev` ese usuario ve
// Inicio y /recibos como quien tiene el turno del mes (solo lectura; ver esSimulacionTurno en src/lib/recibos.ts).
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const leerEnv = () =>
  Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
const env = leerEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
const CORREO = "prueba@fondofamiliar.nitro2tech.com";

async function buscarId() {
  const r = await fetch(`${url}/rest/v1/perfiles?select=id&correo=eq.${encodeURIComponent(CORREO)}`, { headers: h });
  return (await r.json())[0]?.id ?? null;
}

const accion = process.argv[2];
if (accion === "crear") {
  if (await buscarId()) {
    console.log("El usuario de prueba ya existe.");
    process.exit(0);
  }
  const clave = "Prueba-" + randomBytes(4).toString("hex");
  const r = await fetch(url + "/auth/v1/admin/users", { method: "POST", headers: h, body: JSON.stringify({ email: CORREO, password: clave, email_confirm: true }) });
  const u = await r.json();
  if (!u.id) {
    console.error("ERROR", JSON.stringify(u));
    process.exit(1);
  }
  await new Promise((s) => setTimeout(s, 800)); // el trigger crea el perfil
  await fetch(`${url}/rest/v1/perfiles?id=eq.${u.id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ nombre: "Usuario de Prueba", rol: "asociado", ciudad: "Pasto", activo: true, primer_ingreso_completo: true, cuenta_pago: "Nu · 3000000000" }),
  });
  appendFileSync(".env.local", `\nPRUEBA_TURNO_ID=${u.id}\n`);
  console.log("Creado. Correo:", CORREO, "Clave:", clave, "(reinicia npm run dev)");
} else if (accion === "eliminar") {
  const id = await buscarId();
  if (!id) console.log("No existe el usuario de prueba.");
  else {
    const r = await fetch(`${url}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: h });
    console.log("Eliminado:", r.status);
  }
  const limpio = readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => !l.startsWith("PRUEBA_TURNO_ID=")).join("\n");
  writeFileSync(".env.local", limpio);
} else {
  console.log("Uso: node scripts/usuario-prueba.mjs crear | eliminar");
}
