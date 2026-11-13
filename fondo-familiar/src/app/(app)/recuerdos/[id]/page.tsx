import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { fotosPerfil } from "@/lib/fotos-servidor";
import { fechaCorta, hoyColombia, mesLargo } from "@/lib/format";
import GaleriaRecuerdos, { type FotoRecuerdo } from "@/components/GaleriaRecuerdos";
import SubirRecuerdos from "@/components/SubirRecuerdos";

export default function Reunion({ params }: PageProps<"/recuerdos/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: PageProps<"/recuerdos/[id]">["params"] }) {
  const { id } = await params;
  const perfil = await requerirPerfil();
  const supabase = await crearClienteServidor();

  const { data: reunion } = await supabase.from("reuniones").select("id, fecha").eq("id", id).maybeSingle();
  if (!reunion || reunion.fecha > hoyColombia()) notFound();

  const { data: filas } = await supabase
    .from("recuerdos")
    .select("id, asociado_id, ruta, ruta_mini")
    .eq("reunion_id", id)
    .order("creado_en");
  const lista = filas ?? [];

  const db = clienteAdmin();
  const autores = [...new Set(lista.map((f) => f.asociado_id))];
  const [{ data: nombres }, fotosAutor, firmadas] = await Promise.all([
    autores.length ? db.from("perfiles").select("id, nombre").in("id", autores) : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    fotosPerfil(autores),
    lista.length ? db.storage.from("recuerdos").createSignedUrls(lista.flatMap((f) => [f.ruta, f.ruta_mini]), 3600) : Promise.resolve({ data: [] }),
  ]);
  const nombreDe = new Map((nombres ?? []).map((n) => [n.id, n.nombre]));
  const url = new Map<string, string>();
  for (const d of firmadas.data ?? []) if (d.path && d.signedUrl) url.set(d.path, d.signedUrl);

  const fotos: FotoRecuerdo[] = lista
    .filter((f) => url.has(f.ruta) && url.has(f.ruta_mini))
    .map((f) => ({
      id: f.id,
      url: url.get(f.ruta)!,
      mini: url.get(f.ruta_mini)!,
      nombre: nombreDe.get(f.asociado_id) ?? "Asociado",
      foto: fotosAutor.get(f.asociado_id) ?? null,
      puedeBorrar: f.asociado_id === perfil.id || perfil.rol !== "asociado",
    }));
  const mias = lista.filter((f) => f.asociado_id === perfil.id).length;

  return (
    <div className="space-y-5">
      <Link href="/recuerdos" className="text-sm text-accent">
        ← Recuerdos
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight first-letter:uppercase">{mesLargo(reunion.fecha)}</h1>
        <p className="text-sm text-muted">
          Reunión del {fechaCorta(reunion.fecha)} · {fotos.length} foto{fotos.length === 1 ? "" : "s"}
        </p>
      </div>
      <SubirRecuerdos reunionId={reunion.id} restantes={5 - mias} />
      <GaleriaRecuerdos fotos={fotos} />
    </div>
  );
}
