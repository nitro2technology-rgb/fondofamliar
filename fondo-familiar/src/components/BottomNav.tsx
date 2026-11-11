"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Landmark, User } from "lucide-react";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/prestamos", label: "Préstamos", icon: Landmark },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-card-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, icon: Icon }) => {
          const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 pb-2 pt-3 text-[11px] font-medium transition-colors ${
                  activo ? "text-foreground" : "text-muted"
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
