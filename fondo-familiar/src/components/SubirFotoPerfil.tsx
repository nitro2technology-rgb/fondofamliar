"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import { comprimirCuadrada } from "@/lib/comprimir";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { guardarFotoPerfil, quitarFotoPerfil } from "@/lib/acciones";

// Foto de perfil: se recorta en cuadrado, se comprime en el navegador y se sube directo al almacenamiento.
export default function SubirFotoPerfil({
  nombre,
  actual,
  tamano = 112,
  alCambiar,
}: {
  nombre: string;
  actual: string | null;
  tamano?: number;
  alCambiar?: (tieneFoto: boolean) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(actual);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function elegida(archivo: File | undefined) {
    if (!archivo) return;
    setError("");
    if (!archivo.type.startsWith("image/")) return setError("Elige una imagen.");
    setOcupado(true);
    try {
      const cliente = crearClienteNavegador();
      const { data } = await cliente.auth.getUser();
      if (!data.user) throw new Error("sin sesión");
      const imagen = await comprimirCuadrada(archivo);
      const ruta = `${data.user.id}/${Date.now()}.jpg`;
      const { error: errSubida } = await cliente.storage.from("fotos-perfil").upload(ruta, imagen, { contentType: "image/jpeg" });
      if (errSubida) throw errSubida;
      const r = await guardarFotoPerfil(ruta);
      if (r.error) throw new Error(r.error);
      setFoto(URL.createObjectURL(imagen));
      alCambiar?.(true);
    } catch {
      setError("No se pudo subir la foto. Intenta con otra.");
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function quitar() {
    setOcupado(true);
    await quitarFotoPerfil();
    setFoto(null);
    alCambiar?.(false);
    setOcupado(false);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar nombre={nombre} size={tamano} foto={foto} />
      <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => elegida(e.target.files?.[0])} />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => entrada.current?.click()}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          <Camera size={16} />
          {ocupado ? "Subiendo…" : foto ? "Cambiar foto" : "Elegir foto"}
        </button>
        {foto && (
          <button
            type="button"
            disabled={ocupado}
            onClick={quitar}
            aria-label="Quitar foto"
            className="flex size-10 items-center justify-center rounded-full bg-background text-muted disabled:opacity-60"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
