import FormularioLogin from "./FormularioLogin";

export default function Login() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Fondo Familiar</h1>
        <p className="mt-2 text-muted">Ingresa con tu correo para ver tu estado de cuenta.</p>
      </div>
      <FormularioLogin />
    </main>
  );
}
