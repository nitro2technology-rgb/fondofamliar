"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function FormularioLogin() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);

    const { error } = await crearClienteNavegador().auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }
    router.replace("/elegir-panel");
    router.refresh();
  }

  const campo =
    "w-full rounded-2xl border border-card-border bg-card px-4 py-4 outline-none focus:border-accent";

  return (
    <form onSubmit={ingresar} className="space-y-3">
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Correo electrónico"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        className={campo}
      />
      <input
        type="password"
        required
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
        className="w-full rounded-2xl bg-accent py-4 font-semibold text-accent-fg disabled:opacity-60"
      >
        {cargando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
