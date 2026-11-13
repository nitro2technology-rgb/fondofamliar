import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { carteraVigente } from "@/lib/cartera";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";
import RevisionPago from "./RevisionPago";
import CopiarPendientes from "./CopiarPendientes";
import SubirComprobanteAdmin from "./SubirComprobanteAdmin";
import RevisionPagoPrestamo from "./RevisionPagoPrestamo";
import SelectorPeriodo from "./SelectorPeriodo";
import AccionesCuota from "./AccionesCuota";
import SubirPagoPrestamoAdmin from "./SubirPagoPrestamoAdmin";
import PagoGrupal from "./PagoGrupal";
import MultaEnPago from "./MultaEnPago";
import AvatarSocio from "@/components/AvatarSocio";

type Filtro = "deben" | "pagaron" | "todos";

export default function PagosReportados({ searchParams }: PageProps<"/admin/pagos">) {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

function Pildoras({ opciones, actual }: { opciones: { href: string; texto: string; clave: string }[]; actual: string }) {
  return (
    <div className="flex gap-1 rounded-full bg-card p-1">
      {opciones.map((o) => (
        <Link
          key={o.clave}
          href={o.href}
          className={`flex-1 rounded-full px-3 py-2 text-center text-sm font-semibold ${
            o.clave === actual ? "bg-accent text-accent-fg" : "text-muted"
          }`}
        >
          {o.texto}
        </Link>
      ))}
    </div>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/pagos">["searchParams"] }) {
  await requerirAdmin();
  const params = await searchParams;
  const tipo = String(params.tipo ?? "cuota") === "prestamo" ? "prestamo" : "cuota";
  const pedidoFiltro = String(params.filtro ?? "deben");
  const filtro: Filtro = pedidoFiltro === "pagaron" || pedidoFiltro === "todos" ? pedidoFiltro : "deben";

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-6">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Resumen
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>

      <Pildoras
        actual={tipo}
        opciones={[
          { clave: "cuota", texto: "Cuota", href: "/admin/pagos?tipo=cuota" },
          { clave: "prestamo", texto: "Préstamos", href: "/admin/pagos?tipo=prestamo" },
        ]}
      />

      {tipo === "cuota" ? (
        <VistaCuota periodoPedido={String(params.periodo ?? "")} filtro={filtro} />
      ) : (
        <VistaPrestamos filtro={filtro} />
      )}
    </main>
  );
}

function Resumen({ pagaron, total, etiqueta, notas }: { pagaron: number; total: number; etiqueta: string; notas: string }) {
  const pct = total ? Math.round((pagaron / total) * 100) : 0;
  return (
    <section className="rounded-[28px] bg-card p-5">
      <p className="text-sm text-muted">{etiqueta}</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight">
        {pagaron}/{total} <span className="text-base font-medium text-muted">han pagado</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-border">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs text-muted">{notas}</p>
    </section>
  );
}

async function VistaCuota({ periodoPedido, filtro }: { periodoPedido: string; filtro: Filtro }) {
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const { data: turnos } = await supabase.from("cadena_turnos").select("turno, fecha_reunion, nombre_listado").order("turno");
  const meses = turnos ?? [];
  const elegido =
    meses.find((t) => t.fecha_reunion.slice(0, 7) === periodoPedido.slice(0, 7)) ??
    meses.find((t) => t.fecha_reunion >= hoy) ??
    meses[0];
  const periodo = elegido ? `${elegido.fecha_reunion.slice(0, 7)}-01` : null;
  if (!elegido || !periodo) return <p className="text-muted">No hay meses configurados.</p>;

  const { data: cuotas } = await supabase
    .from("cuotas")
    .select("id, asociado_id, ahorro, cadena, juegos, estado, perfiles!cuotas_asociado_id_fkey(nombre)")
    .eq("periodo", periodo);
  const ids = (cuotas ?? []).map((c) => c.id);
  const { data: reportes } = ids.length
    ? await supabase
        .from("pagos_reportados")
        .select("id, cuota_id, tipo, estado, nota, monto, ruta_archivo, revisado_por, asociado_id, subido_por, descripcion, recolector_id")
        .in("cuota_id", ids)
    : { data: [] };

  const revisores = [...new Set((reportes ?? []).flatMap((r) => [r.revisado_por, r.subido_por, r.recolector_id]).filter(Boolean))] as string[];
  const { data: personas } = revisores.length ? await supabase.from("perfiles").select("id, nombre").in("id", revisores) : { data: [] };
  const confirmadoPor = (r: { estado: string; revisado_por: string | null }) =>
    r.estado === "aprobado" ? ((personas ?? []).find((p) => p.id === r.revisado_por)?.nombre ?? null) : null;
  const cargadoPor = (r: { subido_por: string | null; asociado_id: string }) =>
    r.subido_por && r.subido_por !== r.asociado_id ? ((personas ?? []).find((p) => p.id === r.subido_por)?.nombre ?? "un administrador") : null;

  const recolectorDe = (r: { recolector_id: string | null }) =>
    r.recolector_id ? ((personas ?? []).find((p) => p.id === r.recolector_id)?.nombre ?? null) : null;

  // Multas pendientes: el directivo verifica en el comprobante si venían incluidas en el pago.
  const { data: multasPend } = await supabase
    .from("multas")
    .select("id, asociado_id, motivo, monto")
    .eq("pagada", false);
  const multasDe = (asociadoId: string) => (multasPend ?? []).filter((m) => m.asociado_id === asociadoId);
  const { data: activos } = await supabase.from("perfiles").select("id, nombre").eq("activo", true).order("nombre");

  const rutas = (reportes ?? []).map((r) => r.ruta_archivo);
  const { data: firmadas } = rutas.length ? await supabase.storage.from("comprobantes-pago").createSignedUrls(rutas, 3600) : { data: [] };
  const urlDe = (ruta: string) => firmadas?.find((f) => f.path === ruta)?.signedUrl ?? null;

  const filas = (cuotas ?? [])
    .map((c) => {
      const mios = (reportes ?? []).filter((r) => r.cuota_id === c.id);
      const repFondo = mios.find((r) => r.tipo === "fondo");
      const repCadena = mios.find((r) => r.tipo === "cadena");
      return {
        id: c.id,
        asociadoId: c.asociado_id as string,
        nombre: (c.perfiles as unknown as { nombre: string } | null)?.nombre ?? "",
        pagada: c.estado === "pagada",
        cadena: Number(c.cadena),
        repFondo,
        repCadena,
        porRevisar: [repFondo, repCadena].filter((r) => r?.estado === "pendiente").length,
      };
    })
    .sort((a, b) => b.porRevisar - a.porRevisar || a.nombre.localeCompare(b.nombre));

  const deben = filas.filter((f) => !f.pagada);
  const pagaron = filas.filter((f) => f.pagada);
  const porRevisar = filas.reduce((s, f) => s + f.porRevisar, 0);
  const sinEnviar = deben.filter((f) => !f.repFondo && !f.repCadena).length;
  const visibles = filtro === "deben" ? deben : filtro === "pagaron" ? pagaron : [...deben, ...pagaron];

  const falta = (rep: { estado: string } | undefined) => !rep || rep.estado === "rechazado";
  const lineas = deben
    .map((f) => {
      const partes = [falta(f.repFondo) && "fondo", f.cadena > 0 && falta(f.repCadena) && "cadena"].filter(Boolean);
      return partes.length ? `• ${f.nombre}: falta ${partes.join(" y ")}` : null;
    })
    .filter(Boolean);
  const textoPendientes = [
    `Pagos pendientes de ${mesLargo(elegido.fecha_reunion)}. Súbelos en fondofamiliar.nitro2tech.com`,
    `La cadena de este mes es para ${elegido.nombre_listado}.`,
    ...(lineas.length ? lineas : ["¡Todos al día!"]),
  ].join("\n");

  const href = (f: Filtro) => `/admin/pagos?tipo=cuota&periodo=${periodo.slice(0, 7)}&filtro=${f}`;

  const lineaPago = (rep: NonNullable<(typeof filas)[number]["repFondo"]>, titulo: string) => (
    <RevisionPago
      key={`${rep.id}-${rep.estado}`}
      id={rep.id}
      titulo={titulo}
      monto={pesos(Number(rep.monto))}
      estadoInicial={rep.estado}
      notaInicial={rep.nota}
      confirmadoPor={confirmadoPor(rep)}
      cargadoPor={cargadoPor(rep)}
      descripcion={rep.descripcion}
      recolector={recolectorDe(rep)}
      url={urlDe(rep.ruta_archivo)}
    />
  );

  return (
    <>
      <SelectorPeriodo
        actual={periodo.slice(0, 7)}
        filtro={filtro}
        opciones={meses.map((t) => ({ valor: t.fecha_reunion.slice(0, 7), texto: mesLargo(t.fecha_reunion) }))}
      />

      <Resumen
        pagaron={pagaron.length}
        total={filas.length}
        etiqueta={`${mesLargo(elegido.fecha_reunion)} · cadena de ${elegido.nombre_listado}`}
        notas={`${porRevisar} por revisar · ${sinEnviar} sin enviar nada · reunión ${fechaCorta(elegido.fecha_reunion)}`}
      />

      <Pildoras
        actual={filtro}
        opciones={[
          { clave: "deben", texto: `Deben (${deben.length})`, href: href("deben") },
          { clave: "pagaron", texto: `Pagaron (${pagaron.length})`, href: href("pagaron") },
          { clave: "todos", texto: "Todos", href: href("todos") },
        ]}
      />

      {filtro !== "pagaron" && <CopiarPendientes texto={textoPendientes} />}

      <PagoGrupal
        periodo={periodo}
        deben={deben.map((f) => ({ id: f.asociadoId, nombre: f.nombre }))}
        personas={(activos ?? []).map((p) => ({ id: p.id, nombre: p.nombre }))}
      />

      {visibles.length === 0 && <p className="py-4 text-center text-muted">{filtro === "deben" ? "¡Nadie debe este mes!" : "Nadie en esta lista."}</p>}

      <div className="space-y-3">
        {visibles.map((f) => {
          const hayEnviados = Boolean(f.repFondo || f.repCadena);
          return (
            <div key={f.id} className="space-y-3 rounded-[28px] bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/admin/socio/${f.asociadoId}`} className="flex min-w-0 items-center gap-3">
                  <AvatarSocio nombre={f.nombre} size={40} />
                  <span className="truncate font-semibold">{f.nombre}</span>
                </Link>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    f.pagada ? "bg-accent-soft text-accent" : f.porRevisar > 0 ? "bg-amber/15 text-amber" : "bg-danger/15 text-danger"
                  }`}
                >
                  {f.pagada ? "Pagada" : f.porRevisar > 0 ? `${f.porRevisar} por revisar` : hayEnviados ? "Incompleta" : "Sin enviar"}
                </span>
              </div>

              {multasDe(f.asociadoId).map((m) => (
                <MultaEnPago key={m.id} id={m.id} motivo={m.motivo} monto={pesos(Number(m.monto))} />
              ))}

              {f.pagada ? (
                <div className="space-y-2">
                  {f.repFondo && lineaPago(f.repFondo, "Fondo")}
                  {f.repCadena && lineaPago(f.repCadena, "Cadena")}
                  {!f.repFondo && !f.repCadena && <p className="text-xs text-muted">Pagada sin comprobantes (carga inicial).</p>}
                </div>
              ) : (
                <AccionesCuota
                  puedeFondo={!f.repFondo || f.repFondo.estado === "rechazado"}
                  puedeCadena={!f.repCadena || f.repCadena.estado === "rechazado"}
                  subirFondo={<SubirComprobanteAdmin cuotaId={f.id} tipo="fondo" titulo="fondo" directo />}
                  subirCadena={f.cadena > 0 ? <SubirComprobanteAdmin cuotaId={f.id} tipo="cadena" titulo="cadena" directo /> : null}
                  verificar={
                    <>
                      {f.repFondo && lineaPago(f.repFondo, "Fondo")}
                      {f.repCadena && lineaPago(f.repCadena, "Cadena")}
                    </>
                  }
                  porRevisar={f.porRevisar}
                  hayEnviados={hayEnviados}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

async function VistaPrestamos({ filtro }: { filtro: Filtro }) {
  const supabase = await crearClienteServidor();
  const cartera = (await carteraVigente(hoyColombia()))
    .filter((c) => c.cuentas.saldoCapital > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const { data: pp } = await supabase
    .from("pagos_prestamo")
    .select("id, monto_interes, monto_4x1000, monto_mora, monto_capital, estado, nota, creado_en, ruta_archivo, perfiles!pagos_prestamo_asociado_id_fkey(nombre)")
    .order("creado_en", { ascending: false })
    .limit(40);
  const porRevisar = (pp ?? []).filter((x) => x.estado === "pendiente");
  const recientes = (pp ?? []).filter((x) => x.estado !== "pendiente").slice(0, 10);

  const rutas = [...porRevisar, ...recientes].map((x) => x.ruta_archivo);
  const { data: firmadas } = rutas.length ? await supabase.storage.from("comprobantes-pago").createSignedUrls(rutas, 3600) : { data: [] };
  const urlDe = (ruta: string) => firmadas?.find((f) => f.path === ruta)?.signedUrl ?? null;

  const alDia = (c: (typeof cartera)[number]) => c.cuentas.interesPendiente === 0 && c.cuentas.moraPendiente === 0;
  const deben = cartera.filter((c) => !alDia(c));
  const pagaron = cartera.filter(alDia);
  const visibles = filtro === "deben" ? deben : filtro === "pagaron" ? pagaron : [...deben, ...pagaron];
  const href = (f: Filtro) => `/admin/pagos?tipo=prestamo&filtro=${f}`;

  const tarjeta = (x: NonNullable<typeof pp>[number]) => {
    const partes = [
      Number(x.monto_interes) > 0 && `interés ${pesos(Number(x.monto_interes))}`,
      Number(x.monto_4x1000) > 0 && `4x1000 ${pesos(Number(x.monto_4x1000))}`,
      Number(x.monto_mora) > 0 && `mora ${pesos(Number(x.monto_mora))}`,
      Number(x.monto_capital) > 0 && `capital ${pesos(Number(x.monto_capital))}`,
    ].filter(Boolean);
    return (
      <RevisionPagoPrestamo
        key={`${x.id}-${x.estado}`}
        id={x.id}
        asociado={(x.perfiles as unknown as { nombre: string } | null)?.nombre ?? ""}
        detalle={partes.join(" · ")}
        total={pesos(Number(x.monto_interes) + Number(x.monto_4x1000) + Number(x.monto_mora) + Number(x.monto_capital))}
        fecha={fechaCorta(x.creado_en.slice(0, 10))}
        estadoInicial={x.estado as "pendiente" | "aprobado" | "rechazado"}
        notaInicial={x.nota}
        url={urlDe(x.ruta_archivo)}
      />
    );
  };

  return (
    <>
      <Resumen
        pagaron={pagaron.length}
        total={cartera.length}
        etiqueta="Préstamos al día con sus intereses"
        notas={`${porRevisar.length} pago${porRevisar.length === 1 ? "" : "s"} por revisar · ${deben.length} con interés o mora pendiente`}
      />

      {porRevisar.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-lg font-semibold">Por revisar</h2>
          {porRevisar.map(tarjeta)}
        </section>
      )}

      <Pildoras
        actual={filtro}
        opciones={[
          { clave: "deben", texto: `Deben (${deben.length})`, href: href("deben") },
          { clave: "pagaron", texto: `Al día (${pagaron.length})`, href: href("pagaron") },
          { clave: "todos", texto: "Todos", href: href("todos") },
        ]}
      />

      {visibles.length === 0 && <p className="py-4 text-center text-muted">Nadie en esta lista.</p>}
      <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
        {visibles.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2 py-3.5">
            <Link href={`/admin/socio/${c.asociadoId}`} className="flex min-w-0 flex-1 items-center gap-3">
              <AvatarSocio nombre={c.nombre} size={40} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.nombre}</span>
                <span className="block text-xs text-muted">
                  Capital {pesos(c.cuentas.saldoCapital)} · interés {pesos(c.cuentas.interesMensual)}
                </span>
              </span>
            </Link>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                alDia(c) ? "bg-accent-soft text-accent" : c.cuentas.moraPendiente > 0 ? "bg-danger/15 text-danger" : "bg-amber/15 text-amber"
              }`}
            >
              {alDia(c) ? "Al día" : `Debe ${pesos(c.cuentas.interesPendiente + c.cuentas.moraPendiente)}`}
            </span>
            <SubirPagoPrestamoAdmin prestamoId={c.id} interes={c.cuentas.interesPendiente} mora={c.cuentas.moraPendiente} />
          </div>
        ))}
      </div>

      {recientes.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-lg font-semibold">Revisados recientemente</h2>
          {recientes.map(tarjeta)}
        </section>
      )}
    </>
  );
}
