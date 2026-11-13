import { fotosPerfil } from "@/lib/fotos-servidor";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Camera, CalendarClock, Gavel, Landmark, Receipt, Repeat, Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import CampanaAvisos from "@/components/CampanaAvisos";
import AvatarSocio from "@/components/AvatarSocio";
import Tutorial from "@/components/Tutorial";
import { tutorialVisto } from "@/lib/tutorial-visto";
import ThemeToggle from "@/components/ThemeToggle";
import TarjetaPrestamo from "@/components/TarjetaPrestamo";
import { requerirAdmin } from "@/lib/auth";
import { resumenFondo } from "@/lib/fondo";
import { fechaCorta, mesLargo, pesos } from "@/lib/format";

export default function Admin() {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <AdminContenido />
    </Suspense>
  );
}

async function AdminContenido() {
  const perfil = await requerirAdmin();
  const [f, visto, fotos] = await Promise.all([resumenFondo(), tutorialVisto(perfil.id, "admin"), fotosPerfil([perfil.id])]);
  const esHoy = f.siguiente?.fecha_reunion === f.hoy;

  return (
    <main className="relative mx-auto w-full max-w-md flex-1 space-y-6 px-4 pt-6">
      <Tutorial panel="admin" abrirAlInicio={!visto} />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/70 via-accent/15 to-transparent" />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar nombre={perfil.nombre} size={44} foto={fotos.get(perfil.id) ?? null} />
          <div>
            <p className="text-xs text-muted">Administración</p>
            <h1 className="text-lg font-bold leading-tight">{perfil.nombre.split(" ")[0]}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CampanaAvisos href="/avisos" />
          <ThemeToggle />
        </div>
      </header>

      {/* Cifra principal: lo que hay para prestar */}
      <section className="flex flex-col items-center pb-2 pt-6 text-center">
        <p className="text-sm text-muted">Disponible para prestar</p>
        <p data-tour="caja" className="mt-1 text-6xl font-extrabold tracking-tight">{pesos(f.caja)}</p>
        <Link
          href="/admin/prestamos"
          className="mt-4 rounded-full bg-accent/20 text-accent px-5 py-2 text-sm font-medium backdrop-blur"
        >
          {f.solicitudesEnVotacion > 0
            ? `${f.solicitudesEnVotacion} solicitud${f.solicitudesEnVotacion > 1 ? "es" : ""} en votación`
            : "Sin solicitudes en votación"}
        </Link>
      </section>

      {/* Acciones rápidas */}
      <nav data-tour="acciones" className="flex justify-between px-2">
        {[
          { href: "/admin/pagos", label: "Pagos", icon: Receipt, aviso: f.pagosPorRevisar },
          { href: "/admin/prestamos", label: "Préstamos", icon: Landmark, aviso: 0 },
          { href: "/admin/asistencia", label: "Asistencia", icon: Users, aviso: 0 },
          { href: "/admin/capturas", label: "Captura NU", icon: Camera, aviso: f.capturaPendiente ? 1 : 0, descarga: false },
        ].map(({ href, label, icon: Icon, aviso, descarga }) => {
          const contenido = (
            <>
              <span className="relative flex size-14 items-center justify-center rounded-full bg-card text-accent shadow-lg">
                <Icon size={24} />
                {aviso > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">
                    {aviso}
                  </span>
                )}
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

      {f.capturaPendiente && (
        <Link
          href={`/admin/capturas?mes=${f.capturaPendiente}`}
          className="flex items-center gap-4 rounded-[28px] border-2 border-accent bg-accent-soft p-4"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
            <Camera size={22} />
          </span>
          <span className="flex-1">
            <span className="block font-bold text-accent">Falta la captura de {mesLargo(`${f.capturaPendiente}-01`)}</span>
            <span className="block text-xs text-muted">Sube el pantallazo del saldo de la cuenta NU</span>
          </span>
          <ArrowRight size={20} className="text-accent" />
        </Link>
      )}

      {f.pagosPorRevisar > 0 && (
        <Link
          href="/admin/pagos"
          className="flex items-center justify-center gap-2 rounded-full bg-accent py-4 text-center font-semibold text-accent-fg"
        >
          Revisar {f.pagosPorRevisar} pago{f.pagosPorRevisar > 1 ? "s" : ""} pendiente{f.pagosPorRevisar > 1 ? "s" : ""}
          <ArrowRight size={20} />
        </Link>
      )}

      {/* Quién recibe la cadena */}
      {f.siguiente && (
        <section data-tour="siguiente" className="space-y-2">
          <h2 className="px-1 text-lg font-semibold">Siguiente en recibir</h2>
          <div className="rounded-[28px] bg-card p-5">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Repeat size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{f.siguiente.nombre_listado}</p>
                <p className="text-sm text-muted">
                  Turno {f.siguiente.turno} · {esHoy ? "hoy" : fechaCorta(f.siguiente.fecha_reunion)} · 7:30 p. m.
                </p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                {pesos(18 * 40000)}
              </span>
            </div>
            {f.despues && (
              <p className="mt-4 border-t border-card-border/60 pt-3 text-sm text-muted">
                Luego: <span className="font-medium text-foreground">{f.despues.nombre_listado}</span> ·{" "}
                {fechaCorta(f.despues.fecha_reunion)}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Préstamos activos */}
      <section data-tour="activos" className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-lg font-semibold">Préstamos activos</h2>
          <Link href="/admin/prestamos" className="text-sm text-accent">
            Ver todos
          </Link>
        </div>
        <TarjetaPrestamo
          etiqueta={`${f.activos.length} activo${f.activos.length === 1 ? "" : "s"}`}
          valor={pesos(f.enCartera)}
          titular="Capital en préstamos"
          izquierda={{ titulo: "Interés por cobrar", valor: pesos(f.porCobrar) }}
        />
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
          {f.activos.length === 0 && <p className="px-2 py-4 text-sm text-muted">No hay préstamos vigentes.</p>}
          {f.activos.map((c) => {
            const debe = c.cuentas.interesPendiente + c.cuentas.moraPendiente;
            return (
              <Link key={c.id} href={`/admin/socio/${c.asociadoId}`} className="flex items-center gap-4 px-2 py-3.5">
                <AvatarSocio nombre={c.nombre} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nombre}</p>
                  <p className="text-xs text-muted">Interés mensual {pesos(c.cuentas.interesMensual)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{pesos(c.cuentas.saldoCapital)}</p>
                  <p className={`text-xs ${c.cuentas.moraPendiente > 0 ? "text-danger" : debe > 0 ? "text-muted" : "text-ok"}`}>
                    {c.cuentas.moraPendiente > 0 ? "En mora" : debe > 0 ? `Debe ${pesos(debe)}` : "Al día"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Accesos */}
      <section className="space-y-2">
        <h2 className="px-1 text-lg font-semibold">Fondo</h2>
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
          <Acceso href="/admin/cierre" icon={Gavel} titulo="Cierre de ciclo" nota={f.ultimaReunion ? fechaCorta(f.ultimaReunion) : ""} />
          <Acceso href="/admin/mas" icon={CalendarClock} titulo="Cuotas, multas, aportes y más" />
        </div>
      </section>
    </main>
  );
}

function Acceso({
  href,
  icon: Icon,
  titulo,
  nota,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  titulo: string;
  nota?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 px-2 py-3.5">
      <div className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon size={22} />
      </div>
      <p className="flex-1 font-semibold">{titulo}</p>
      {nota && <p className="text-xs text-muted">{nota}</p>}
      <ArrowRight size={18} className="text-muted" />
    </Link>
  );
}
