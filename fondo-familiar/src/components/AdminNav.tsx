"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2x2, Home, Landmark, Receipt } from "lucide-react";

const items = [
  { href: "/admin", label: "Resumen", icon: Home },
  { href: "/admin/pagos", label: "Pagos", icon: Receipt },
  { href: "/admin/prestamos", label: "Préstamos", icon: Landmark },
  { href: "/admin/mas", label: "Más", icon: Grid2x2 },
];

// Rutas de administración que cuelgan de "Más".
const ENMAS = ["/admin/mas", "/admin/cuotas", "/admin/asistencia", "/admin/multas", "/admin/aportes", "/admin/capturas", "/admin/asociados", "/admin/cierre"];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav data-tour="nav" className="shrink-0 border-t border-card-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, icon: Icon }) => {
          const activo =
            href === "/admin"
              ? pathname === "/admin"
              : href === "/admin/mas"
                ? ENMAS.some((r) => pathname.startsWith(r))
                : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 pb-2 pt-3 text-[11px] font-medium transition-colors ${
                  activo ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={24} strokeWidth={activo ? 2.5 : 2} className={activo ? "text-accent" : ""} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
