import { Suspense } from "react";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";

export default function Calendario() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <CalendarioContenido />
    </Suspense>
  );
}

async function CalendarioContenido() {
  const perfil = await requerirPerfil();
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const [turnos, cuotas, reuniones] = await Promise.all([
    supabase.from("cadena_turnos").select("asociado_id, nombre_listado, turno, fecha_reunion").order("turno"),
    supabase.from("cuotas").select("periodo, ahorro, cadena, juegos, estado").eq("asociado_id", perfil.id),
    supabase.from("reuniones").select("fecha, hora"),
  ]);

  const horaDe = new Map((reuniones.data ?? []).map((r) => [r.fecha, String(r.hora).slice(0, 5)]));
  const cuotaDe = new Map((cuotas.data ?? []).map((c) => [c.periodo.slice(0, 7), c]));
  const lista = turnos.data ?? [];
  const proxima = lista.find((t) => t.fecha_reunion >= hoy);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>

      {proxima && (
        <div className="rounded-2xl border border-card-border bg-card p-4">
          <p className="text-sm text-muted">Próxima reunión</p>
          <p className="text-xl font-semibold">{fechaCorta(proxima.fecha_reunion)}</p>
          <p className="text-sm text-muted">
            {horaDe.get(proxima.fecha_reunion) ?? "19:30"} · Turno de cadena: {proxima.nombre_listado}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {lista.map((t) => {
          const c = cuotaDe.get(t.fecha_reunion.slice(0, 7));
          const total = c ? Number(c.ahorro) + Number(c.cadena) + Number(c.juegos) : 0;
          const pasada = t.fecha_reunion < hoy;
          const esMiTurno = t.asociado_id === perfil.id;
          const estado = !c
            ? null
            : c.estado === "pagada"
              ? { texto: "Pagada", clase: "text-ok" }
              : pasada
                ? { texto: "En mora", clase: "text-danger" }
                : { texto: "Pendiente", clase: "text-muted" };
          return (
            <li
              key={t.turno}
              className={`rounded-2xl border p-4 ${esMiTurno ? "border-accent" : "border-card-border"} bg-card ${
                pasada && c?.estado === "pagada" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{mesLargo(t.fecha_reunion)}</p>
                <p className="text-sm text-muted">{fechaCorta(t.fecha_reunion)}</p>
              </div>
              <p className="text-sm text-muted">Cadena para {esMiTurno ? "ti 🎉" : t.nombre_listado}</p>
              {estado && (
                <p className="mt-1 text-sm">
                  Tu cuota {pesos(total)} · <span className={estado.clase}>{estado.texto}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
