import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";

const celda = (v: unknown) => {
  const t = String(v ?? "");
  return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

// Descarga todas las cuotas (una fila por asociado y mes) como CSV que abre Excel.
export async function GET() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("cuotas")
    .select("periodo, ahorro, cadena, juegos, estado, fecha_pago, perfiles!cuotas_asociado_id_fkey(nombre)")
    .order("periodo");

  const filas = (data ?? []).map((c) => ({
    nombre: (c.perfiles as unknown as { nombre: string } | null)?.nombre ?? "",
    ...c,
  }));
  filas.sort((a, b) => a.periodo.localeCompare(b.periodo) || a.nombre.localeCompare(b.nombre));

  const lineas = [
    ["Mes", "Asociado", "Ahorro", "Cadena", "Juegos", "Total", "Estado", "Fecha de pago"].join(";"),
    ...filas.map((c) =>
      [
        c.periodo.slice(0, 7),
        c.nombre,
        c.ahorro,
        c.cadena,
        c.juegos,
        Number(c.ahorro) + Number(c.cadena) + Number(c.juegos),
        c.estado,
        c.fecha_pago ?? "",
      ]
        .map(celda)
        .join(";"),
    ),
  ];

  return new Response("﻿" + lineas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cuotas-fondo-familiar.csv"',
    },
  });
}
