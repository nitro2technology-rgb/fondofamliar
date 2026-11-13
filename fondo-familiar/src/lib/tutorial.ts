// Contenido del recorrido guiado. `objetivo`: nombres de elementos (data-tour) a señalar, el primero que exista;
// sin objetivo (o si no se encuentra) la burbuja sale centrada.
export type PasoTutorial = { objetivo?: string[]; titulo: string; texto: string; puntos?: string[] };

export const PASOS_ASOCIADO: PasoTutorial[] = [
  {
    titulo: "¡Bienvenido al Fondo Familiar!",
    texto: "Te mostramos en 1 minuto cómo se usa. Aquí registras y consultas todo; la plataforma no mueve dinero: pagas por tu banco y subes el comprobante.",
  },
  {
    objetivo: ["ahorro"],
    titulo: "Tu ahorro acumulado",
    texto: "Esta cifra es lo que llevas ahorrado en el fondo. Cada persona solo ve lo suyo.",
  },
  {
    objetivo: ["cuota"],
    titulo: "Tu cuota del mes",
    texto: "Aquí ves cuánto debes pagar, si está pendiente o en mora, y la fecha límite: el día de la reunión. Tócala para ir a pagar.",
  },
  {
    objetivo: ["acciones"],
    titulo: "Atajos",
    texto: "Cuatro botones para lo más usado:",
    puntos: ["Pagar: sube tus comprobantes", "Préstamo: pide o abona", "Calendario: reuniones y turnos", "Estado: descarga tu estado de cuenta en PDF"],
  },
  {
    objetivo: ["pagar", "acciones"],
    titulo: "Cómo pagar tu cuota",
    texto: "Toca «Pagar» y sube una captura por cada parte de la cuota:",
    puntos: [
      "Fondo (ahorro + juegos): a la cuenta del fondo",
      "Cadena: directo a quien tiene el turno ese mes",
      "Un administrador revisa. La cuota queda pagada solo con comprobante aprobado",
      "¿No sabes subirlo? Envíaselo a un administrador y él lo carga por ti",
    ],
  },
  {
    objetivo: ["solicitud", "prestamo"],
    titulo: "Préstamos",
    texto: "Cuando hay dinero disponible aquí puedes solicitarlo en un toque:",
    puntos: [
      "Pide todo lo disponible u otro monto (tope $1.000.000)",
      "Si no alcanza, quedas en cola por orden de llegada",
      "Los 3 directivos votan; se aprueba con 2 votos",
      "Un préstamo a la vez. Interés 4 % mensual fijo, se paga cada mes el día de tu desembolso; abonas a capital cuando quieras",
    ],
  },
  {
    objetivo: ["resumen"],
    titulo: "Tu resumen",
    texto: "Tu cuota, tu turno de cadena, la próxima reunión y tus multas.",
    puntos: ["Llegar tarde: multa de $5.000", "Faltar sin excusa: $8.000 (si vives en Pasto)", "Con multas o cuota en mora no puedes pedir préstamo"],
  },
  {
    objetivo: ["cuotas"],
    titulo: "Tus cuotas, mes a mes",
    texto: "El historial de lo que has pagado y lo que falta. «Ver todas» despliega el ciclo completo.",
  },
  {
    objetivo: ["nav"],
    titulo: "Menú inferior",
    texto: "Inicio, Préstamos (tu solicitud, cola y movimientos), Calendario (fechas y turno de la cadena) y Perfil.",
  },
  {
    objetivo: ["nav-perfil"],
    titulo: "Tu perfil",
    texto: "Aquí guardas tu cuenta o llave para que te hagan pagos, cambias entre tema claro y oscuro y puedes volver a ver este tutorial.",
  },
  {
    titulo: "¡Listo!",
    texto: "Ya conoces lo básico. Si tienes dudas, pregunta a cualquiera de los directivos.",
  },
];

export const PASOS_ADMIN: PasoTutorial[] = [
  {
    titulo: "Panel de administración",
    texto: "Como directivo tienes dos paneles con el mismo ingreso: tu cuenta de asociado y este. Cambias desde Más → «Cambiar a mi cuenta de asociado».",
  },
  {
    objetivo: ["caja"],
    titulo: "Dinero para prestar",
    texto: "La cifra grande es lo que hay disponible para préstamos (ya descuenta lo aprobado sin desembolsar).",
  },
  {
    objetivo: ["acciones"],
    titulo: "Atajos",
    texto: "Pagos (con el número de pendientes por revisar), Préstamos, Asistencia y Captura NU. Si falta la captura del mes, aquí te lo avisa.",
  },
  {
    objetivo: ["siguiente"],
    titulo: "Quién recibe la cadena",
    texto: "El asociado que recibe en la próxima reunión y el siguiente en la fila.",
  },
  {
    objetivo: ["activos"],
    titulo: "Préstamos activos",
    texto: "Capital prestado, interés por cobrar y quién está al día o en mora. Toca un nombre para ver todo su detalle: cuotas, préstamo, intereses pagados y multas.",
  },
  {
    objetivo: ["nav"],
    titulo: "Menú inferior",
    texto: "Resumen, Pagos, Préstamos y Más (cuotas, asistencia, multas, aportes, captura NU, asociados y cierre de ciclo).",
  },
  {
    titulo: "Pagos: aprobar comprobantes",
    texto: "En Pagos eliges primero Cuota o Préstamos.",
    puntos: [
      "Elige el mes en la lista y filtra Deben / Pagaron",
      "Por persona: sube comprobante de fondo o de cadena, o «Verificar pago» para ver la captura y aprobar o rechazar",
      "«Copiar lista de pendientes» arma el mensaje de WhatsApp",
    ],
  },
  {
    titulo: "Préstamos, asistencia y captura NU",
    texto: "Los directivos aprueban o rechazan en la cola de Préstamos (2 votos deciden). En cada reunión marca la asistencia: las multas se generan solas y se cobran con «Cobrar». Cada ronda sube el pantallazo de la cuenta NU y la app dice si cuadra.",
  },
  {
    titulo: "Cierre de ciclo",
    texto: "Todos los préstamos deben quedar pagos hasta un minuto antes de la última reunión. En Más → Cierre de ciclo ves quién debe y la liquidación de cada asociado (ahorro + utilidades ÷ 19) con su PDF.",
  },
];
