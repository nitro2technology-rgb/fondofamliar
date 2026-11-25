import RevisionPagoPrestamo from "./RevisionPagoPrestamo";
import type { ComprobantePrestamo } from "@/lib/comprobantes-prestamo";

// Comprobantes de un préstamo dentro de su tarjeta; los pendientes se pueden aprobar o rechazar ahí mismo.
export default function ComprobantesPrestamo({ lista }: { lista: ComprobantePrestamo[] }) {
  if (lista.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Comprobantes enviados ({lista.length})</p>
      {lista.map((x) => (
        <RevisionPagoPrestamo
          key={`${x.id}-${x.estado}`}
          id={x.id}
          asociado="Pago reportado"
          detalle={x.detalle}
          total={x.total}
          fecha={x.fecha}
          estadoInicial={x.estado}
          notaInicial={x.nota}
          url={x.url}
          enTarjeta
        />
      ))}
    </div>
  );
}
