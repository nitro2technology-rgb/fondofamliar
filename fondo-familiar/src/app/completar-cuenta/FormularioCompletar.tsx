"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, Bell, Camera, Landmark, Lock, Mail } from "lucide-react";
import ActivarNotificaciones from "@/components/ActivarNotificaciones";
import SubirFotoPerfil from "@/components/SubirFotoPerfil";
import { completarCuenta, type EstadoForm } from "@/lib/acciones";

const campo = "w-full rounded-2xl border border-card-border bg-card px-4 py-4 outline-none focus:border-accent";
const BANCOS = ["Nu", "Nequi", "Daviplata", "Bancolombia", "Davivienda", "Otro"];

// Primer ingreso en cuatro pasos: 1) correo y contraseña propia; 2) dónde quieres recibir tus pagos; 3) notificaciones; 4) foto de perfil (opcional).
// Todos los campos quedan montados (solo se ocultan) para que el envío incluya los de ambos pasos.
export default function FormularioCompletar({ nombre }: { nombre: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(completarCuenta, {});
  const [paso, setPaso] = useState(1);
  const [aviso, setAviso] = useState("");
  const [banco, setBanco] = useState("Nu");
  const [numero, setNumero] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [conFoto, setConFoto] = useState(false);

  function continuar() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return setAviso("Escribe un correo válido.");
    if (clave.length < 8) return setAviso("La contraseña debe tener al menos 8 caracteres.");
    if (clave !== confirmar) return setAviso("Las contraseñas no coinciden.");
    setAviso("");
    setPaso(2);
  }

  const cuenta = `${banco} · ${numero.trim()}`;

  return (
    <form action={accion} className="space-y-4">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= paso ? "bg-accent" : "bg-card-border"}`} />
        ))}
        <span className="ml-1 text-xs text-muted">Paso {paso} de 4</span>
      </div>

      <div className={paso === 1 ? "space-y-3" : "hidden"}>
        <p className="flex items-center gap-2 font-semibold">
          <Mail size={18} className="text-accent" /> Tu correo y tu contraseña
        </p>
        <input name="correo" type="email" required autoComplete="email" placeholder="Correo electrónico" className={campo} value={correo} onChange={(e) => setCorreo(e.target.value)} />
        <div className="relative">
          <Lock size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
          <input name="clave" type="password" required minLength={8} autoComplete="new-password" placeholder="Nueva contraseña (mín. 8)" className={campo} value={clave} onChange={(e) => setClave(e.target.value)} />
        </div>
        <input name="confirmar" type="password" required minLength={8} autoComplete="new-password" placeholder="Repite la contraseña" className={campo} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
        <p className="px-1 text-xs text-muted">Con este correo y esta contraseña entrarás de ahora en adelante. También te llegarán los recordatorios.</p>
        <button type="button" onClick={continuar} className="w-full rounded-2xl bg-accent py-4 font-semibold text-accent-fg">
          Continuar
        </button>
      </div>

      <div className={paso === 2 ? "space-y-3" : "hidden"}>
        <p className="flex items-center gap-2 font-semibold">
          <Landmark size={18} className="text-accent" /> ¿Dónde quieres recibir tus pagos?
        </p>
        <p className="text-sm text-muted">
          Cuando te toque la cadena, los demás te consignarán aquí ({`$720.000`}). La verán solo quienes deban pagarte.
        </p>
        <div className="flex flex-wrap gap-2">
          {BANCOS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBanco(b)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${banco === b ? "bg-accent text-accent-fg" : "bg-card"}`}
            >
              {b}
            </button>
          ))}
        </div>
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder={banco === "Otro" ? "Banco y número de cuenta" : "Número de cuenta, celular o llave"}
          className={campo}
        />
        <input type="hidden" name="cuenta_pago" value={cuenta} />
        <p className="px-1 text-xs text-muted">Ej: 3001234567 o tu llave Bre-B. Podrás cambiarla después en tu Perfil.</p>
        {aviso && <p className="text-sm text-danger">{aviso}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setPaso(1)} aria-label="Volver" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card">
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            disabled={numero.trim().length < 3}
            onClick={() => setPaso(3)}
            className="flex-1 rounded-2xl bg-accent py-4 font-semibold text-accent-fg disabled:opacity-60"
          >
            Continuar
          </button>
        </div>
      </div>

      <div className={paso === 3 ? "space-y-4" : "hidden"}>
        <p className="flex items-center gap-2 font-semibold">
          <Bell size={18} className="text-accent" /> Activa las notificaciones
        </p>
        <p className="text-sm text-muted">Así te avisamos cuándo te toca pagar, lo de tu préstamo y las reuniones. Toca «Activar» y acepta el permiso.</p>
        <ActivarNotificaciones />
        <div className="flex gap-2">
          <button type="button" onClick={() => setPaso(2)} aria-label="Volver" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card">
            <ArrowLeft size={20} />
          </button>
          <button type="button" onClick={() => setPaso(4)} className="flex-1 rounded-2xl bg-accent py-4 font-semibold text-accent-fg">
            Continuar
          </button>
        </div>
      </div>

      <div className={paso === 4 ? "space-y-4" : "hidden"}>
        <p className="flex items-center gap-2 font-semibold">
          <Camera size={18} className="text-accent" /> Tu foto de perfil
        </p>
        <p className="text-sm text-muted">Así te verán los demás asociados. Es opcional: puedes agregarla o cambiarla después en tu Perfil.</p>
        <SubirFotoPerfil nombre={nombre} actual={null} tamano={132} alCambiar={setConFoto} />
        {estado.error && <p className="text-sm text-danger">{estado.error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setPaso(3)} aria-label="Volver" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card">
            <ArrowLeft size={20} />
          </button>
          <button disabled={pendiente} className="flex-1 rounded-2xl bg-accent py-4 font-semibold text-accent-fg disabled:opacity-60">
            {pendiente ? "Guardando…" : conFoto ? "Guardar y entrar" : "Omitir y entrar"}
          </button>
        </div>
      </div>

      {paso === 1 && aviso && <p className="text-sm text-danger">{aviso}</p>}
    </form>
  );
}
