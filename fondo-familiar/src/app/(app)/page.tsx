import Avatar from "@/components/Avatar";
import CampanaAvisos from "@/components/CampanaAvisos";
import AvisoFoto from "@/components/AvisoFoto";
import { fotosPerfil } from "@/lib/fotos-servidor";
import Link from "next/link";
import { ArrowRight, CalendarClock, Lock, CalendarDays, FileText, Landmark, PiggyBank, Receipt, Repeat, Upload } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import TarjetaPrestamo from "@/components/TarjetaPrestamo";
import { pesos, fechaCorta, mesLargo } from "@/lib/format";
import { estadoDeCuenta, resumenPrestamo } from "@/lib/cuentas";
import { Suspense } from "react";
import { requerirPerfil } from "@/lib/auth";
import { turnoPorConfirmar } from "@/lib/recibos";
import AvisoConfirmar from "@/components/AvisoConfirmar";
import SolicitudRapida from "@/components/SolicitudRapida";
import Tutorial from "@/components/Tutorial";
import ActivarNotificaciones from "@/components/ActivarNotificaciones";
import { tutorialVisto } from "@/lib/tutorial-visto";
import { crearClienteServidor } from "@/lib/supabase/server";

export default function Inicio() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <InicioContenido />
    </Suspense>
  );
}

