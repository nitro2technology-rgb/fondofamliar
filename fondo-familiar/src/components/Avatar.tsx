// Círculo con la inicial; el color sale del nombre para que cada persona tenga el suyo.
const TONOS = [
  "from-[#0b7a57] to-[#0e3b2e]",
  "from-[#c27512] to-[#7a4a0a]",
  "from-[#12906a] to-[#0b7a57]",
  "from-[#d98a1a] to-[#a35f0c]",
];

export default function Avatar({ nombre, size = 44, foto }: { nombre: string; size?: number; foto?: string | null }) {
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={foto} alt={nombre} width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover shadow-md" />
    );
  }
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % TONOS.length;
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-md ${TONOS[h]}`}
    >
      {nombre.trim().charAt(0).toUpperCase()}
    </span>
  );
}
