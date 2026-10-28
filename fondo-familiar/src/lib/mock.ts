// Datos de ejemplo mientras se conecta Supabase. Se reemplaza por consultas reales.
export const ejemplo = {
  prestamo: {
    vigente: true,
    capital: 300_000,
    interesMensual: 12_000, // 4% fijo del capital inicial
    interesPagadoHasta: "Octubre 2026",
  },
  topePrestamo: 1_000_000,
  cajaDisponible: 650_000, // lo que hay en el fondo para prestar
  ahorro: 480_000,
  cuotaMensual: { total: 83_000, estado: "Pendiente", vence: "13 nov 2026" },
  cadena: { turno: 15, fecha: "14 ene 2028" },
  proximaReunion: "13 nov 2026 · 7:30 p. m.",
  multasPendientes: 0,
};
