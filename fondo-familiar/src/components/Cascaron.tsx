// Estructura fija de la app: pantalla completa con el menú arriba (bajo la barra de estado) y la zona de
// contenido con desplazamiento debajo. El menú va arriba porque en Safari con la app instalada iOS deja una
// franja inferior fuera de la página (la ventana mide 47 px menos que la pantalla) y no se puede dibujar ahí.
export default function Cascaron({ children, menu }: { children: React.ReactNode; menu: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
      {menu}
      <div data-scroll className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
