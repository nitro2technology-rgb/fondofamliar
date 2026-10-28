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
    <nav className="fixed inset-x-4 bottom-4 z-10 mx-auto max-w-md rounded-full border border-card-border bg-card/90 p-2 shadow-xl backdrop-blur">
      <ul className="flex justify-between">
        {items.map(({ href, label, icon: Icon }) => {
          const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex h-14 flex-col items-center justify-center rounded-full px-4 text-xs transition-colors ${
                  activo ? "bg-accent text-accent-fg" : "text-muted"
                }`}
              >
                <Icon size={22} />
                {activo && <span className="mt-0.5">{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
