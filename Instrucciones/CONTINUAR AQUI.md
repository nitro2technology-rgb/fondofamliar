# CONTINUAR AQUÍ — Bitácora del proyecto

> Actualizar al final de cada sesión.

## Resumen del proyecto
Web privada (PWA, mobile-first) para ~19 asociados del Fondo de Ahorro Familiar. Solo registra y consulta; no mueve dinero. Desarrollador y Fiscal: Nicolás Pérez. Plazo: 1 mes desde 2026-10-27.

## Archivos
- `Especificaciones de uso.md` — reglas del fondo, roles, funciones, flujos
- `Especificaciones tecnicas.md` — stack, modelo de datos, seguridad, plan por fases
- `Estatutos/` — estatuto (fuente de las reglas)
- `Pantallazos/` — referencias de diseño (oscuro, tarjetas, barra inferior flotante, calendario)
- `Listado general/Listado General.pdf` — turnos y fechas de la cadena (19)
- Todo está dentro de la carpeta `Instrucciones/`

## Decisiones tomadas
- Stack: Next.js + TypeScript, Vercel (gratis), Supabase (Postgres + Auth + Storage, gratis), correo con Resend, dominio propio.
- Cada asociado solo ve lo suyo (RLS). Solo los 3 directivos votan préstamos.
- Sin pagos en la app; avisos por correo; uso principalmente móvil.
- Datos iniciales: migrar el Excel actual (pendiente: aún no lo entregan).
- Interés de préstamo: 4% mensual FIJO sobre el capital inicial, sin plazo; abonos no lo reducen.
- Votación: mayoría 2 de 3 administradores. Los 19 incluyen a los 3 admins, que acceden a panel de usuario y de administración con el mismo login.
- Fecha límite de pago = día de la reunión. Al cierre del ciclo se reparte todo, en una reunión de liquidación; los préstamos deben estar pagos antes.
- Cadena: quien recibe el turno no paga su parte de cadena ($40.000) pero sí ahorro y juegos; recibe 18 × $40.000 = $720.000.
- Utilidades al cierre: partes iguales entre los 19.
- Mora: se implementa provisionalmente 4% mensual sobre el interés no pagado (parametrizable); pendiente de confirmar.
- Dominio: fondofamiliar.nitro2tech.com

## Sesión 1 — 2026-10-27
**Hecho**
- Creadas y completadas ambas especificaciones (v1) a partir del estatuto, pantallazos y respuestas.

**Pendiente / próximo paso**
1. Usuario: entregar Excel actual; confirmar con los admins la fórmula de mora (provisional en uso §11).
2. Crear proyecto Next.js + Supabase, esquema SQL con RLS (Semana 1 del plan); inicializar git.
3. Crear subdominio en DNS y conectarlo a Vercel.

## Sesión 2 — 2026-10-27
**Hecho**
- Resueltos puntos pendientes: interés fijo, mayoría 2/3, 19 incluye admins con doble panel, fecha límite = reunión, dominio.
- Leído Listado General (cadena de 19 turnos, nov-2026 a may-2028) e incorporado al §12 de uso y al modelo de datos.
- Archivos movidos por el usuario a `Instrucciones/`; actualizados ahí.

**Preguntas abiertas**
- Fórmula exacta del interés sobre interés en mora (provisional).
- Posible choque del 4% mensual / anatocismo con la tasa de usura colombiana (decisión de reglamento).

## Sesión 3 — 2026-10-28 (Semana 1)
**Decisiones de diseño (del usuario)**
- Tema oscuro por defecto con botón para cambiar a claro; acento morado.
- Inicio del asociado: tarjeta principal = su préstamo vigente y cuánto puede pedir (mín. entre tope $1.000.000 y caja disponible para préstamos); debajo, resumen del resto (ahorro, cuota, cadena, reunión, multas).
- Admins eligen panel (Mi cuenta / Administración) en un selector tras iniciar sesión.

**Hecho**
- Proyecto Next.js 16 + Tailwind en `fondo-familiar/` (compila y pasa lint). Instaladas dependencias de Supabase y lucide-react.
- Pantallas maqueta con datos de ejemplo (`src/lib/mock.ts`): login, elegir-panel, Inicio, Préstamos, Calendario, Perfil, Admin; barra inferior flotante; ThemeToggle.
- Esquema SQL con RLS y auditoría: `fondo-familiar/supabase/migrations/0001_esquema_base.sql`.
- Usuario se encarga de git.

**Próximo paso**
1. Usuario crea proyecto en Supabase y pasa URL + anon key (+ service role en `.env.local`, ver `.env.example`); aplicar la migración.
2. Conectar login real (Supabase Auth), proteger rutas por rol, reemplazar mock por datos reales.
3. Cargar los 19 turnos de cadena y perfiles. Luego Semana 2 (cuotas, estado de cuenta, Excel, captura NU).
4. Pendiente: Excel del fondo; confirmar fórmula de mora con admins.

## Sesión 4 — Login con Supabase
**Hecho**
- Migración 0001 ya aplicada por el usuario; conexión verificada (tablas accesibles, RLS devuelve vacío a anónimos).
- Login real con Supabase Auth (correo + contraseña): `proxy.ts` (refresca sesión y redirige a /login), `lib/supabase/{server,client}.ts`, `lib/auth.ts` (requerirPerfil / requerirAdmin), cierre de sesión, selector de panel solo para admins, Inicio/Perfil con nombre real.
- Migración `0002_perfil_automatico.sql`: crea el perfil al crearse un usuario (rol asociado por defecto).

**Pendiente del usuario**
1. Ejecutar 0002 en el SQL Editor de Supabase.
2. Crear su usuario en Authentication → Users y asignarse rol `fiscal` (SQL al final de 0002).
3. Desactivar registro público (Authentication → Sign In / Providers → Email → desactivar "Allow new users to sign up").

**Próximo paso**
- Panel admin para crear los 19 usuarios (usa service role en servidor), cargar cadena de turnos y luego Semana 2 (cuotas, estado de cuenta real, Excel, captura NU).
