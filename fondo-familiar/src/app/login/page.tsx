import Link from "next/link";
import FormularioLogin from "./FormularioLogin";

export default function Login() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4">
      <div className="mb-4 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">Fondo Familiar</h1>
        <p className="mt-3 text-muted">Ingresa con tu correo para ver tu estado de cuenta.</p>
      </div>
      <FormularioLogin />
      <Link
        href="/primer-ingreso"
        className="rounded-full bg-card py-4 text-center font-semibold"
      >
        Primer ingreso
      </Link>
    </main>
  );
}
