import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CalendarCheck,
  DatabaseBackup,
  FileSpreadsheet,
  FileText,
  Gavel,
  PiggyBank,
  Receipt,
  Repeat,
  Users,
  Wallet,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { requerirAdmin } from "@/lib/auth";
import { CircleHelp } from "lucide-react";

export default function Mas() {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido />
    </Suspense>
  );
}

const gestion = [
  { href: "/admin/cuotas", icon: Receipt, titulo: "Cuotas mensuales", nota: "Consulta por mes" },
  { href: "/admin/asistencia", icon: CalendarCheck, titulo: "Asistencia y juegos" },
  { href: "/admin/multas", icon: PiggyBank, titulo: "Multas" },
  { href: "/admin/aportes", icon: Wallet, titulo: "Aportes únicos", nota: "Inicial y tecnológico" },
  { href: "/admin/capturas", icon: Camera, titulo: "Captura cuenta NU", nota: "Historial mensual" },
  { href: "/admin/asociados", icon: Users, titulo: "Asociados", nota: "Celular, ciudad y cuenta" },
  { href: "/admin/cierre", icon: Gavel, titulo: "Cierre de ciclo", nota: "Liquidación" },
];

const reportes = [
  { href: "/admin/exportar", icon: FileSpreadsheet, titulo: "Cuotas (Excel)" },
  { href: "/admin/cartera-pdf", icon: FileText, titulo: "Cartera de préstamos (PDF)" },
  { href: "/admin/liquidacion-pdf", icon: Repeat, titulo: "Liquidación del ciclo (PDF)" },
  { href: "/admin/respaldo", icon: DatabaseBackup, titulo: "Respaldo de la base", nota: "Descargar ahora" },
];

async function Contenido() {
  await requerirAdmin();
  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Más</h1>
        <ThemeToggle />
      </header>

      <Seccion titulo="Gestión" items={gestion} />
      <Seccion titulo="Reportes" items={reportes} descarga />

      <Link
        href="/admin?tutorial=1"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-card py-3.5 text-sm font-semibold"
      >
        <CircleHelp size={18} />
        Ver tutorial de la plataforma
      </Link>

      <Link
        href="/elegir-panel"
        className="flex items-center justify-center gap-2 rounded-full bg-card py-3.5 text-sm font-semibold"
      >
        Cambiar a mi cuenta de asociado
        <ArrowRight size={18} />
      </Link>
    </main>
  );
}

function Seccion({
  titulo,
  items,
  descarga,
}: {
  titulo: string;
  items: { href: string; icon: React.ComponentType<{ size?: number }>; titulo: string; nota?: string }[];
  descarga?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-lg font-semibold">{titulo}</h2>
      <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
        {items.map(({ href, icon: Icon, titulo: t, nota }) => {
          const interior = (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon size={22} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{t}</p>
                {nota && <p className="text-xs text-muted">{nota}</p>}
              </div>
              <ArrowRight size={18} className="text-muted" />
            </>
          );
          return descarga ? (
            <a key={href} href={href} className="flex items-center gap-4 px-2 py-3.5">
              {interior}
            </a>
          ) : (
            <Link key={href} href={href} className="flex items-center gap-4 px-2 py-3.5">
              {interior}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
