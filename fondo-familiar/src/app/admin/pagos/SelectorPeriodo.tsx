"use client";

import { useRouter } from "next/navigation";

// Lista desplegable de meses; al elegir uno recarga conservando el filtro.
export default function SelectorPeriodo({
  opciones,
  actual,
  filtro,
}: {
  opciones: { valor: string; texto: string }[];
  actual: string;
  filtro: string;
}) {
  const router = useRouter();
  return (
    <select
      value={actual}
      onChange={(e) => router.push(`/admin/pagos?tipo=cuota&periodo=${e.target.value}&filtro=${filtro}`)}
      aria-label="Mes a consultar"
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
