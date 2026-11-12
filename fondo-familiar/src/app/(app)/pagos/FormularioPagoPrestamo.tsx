"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { reportarPagoPrestamo, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import SelectorArchivo from "@/components/SelectorArchivo";

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent";

type Cifras = { saldoCapital: number; interesPendiente: number; moraPendiente: number; interesMensual: number };
type Modo = "interes" | "abono" | "total";

const pesos = (n: number) => `$${n.toLocaleString("es-CO")}`;
const num = (t: string) => Number(t.replace(/\D/g, "")) || 0;

// Pago del préstamo en tres modalidades: interés del mes, abono a capital (cualquier valor) o pago total.
export default function FormularioPagoPrestamo({ c }: { c: Cifras }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(reportarPagoPrestamo, {});
  const [comprimiendo, setComprimiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const [modo, setModo] = useState<Modo>("interes");
  const [abono, setAbono] = useState("");
  const [interesAbono, setInteresAbono] = useState(String(c.interesPendiente || ""));
  const ocupado = pendiente || comprimiendo;

  // Interés del mes: lo pendiente (o, si está al día, el siguiente) más la mora si la hay.
  const interesMes = c.interesPendiente > 0 ? c.interesPendiente : c.interesMensual;
  const montos =
    modo === "interes"
      ? { interes: interesMes, mora: c.moraPendiente, capital: 0 }
      : modo === "total"
        ? { interes: c.interesPendiente, mora: c.moraPendiente, capital: c.saldoCapital }
        : { interes: num(interesAbono), mora: 0, capital: num(abono) };
  const total = montos.interes + montos.mora + montos.capital;

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    setComprimiendo(true);
    const datos = await datosConImagenComprimida(e.currentTarget);
    setComprimiendo(false);
    const problema = errorDeArchivo(datos);
    setErrorLocal(problema ?? "");
    if (problema) return;
    startTransition(() => accion(datos));
  }

  const opciones: { id: Modo; titulo: string; detalle: string }[] = [
    { id: "interes", titulo: "Pagar el interés del mes", detalle: `${pesos(interesMes)}${c.moraPendiente > 0 ? ` + mora ${pesos(c.moraPendiente)}` : ""}` },
    { id: "abono", titulo: "Abonar a capital", detalle: "Cualquier valor, hasta tu saldo" },
    { id: "total", titulo: "Pagar todo y cancelar", detalle: pesos(c.interesPendiente + c.moraPendiente + c.saldoCapital) },
  ];

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      <div className="space-y-1 rounded-[28px] bg-card p-5">
        <p className="text-sm text-muted">Saldo de tu préstamo</p>
        <p className="text-3xl font-extrabold tracking-tight">{pesos(c.saldoCapital)}</p>
        <p className="text-xs text-muted">
          El interés ({pesos(c.interesMensual)} al mes) se paga cada reunión hasta cancelar todo el capital. Al cancelarlo por completo
          quedas libre para pedir otro préstamo.
        </p>
      </div>

      <div className="space-y-2">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setModo(o.id)}
            className={`flex w-full items-center justify-between rounded-2xl p-4 text-left ${
              modo === o.id ? "bg-accent text-accent-fg" : "bg-card"
            }`}
          >
            <span className="font-semibold">{o.titulo}</span>
            <span className={`text-sm ${modo === o.id ? "opacity-90" : "text-muted"}`}>{o.detalle}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4 rounded-[28px] bg-card p-5">
        {modo === "abono" && (
          <>
            <label className="block space-y-1">
              <span className="text-sm">Valor a abonar a capital</span>
              <input inputMode="numeric" placeholder="0" value={abono} onChange={(e) => setAbono(e.target.value)} className={campo} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm">
                Interés que pagas junto <span className="text-muted">· pendiente {pesos(c.interesPendiente)}</span>
              </span>
              <input inputMode="numeric" placeholder="0" value={interesAbono} onChange={(e) => setInteresAbono(e.target.value)} className={campo} />
            </label>
          </>
        )}

        <input type="hidden" name="interes" value={montos.interes} />
        <input type="hidden" name="mora" value={montos.mora} />
        <input type="hidden" name="capital" value={montos.capital} />

        <div className="space-y-1 text-sm">
          {montos.interes > 0 && <Linea t="Interés" v={pesos(montos.interes)} />}
          {montos.mora > 0 && <Linea t="Mora" v={pesos(montos.mora)} />}
          {montos.capital > 0 && <Linea t="Abono a capital" v={pesos(montos.capital)} />}
          <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
            <span className="text-muted">Total a transferir</span>
            <span className="font-bold">{pesos(total)}</span>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm">Comprobante</span>
          <SelectorArchivo titulo="Subir comprobante" ayuda="Pantallazo del pago" />
        </label>

        <button disabled={ocupado || total <= 0} className="w-full rounded-full bg-foreground py-4 font-semibold text-background disabled:opacity-50">
          {comprimiendo ? "Comprimiendo…" : pendiente ? "Enviando…" : "Enviar pago del préstamo"}
        </button>
        {estado.ok && !ocupado && <p className="text-sm text-ok">Enviado. Un administrador lo revisará y se descontará de tu préstamo.</p>}
        {(errorLocal || estado.error) && !ocupado && <p className="text-sm text-danger">{errorLocal || estado.error}</p>}
        <p className="text-xs text-muted">¿No logras subirlo? Envíaselo a un administrador.</p>
      </div>
    </form>
  );
}

function Linea({ t, v }: { t: string; v: string }) {
  return (
    <div className="flex justify-between px-1">
      <span className="text-muted">{t}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
