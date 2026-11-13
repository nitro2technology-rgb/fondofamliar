import Image from "next/image";

// Símbolo «Brote F» dibujado en línea: se puede colorear (por defecto verde y semilla ámbar).
export function Simbolo({
  size = 40,
  color = "var(--accent)",
  semilla = "var(--amber)",
  className = "",
}: {
  size?: number;
  color?: string;
  semilla?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Fondo Familiar" className={className}>
      <g transform="translate(-7 1)">
        <rect x="32" y="18" width="13" height="64" rx="6.5" fill={color} />
        <path d="M40 34 A34 34 0 0 1 82 16 A34 34 0 0 1 40 34 Z" fill={color} />
        <path d="M40 56 A22 22 0 0 1 70 44 A22 22 0 0 1 40 56 Z" fill={color} />
        <circle cx="68" cy="72" r="6.5" fill={semilla} />
      </g>
    </svg>
  );
}

// Logo completo (símbolo + «Fondo Familiar»). Cambia solo según el tema claro/oscuro.
export default function Logo({ altura = 48 }: { altura?: number }) {
  const ancho = Math.round((altura * 439) / 96);
  return (
    <>
      <Image src="/logo/logo-oscuro.svg" alt="Fondo Familiar" width={ancho} height={altura} unoptimized priority className="light:hidden" />
      <Image src="/logo/logo-claro.svg" alt="Fondo Familiar" width={ancho} height={altura} unoptimized priority className="hidden light:block" />
    </>
  );
}
