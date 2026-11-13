// Estructura fija de la app: la pantalla completa se divide en zona con desplazamiento + menú inferior.
// El menú ya no es «position: fixed» (en iPhone con la app instalada se subía en algunas pantallas):
// es parte de la columna y siempre queda pegado al borde de abajo.
export default function Cascaron({ children, menu }: { children: React.ReactNode; menu: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
      <div data-scroll className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </div>
      {menu}
    </div>
  );
}
