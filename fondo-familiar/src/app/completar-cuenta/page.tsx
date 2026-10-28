import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/auth";
import FormularioCompletar from "./FormularioCompletar";

export default function CompletarCuenta() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const perfil = await requerirSesion();
  if (perfil.primer_ingreso_completo) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Hola, {perfil.nombre}</h1>
        <p className="mt-2 text-muted">
          Para terminar, escribe tu correo electrónico y crea tu contraseña. Con ellos entrarás de ahora en adelante.
        </p>
      </div>
      <FormularioCompletar />
    </main>
  );
}
