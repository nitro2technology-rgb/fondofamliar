"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { comprimirImagen } from "@/lib/comprimir";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { registrarRecuerdos } from "@/lib/acciones";

// Sube hasta `restantes` fotos de la reunión. Cada una se comprime en el navegador (foto y miniatura) antes de subirse.
export default function SubirRecuerdos({ reunionId, restantes }: { reunionId: string; restantes: number }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function elegidas(lista: FileList | null) {
    const archivos = Array.from(lista ?? []).filter((f) => f.type.startsWith("image/"));
    if (entrada.current) entrada.current.value = "";
    if (archivos.length === 0) return;
    setError("");
    const usar = archivos.slice(0, restantes);
    if (archivos.length > restantes) setError(`Solo caben ${restantes} foto(s) más; se subirán las primeras ${restantes}.`);

    setOcupado(true);
    const cliente = crearClienteNavegador();
    const subidas: { ruta: string; mini: string }[] = [];
    try {
      const { data } = await cliente.auth.getUser();
      if (!data.user) throw new Error("sin sesión");
      for (let i = 0; i < usar.length; i++) {
        setEstado(`Comprimiendo y subiendo ${i + 1} de ${usar.length}…`);
        const grande = await comprimirImagen(usar[i], 1600, 0.8);
        const mini = await comprimirImagen(usar[i], 480, 0.72);
        const base = `${data.user.id}/${reunionId}/${crypto.randomUUID()}`;
        const ruta = `${base}.jpg`;
        const rutaMini = `${base}-m.jpg`;
        const a = await cliente.storage.from("recuerdos").upload(ruta, grande, { contentType: "image/jpeg" });
        if (a.error) throw a.error;
        const b = await cliente.storage.from("recuerdos").upload(rutaMini, mini, { contentType: "image/jpeg" });
        if (b.error) {
          await cliente.storage.from("recuerdos").remove([ruta]);
          throw b.error;
        }
        subidas.push({ ruta, mini: rutaMini });
      }
      const r = await registrarRecuerdos(reunionId, subidas);
      if (r.error) throw new Error(r.error);
      router.refresh();
    } catch (e) {
      if (subidas.length > 0) await cliente.storage.from("recuerdos").remove(subidas.flatMap((s) => [s.ruta, s.mini]));
      const mensaje = e instanceof Error ? e.message : "";
      setError(/máximo|todavía|no válidas/i.test(mensaje) ? mensaje : "No se pudieron subir las fotos. Intenta de nuevo.");
    } finally {
      setOcupado(false);
      setEstado("");
    }
  }

  if (restantes <= 0) {
    return <p className="rounded-[28px] bg-card p-4 text-sm text-muted">Ya subiste tus 5 fotos de esta reunión. Puedes borrar alguna para subir otra.</p>;
  }

  return (
    <div className="space-y-2 rounded-[28px] bg-card p-4">
      <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => elegidas(e.target.files)} />
      <button
        type="button"
        disabled={ocupado}
        onClick={() => entrada.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 font-semibold text-accent-fg disabled:opacity-60"
      >
        <ImagePlus size={18} />
        {ocupado ? estado || "Subiendo…" : "Subir fotos"}
      </button>
      <p className="text-center text-xs text-muted">Puedes subir {restantes} foto(s) más en esta reunión. Se comprimen solas.</p>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
