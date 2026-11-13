"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { crearClienteNavegador } from "@/lib/supabase/client";

const LLAVE = "fondo_ultimo_usuario";
type Recordado = { correo: string; nombre: string };

const sinSuscripcion = () => () => {};
function leerCrudo(): string | null {
  try {
    return localStorage.getItem(LLAVE);
  } catch {
    return null;
  }
}

export default function FormularioLogin() {
  const router = useRouter();
  const [escrito, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [olvidado, setOlvidado] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Recuerda a la última persona que entró en este dispositivo (solo su correo y nombre, nunca la contraseña).
  const crudo = useSyncExternalStore(sinSuscripcion, leerCrudo, () => null);
  const recordado = useMemo<Recordado | null>(() => {
    if (olvidado || !crudo) return null;
    try {
      const v = JSON.parse(crudo);
      return v && typeof v.correo === "string" && typeof v.nombre === "string" ? v : null;
    } catch {
      return null;
    }
  }, [crudo, olvidado]);
  const correo = recordado ? recordado.correo : escrito;

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);

    const cliente = crearClienteNavegador();
    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    try {
      const { data: perfil } = await cliente.from("perfiles").select("nombre").eq("id", data.user.id).maybeSingle();
      localStorage.setItem(LLAVE, JSON.stringify({ correo: correo.trim(), nombre: perfil?.nombre ?? recordado?.nombre ?? correo.trim() }));
    } catch {
      /* sin almacenamiento: simplemente no se recuerda */
    }
    router.replace("/elegir-panel");
    router.refresh();
  }

  function otraCuenta() {
    try {
      localStorage.removeItem(LLAVE);
    } catch {
      /* nada */
    }
    setOlvidado(true);
    setCorreo("");
    setClave("");
    setError("");
  }

  const campo =
    "w-full rounded-2xl border border-card-border bg-card px-4 py-4 outline-none focus:border-accent";

  return (
    <form onSubmit={ingresar} className="space-y-3">
      {recordado ? (
        <>
          <div className="flex flex-col items-center gap-2 pb-2 text-center">
            <Avatar nombre={recordado.nombre} size={72} />
            <p className="text-xl font-bold">Hola de nuevo, {recordado.nombre.split(" ")[0]}</p>
            <p className="text-sm text-muted">{recordado.correo}</p>
          </div>
          <input type="hidden" name="email" autoComplete="username" value={correo} readOnly />
        </>
      ) : (
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          placeholder="Correo electrónico"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className={campo}
        />
      )}
      <input
        type="password"
        name="password"
        required
        autoFocus={!!recordado}
        autoComplete="current-password"
        placeholder="Contraseña"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
        className={campo}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={cargando}
        className="w-full rounded-full bg-accent py-4 font-semibold text-accent-fg disabled:opacity-60"
      >
        {cargando ? "Ingresando…" : recordado ? `Entrar como ${recordado.nombre.split(" ")[0]}` : "Ingresar"}
      </button>
      {recordado && (
        <button type="button" onClick={otraCuenta} className="w-full text-center text-sm text-muted underline">
          No soy yo / usar otra cuenta
        </button>
      )}
    </form>
  );
}
