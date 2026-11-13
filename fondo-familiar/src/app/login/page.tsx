import Link from "next/link";
import Logo from "@/components/Logo";
import FormularioLogin from "./FormularioLogin";

export default function Login() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4">
      <div className="mb-4 text-center">
        <div className="flex justify-center">
          <Logo altura={64} />
        </div>
        <h1 className="sr-only">Fondo Familiar</h1>
        <p className="mt-5 text-muted">Ahorra, presta y crece en familia.</p>
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
