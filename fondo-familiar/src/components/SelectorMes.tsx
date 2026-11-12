"use client";

import { useRouter } from "next/navigation";

// Lista desplegable que navega a `${base}${valor}` al elegir una opción.
export default function SelectorMes({
  opciones,
  actual,
  base,
}: {
  opciones: { valor: string; texto: string }[];
  actual: string;
  base: string;
}) {
  const router = useRouter();
  return (
    <select
      value={actual}
      onChange={(e) => router.push(`${base}${e.target.value}`)}
      aria-label="Elegir reunión"
      className="w-full rounded-full border border-card-border bg-card px-5 py-3 text-sm font-semibold outline-none focus:border-accent"
    >
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}
