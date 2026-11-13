import Link from "next/link";
import { Bell } from "lucide-react";
import { crearClienteServidor } from "@/lib/supabase/server";

// Campana con el número de avisos sin leer. Lleva a la bandeja de avisos.
export default async function CampanaAvisos({ href = "/avisos" }: { href?: string }) {
  const supabase = await crearClienteServidor();
  const { count } = await supabase.from("avisos").select("id", { count: "exact", head: true }).eq("leido", false);
  const n = count ?? 0;
  return (
    <Link href={href} data-tour="avisos" aria-label={n > 0 ? `${n} avisos sin leer` : "Avisos"} className="relative flex size-11 items-center justify-center rounded-full bg-card text-foreground">
      <Bell size={20} />
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-amber px-1 text-[11px] font-bold leading-5 text-accent-fg">
          {n > 9 ? "9+" : n}
        </span>
      )}
    </Link>
  );
}
