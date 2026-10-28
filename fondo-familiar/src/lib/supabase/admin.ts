import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la clave service_role: salta RLS. Usar solo en servidor y tras verificar permisos.
export const clienteAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
