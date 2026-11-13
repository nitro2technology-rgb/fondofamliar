"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { guardarSuscripcionPush, quitarSuscripcionPush } from "@/lib/acciones";

type Estado = "cargando" | "sin-llave" | "instalar" | "no-soportado" | "bloqueado" | "inactivo" | "activo";

const LLAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function aBytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const esIOS = () =>
  typeof navigator !== "undefined" && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
// ¿Está abierta como app instalada (desde el ícono de inicio)? En iPhone las notificaciones solo funcionan así.
const esInstalada = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

// Activa las notificaciones push del celular. `compacto` = aviso para Inicio (se oculta si ya está activo).
export default function ActivarNotificaciones({ compacto = false }: { compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      if (!LLAVE) {
        setEstado("sin-llave");
        return;
      }
      const soportado = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!soportado) {
        // En iPhone el soporte aparece solo cuando la app está instalada en la pantalla de inicio.
        setEstado(esIOS() && !esInstalada() ? "instalar" : "no-soportado");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (Notification.permission === "denied") setEstado("bloqueado");
        else setEstado(sub && Notification.permission === "granted" ? "activo" : "inactivo");
      } catch {
        setEstado("no-soportado");
      }
    })();
  }, []);

  async function activar() {
    setError("");
    setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(LLAVE) }));
      const j = sub.toJSON();
      const r = await guardarSuscripcionPush({
        endpoint: sub.endpoint,
        p256dh: j.keys?.p256dh ?? "",
        auth: j.keys?.auth ?? "",
      });
      if (r.error) setError(r.error);
      else setEstado("activo");
    } catch {
      setError("No se pudo activar. Intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await quitarSuscripcionPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inactivo");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "cargando") return null;
  if (compacto && estado !== "inactivo" && estado !== "instalar") return null;

  if (estado === "instalar" || estado === "no-soportado" || estado === "sin-llave") {
    return (
      <p className="rounded-[28px] bg-card p-4 text-sm text-muted">
        {estado === "instalar"
          ? "Para recibir notificaciones en iPhone, abre la app desde el ícono de tu pantalla de inicio (Compartir → «Agregar a pantalla de inicio») y actívalas aquí."
          : estado === "sin-llave"
            ? "Las notificaciones todavía no están configuradas en el servidor. Mientras tanto, verás todos tus avisos aquí, en la campana."
            : "Este navegador no permite notificaciones del celular. No te pierdes nada: tus avisos aparecen aquí, en la campana de la app."}
      </p>
    );
  }

  return (
    <section className="flex items-center gap-3 rounded-[28px] bg-card p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        {estado === "activo" ? <Bell size={20} /> : <BellOff size={20} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Notificaciones</p>
        <p className="text-xs text-muted">
          {estado === "activo"
            ? "Activadas: te avisaremos de pagos, préstamos y dinero disponible."
            : estado === "bloqueado"
              ? "Están bloqueadas en tu navegador. Actívalas en los ajustes del sitio."
              : "Recibe avisos de cuándo te toca pagar, tu préstamo y cuando haya dinero disponible."}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      {estado === "inactivo" && (
        <button
          onClick={activar}
          disabled={ocupado}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg disabled:opacity-60"
        >
          {ocupado ? "Activando…" : "Activar"}
        </button>
      )}
      {estado === "activo" && (
        <button
          onClick={desactivar}
          disabled={ocupado}
          className="shrink-0 rounded-full bg-background px-4 py-2 text-xs font-semibold text-muted disabled:opacity-60"
        >
          Desactivar
        </button>
      )}
    </section>
  );
}
