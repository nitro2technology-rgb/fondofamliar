const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const pesos = (valor: number) => cop.format(valor);

// Fechas "YYYY-MM-DD" (sin hora): se leen como UTC para que no se corran de día.
export const fechaCorta = (iso: string) =>
  new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .replace(/\./g, "");

export const mesLargo = (iso: string) => {
  const t = new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// Hoy en Colombia como "YYYY-MM-DD".
export const hoyColombia = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
