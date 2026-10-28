import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase y envía a /login a quien no haya iniciado sesión.
// La autorización real por rol se verifica en el servidor (lib/auth.ts) y en la base de datos (RLS).
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(lista) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enLogin = request.nextUrl.pathname === "/login";

  if (!user && !enLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && enLogin) {
    return NextResponse.redirect(new URL("/elegir-panel", request.url));
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
