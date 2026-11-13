"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Images, Landmark, User } from "lucide-react";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/prestamos", label: "Préstamos", icon: Landmark },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/recuerdos", label: "Recuerdos", icon: Images },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav data-tour="nav" className="shrink-0 border-t border-card-border/60 bg-background/85 pb-[max(0.25rem,calc(env(safe-area-inset-bottom)-1.25rem))] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, icon: Icon }) => {
          const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} data-tour={`nav-${label.toLowerCase()}`} className="flex-1">
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
