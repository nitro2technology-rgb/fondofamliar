const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const pesos = (valor: number) => cop.format(valor);