async function InicioContenido() {
  const perfil = await requerirPerfil();
  const [cuenta, { prestamo, tope, puedePedir, caja }, turnoCadena, visto, fotos] = await Promise.all([
    estadoDeCuenta(perfil.id),
    resumenPrestamo(perfil.id),
    turnoPorConfirmar(perfil.id),
    tutorialVisto(perfil.id, "asociado"),
    fotosPerfil([perfil.id]),
  ]);
  const foto = fotos.get(perfil.id) ?? null;
  const { data: extra } = await (await crearClienteServidor())
    .from("perfiles")
    .select("cuenta_pago")
    .eq("id", perfil.id)
    .maybeSingle();
  const puedeSolicitar = !prestamo && cuenta.multas.length === 0 && cuenta.cuota?.estado !== "En mora";
  const vigente = prestamo?.estado === "vigente" ? prestamo : null;
  const primera = cuenta.historial.findIndex((c) => !c.pagada);
  const inicio = Math.max(0, (primera === -1 ? cuenta.historial.length : primera) - 1);
  const visibles = cuenta.historial.slice(inicio, inicio + 4);
  const resto = cuenta.historial.filter((c) => !visibles.includes(c));

  return (
    <div className="space-y-6">
      <Tutorial panel="asociado" abrirAlInicio={!visto} />
      {/* Degradado de fondo a todo el ancho */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/70 via-accent/15 to-transparent" />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar nombre={perfil.nombre} size={44} foto={foto} />
          <div>
            <p className="text-xs text-muted">Hola,</p>
            <h1 className="text-lg font-bold leading-tight">{perfil.nombre.split(" ")[0]}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaAvisos />
          <ThemeToggle />
        </div>
      </header>

      {/* Cifra principal */}
      <section className="flex flex-col items-center pb-2 pt-6 text-center">
        <p className="text-sm text-muted">Ahorro acumulado</p>
        <p data-tour="ahorro" className="mt-1 text-6xl font-extrabold tracking-tight">{pesos(cuenta.ahorro)}</p>
        <Link
          href={cuenta.cuota ? "/pagos" : "/calendario"}
          data-tour="cuota"
          className="mt-4 rounded-full bg-accent/20 text-accent px-5 py-2 text-sm font-medium backdrop-blur"
        >
          {cuenta.cuota
            ? `Cuota ${pesos(cuenta.cuota.total)} · ${cuenta.cuota.estado} · vence ${fechaCorta(cuenta.cuota.vence)}`
            : "Cuotas al día"}
        </Link>
      </section>

      {/* Acciones rápidas */}
      <nav data-tour="acciones" className="flex justify-between px-2">
        {[
          { href: "/pagos", label: "Pagar", icon: Upload },
          { href: "/prestamos", label: "Préstamo", icon: Landmark },
          { href: "/calendario", label: "Calendario", icon: CalendarDays },
          { href: "/estado-cuenta", label: "Estado", icon: FileText, descarga: true },
        ].map(({ href, label, icon: Icon, descarga }) => {
          const contenido = (
            <>
              <span className="flex size-14 items-center justify-center rounded-full bg-card text-accent shadow-lg">
                <Icon size={24} />
              </span>
              <span className="mt-2 text-xs font-medium">{label}</span>
            </>
          );
          return descarga ? (
            <a key={href} href={href} className="flex flex-col items-center">
              {contenido}
            </a>
          ) : (
            <Link key={href} href={href} className="flex flex-col items-center">
              {contenido}
            </Link>
          );
        })}
      </nav>

      {cuenta.cuota && (
        <Link
          href="/pagos"
          data-tour="pagar"
          className="flex items-center justify-center gap-2 rounded-full bg-accent py-4 text-center font-semibold text-accent-fg"
        >
          Pagar y subir comprobantes
          <ArrowRight size={20} />
        </Link>
      )}

      {turnoCadena && (
        <Link href="/recibos" className="block rounded-2xl border-2 border-accent bg-accent-soft p-4">
          <p className="font-bold text-accent">Es tu turno: confirma los pagos de los socios</p>
          <p className="text-sm text-muted">
            {turnoCadena.confirmados} de {turnoCadena.total} confirmados · {turnoCadena.porConfirmar} por confirmar
          </p>
        </Link>
      )}
      {turnoCadena && turnoCadena.porConfirmar > 0 && <AvisoConfirmar pendientes={turnoCadena.porConfirmar} />}

      {cuenta.multas.length > 0 && (
        <Link href="/prestamos" className="block space-y-2 rounded-[28px] border-2 border-danger bg-card p-4">
          <p className="font-bold text-danger">Tienes {pesos(cuenta.multasPendientes)} en multas por pagar</p>
          {cuenta.multas.map((m, i) => (
            <p key={i} className="text-sm text-muted">
              {m.motivo}
              {m.fecha && ` · reunión ${fechaCorta(m.fecha)}`} · <span className="font-semibold text-foreground">{pesos(m.monto)}</span>
            </p>
          ))}
          <p className="flex items-center gap-2 text-xs text-muted">
            <Lock size={14} /> Mientras no las pagues no puedes pedir un préstamo. Págalas a un directivo.
          </p>
        </Link>
      )}

      {extra && !extra.cuenta_pago && (
        <Link href="/perfil" className="block rounded-2xl border border-danger p-4 text-sm">
          Falta registrar tu <span className="font-semibold">cuenta o llave para recibir pagos</span>. Toca aquí para agregarla.
        </Link>
      )}

      {!foto && <AvisoFoto />}

      <ActivarNotificaciones compacto />

      {puedeSolicitar && <SolicitudRapida caja={Math.max(0, caja)} tope={tope} />}

      {/* Tarjeta principal: préstamo vigente y cuánto puede pedir */}
      <section data-tour="prestamo" className="space-y-3">
        {vigente ? (
          <TarjetaPrestamo
            etiqueta="Tu préstamo"
            valor={pesos(vigente.cuentas.saldoCapital)}
            titular={perfil.nombre}
            izquierda={{ titulo: "Interés mensual", valor: pesos(vigente.cuentas.interesMensual) }}
            derecha={{ titulo: "Interés pendiente", valor: pesos(vigente.cuentas.interesPendiente) }}
          />
        ) : prestamo ? (
          <TarjetaPrestamo
            etiqueta={prestamo.estado === "radicado" ? "Solicitud en votación" : "Solicitud aprobada"}
            valor={pesos(Number(prestamo.monto))}
            titular={perfil.nombre}
          />
        ) : (
          <TarjetaPrestamo
            etiqueta="Disponible para ti"
            valor={pesos(puedePedir)}
            titular={perfil.nombre}
            izquierda={{ titulo: "Tope", valor: pesos(tope) }}
          />
        )}
        {!puedeSolicitar && (
        <Link
          href="/prestamos"
          className="flex items-center justify-between rounded-full bg-card px-5 py-3.5 text-sm font-semibold"
        >
          {vigente ? "Abonar o ver mi préstamo" : prestamo ? "Ver detalle" : "Solicitar préstamo"}
          <ArrowRight size={18} />
        </Link>
        )}
      </section>

      {/* Resumen del resto */}
      <section data-tour="resumen" className="space-y-2">
        <h2 className="px-1 text-lg font-semibold">Mi resumen</h2>
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
          {cuenta.cuota ? (
            <Fila
              icon={Receipt}
              titulo={`Cuota mensual · ${cuenta.cuota.estado}`}
              valor={pesos(cuenta.cuota.total)}
              nota={`Vence ${fechaCorta(cuenta.cuota.vence)}`}
            />
          ) : (
            <Fila icon={Receipt} titulo="Cuota mensual" valor="Al día" />
          )}
          {cuenta.miTurno && (
            <Fila
              icon={Repeat}
              titulo="Mi turno de cadena"
              valor={`Turno ${cuenta.miTurno.turno}`}
              nota={fechaCorta(cuenta.miTurno.fecha_reunion)}
            />
          )}
          {cuenta.proximaReunion && (
            <Fila icon={CalendarClock} titulo="Próxima reunión" valor={`${fechaCorta(cuenta.proximaReunion)} · 7:30 p. m.`} />
          )}
          <Fila icon={PiggyBank} titulo="Multas pendientes" valor={pesos(cuenta.multasPendientes)} />
        </div>
      </section>

      <section data-tour="cuotas" className="space-y-2">
        <h2 className="px-1 text-lg font-semibold">Mis cuotas</h2>
        <div className="rounded-[28px] bg-card p-2">
          <div className="divide-y divide-card-border/60">
            {visibles.map((c) => (
              <FilaCuota key={c.periodo} c={c} />
            ))}
          </div>
          {resto.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none py-3 text-center font-semibold group-open:hidden">Ver todas</summary>
              <div className="divide-y divide-card-border/60 border-t border-card-border/60">
                {resto.map((c) => (
                  <FilaCuota key={c.periodo} c={c} />
                ))}
              </div>
            </details>
          )}
        </div>
      </section>
    </div>
  );
}

type CuotaFila = { periodo: string; total: number; pagada: boolean; vencida: boolean };

function FilaCuota({ c }: { c: CuotaFila }) {
  return (
    <div className="flex items-center justify-between px-2 py-3.5">
      <div>
        <p className="font-medium">{mesLargo(c.periodo)}</p>
        <p className="text-xs text-muted">{pesos(c.total)}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          c.pagada ? "bg-accent-soft text-accent" : c.vencida ? "bg-danger/15 text-danger" : "bg-amber/15 text-amber"
        }`}
      >
        {c.pagada ? "Pagada" : c.vencida ? "En mora" : "Pendiente"}
      </span>
    </div>
  );
}

function Fila({
  icon: Icon,
  titulo,
  valor,
  nota,
}: {
  icon: React.ComponentType<{ size?: number }>;
  titulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-2 py-3.5">
      <div className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted">{titulo}</p>
        <p className="font-semibold">{valor}</p>
      </div>
      {nota && <p className="text-xs text-muted">{nota}</p>}
    </div>
  );
}
