import Link from "next/link";
import FormularioPrimerIngreso from "./FormularioPrimerIngreso";

export default function PrimerIngreso() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Primer ingreso</h1>
        <p className="mt-2 text-muted">Escribe el número de celular que registraste en el fondo.</p>
      </div>
      <FormularioPrimerIngreso />
      <Link href="/login" className="text-center text-sm text-muted underline">
        Ya tengo cuenta
      </Link>
    </main>
  );
}
