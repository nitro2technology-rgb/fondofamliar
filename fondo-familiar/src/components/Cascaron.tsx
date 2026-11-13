// Estructura fija de la app: pantalla completa. El menú va arriba, translúcido y sobre el contenido (que se
// desplaza por debajo). Va arriba porque en Safari con la app instalada iOS deja una franja inferior fuera de la
// página (la ventana mide 47 px menos que la pantalla) y no se puede dibujar ahí.
// El degradado verde de fondo vive aquí para que se vea detrás del menú y de la barra de estado.
export default function Cascaron({ children, menu }: { children: React.ReactNode; menu: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-background">
      <div data-scroll className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/60 via-accent/12 to-transparent" />
        {children}
      </div>
      {menu}
    </div>
  );
}
