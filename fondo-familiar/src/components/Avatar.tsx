// Círculo con la inicial; el color sale del nombre para que cada persona tenga el suyo.
const TONOS = [
  "from-violet-500 to-fuchsia-500",
  "from-indigo-500 to-sky-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-500",
];

export default function Avatar({ nombre, size = 44 }: { nombre: string; size?: number }) {
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
