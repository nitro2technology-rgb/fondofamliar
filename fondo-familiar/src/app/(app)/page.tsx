import Link from "next/link";
import { ArrowRight, CalendarClock, PiggyBank, Repeat, Receipt } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { pesos, fechaCorta, mesLargo } from "@/lib/format";
import { estadoDeCuenta, resumenPrestamo } from "@/lib/cuentas";
import { Suspense } from "react";
import { requerirPerfil } from "@/lib/auth";

export default function Inicio() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <InicioContenido />
    </Suspense>
  );
}

async function InicioContenido() {
  const perfil = await requerirPerfil();
  const [cuenta, { prestamo, tope, puedePedir }] = await Promise.all([
    estadoDeCuenta(perfil.id),
    resumenPrestamo(perfil.id),
  ]);
  const vigente = prestamo?.estado === "vigente" ? prestamo : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Hola,</p>
          <h1 className="text-3xl font-bold tracking-tight">{perfil.nombre.split(" ")[0]}</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Tarjeta principal: préstamo vigente y cuánto puede pedir */}
      <section className="rounded-3xl bg-gradient-to-br from-accent to-[#4a1d99] p-6 text-accent-fg shadow-lg">
        {vigente ? (
          <>
            <p className="text-sm opacity-80">Tu préstamo</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{pesos(vigente.cuentas.saldoCapital)}</p>
            <div className="mt-4 flex justify-between text-sm">
              <div>
                <p className="opacity-70">Interés mensual fijo</p>
                <p className="font-semibold">{pesos(vigente.cuentas.interesMensual)}</p>
              </div>
              <div className="text-right">
                <p className="opacity-70">Interés pendiente</p>
                <p className="font-semibold">{pesos(vigente.cuentas.interesPendiente)}</p>
              </div>
            </div>
          </>
        ) : prestamo ? (
          <>
            <p className="text-sm opacity-80">Solicitud {prestamo.estado === "radicado" ? "en votación" : "aprobada"}</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{pesos(Number(prestamo.monto))}</p>
          </>
        ) : (
          <>
            <p className="text-sm opacity-80">Sin préstamo vigente</p>
            <p className="mt-1 text-4xl font-bold tracking-tight">{pesos(puedePedir)}</p>
            <p className="mt-1 text-sm opacity-80">disponible para solicitar</p>
          </>
        )}
        <Link
          href="/prestamos"
          className="mt-5 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 text-sm font-medium"
        >
          {prestamo ? "Ver detalle" : "Solicitar préstamo"}
          <ArrowRight size={18} />
        </Link>
        <p className="mt-3 text-xs opacity-70">
          Puedes pedir hasta {pesos(puedePedir)} según lo disponible en el fondo (tope {pesos(tope)}).
        </p>
      </section>

      {/* Resumen del resto */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mi resumen</h2>
        <Fila icon={PiggyBank} titulo="Ahorro acumulado" valor={pesos(cuenta.ahorro)} />
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
        <Fila icon={Receipt} titulo="Multas pendientes" valor={pesos(cuenta.multasPendientes)} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Mis cuotas</h2>
        {cuenta.historial.map((c) => (
          <div key={c.periodo} className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-3 text-sm">
            <div>
              <p>{mesLargo(c.periodo)}</p>
              <p className="text-xs text-muted">{pesos(c.total)}</p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                c.pagada ? "bg-accent-soft text-accent" : c.vencida ? "text-danger" : "bg-card-border text-muted"
              }`}
            >
              {c.pagada ? "Pagada" : c.vencida ? "En mora" : "Pendiente"}
            </span>
          </div>
        ))}
      </section>
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
    <div className="flex items-center gap-4 rounded-2xl border border-card-border bg-card p-4">
      <div className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
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
