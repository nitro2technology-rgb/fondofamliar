# Especificaciones técnicas — Fondo de Ahorro Familiar

> Estado: v1. Plazo objetivo: 1 mes desde 2026-10-27 (≈ 2026-11-27). Costo objetivo: $0 (planes gratuitos).

## 1. Resumen
Aplicación web privada, mobile-first y PWA, para ~19 usuarios. Baja concurrencia; prioridad en integridad de datos financieros, privacidad por usuario y trazabilidad.

## 2. Stack
| Capa | Elección | Notas |
|---|---|---|
| Frontend + backend | **Next.js (App Router) + TypeScript** | Server Actions / Route Handlers |
| UI | Tailwind CSS + shadcn/ui | Tema oscuro por defecto, PWA |
| Hosting | **Vercel** (plan Hobby) | Dominio propio del usuario |
| Base de datos | **Supabase (PostgreSQL)** | Plan gratuito |
| Autenticación | Supabase Auth (email + magic link/clave) | Sin registro público; invitación por admin |
| Autorización | **Row Level Security (RLS)** de Postgres + rol en perfil | El asociado solo lee sus filas |
| Archivos | Supabase Storage (bucket privado) | Capturas mensuales NU |
| Correo | Resend (plan gratuito) o SMTP de Supabase | Avisos |
| Tareas programadas | Vercel Cron / Supabase pg_cron | Intereses, mora, recordatorios |

Limitaciones del plan gratuito a vigilar: Supabase pausa proyectos inactivos (7 días sin uso → mantener un cron de actividad) y no incluye respaldos diarios (hacer exportación propia periódica).

## 3. Modelo de datos (preliminar)
- `perfiles` (id = auth.users, nombre, correo, rol: asociado|tesorero|contador|fiscal, ciudad, activo)
- `ciclos` (id, nombre, inicio, fin)
- `parametros` (clave, valor, vigente_desde): cuota, interés %, tope préstamo, multas, etc.
- `cuotas` (id, asociado, periodo, ahorro, cadena, juegos, estado, fecha_pago, registrado_por)
- `aportes_unicos` (aporte inicial y tecnológico)
- `cadena_turnos` (asociado, turno 1–19, fecha_reunion, monto_recibido): cargados desde Listado General (nov-2026 a may-2028)
- `externos` (id, nombre, padrino_id)
- `prestamos` (id, deudor_asociado | externo, padrino, monto, estado, radicado_en, posicion_cola, desembolsado_en)
- `votos_prestamo` (prestamo, directivo, voto, fecha) — único por directivo
- `movimientos_prestamo` (prestamo, tipo: interés|abono|mora, monto, periodo, fecha)
- `reuniones` (fecha, hora) y `asistencias` (reunion, asociado, estado, multa)
- `multas` (asociado, motivo, monto, estado)
- `juegos` (reunion, recaudo, premio, utilidad)
- `capturas_cuenta` (periodo, ruta_archivo, saldo_declarado, subido_por)
- `auditoria` (usuario, acción, tabla, registro, antes/después, fecha) — solo inserción
- `notificaciones` (destinatario, tipo, enviada_en)

Reglas de integridad: montos en pesos enteros (COP, sin decimales); movimientos nunca se editan ni borran (se corrigen con contramovimiento); toda escritura financiera pasa por funciones/RPC con auditoría.

## 4. Lógica de negocio crítica
- **Validación de préstamo**: asociado al día, sin préstamo vigente, tope $1.000.000 acumulado (asociado + externo).
- **Cola**: por `radicado_en`; se atiende según caja disponible (saldo calculado).
- **Votación**: solo los 3 administradores; aprobado con 2 de 3 votos.
- **Interés**: cuota fija = 4% × capital inicial, causada cada mes (cron) mientras haya saldo de capital; no cambia con los abonos; sin fecha de vencimiento.
- **Mora**: fecha límite = fecha de la reunión; desde día +1 interés sobre interés (fórmula por confirmar; riesgo legal §7).
- **Cadena**: el asociado con turno del mes no paga su parte de cadena ese mes (se marca cuota con `cadena = 0`); monto recibido = (19 − 1) × $40.000, parametrizable.
- **Cierre**: bloquear cierre del ciclo mientras existan préstamos vigentes; generar liquidación por asociado = ahorro acumulado + utilidades ÷ 19 (partes iguales).
- **Multas**: generadas desde la asistencia (retraso $5.000, ausencia $8.000 solo Pasto).
- Parámetros editables en `parametros`, no hardcodeados.

## 5. Seguridad
- HTTPS (Vercel), claves con hash gestionadas por Supabase Auth, sesiones con cookies seguras.
- RLS activa en **todas** las tablas; `service_role` solo en servidor, nunca en el cliente.
- Permisos por rol verificados en BD, no solo en la UI.
- Los admins también son asociados: `perfiles.rol` (fiscal|tesorero|contador|asociado) y todos son asociados; dos paneles con el mismo login (`/mi-cuenta` y `/admin`), este último solo para admins.
- Auditoría inmutable; acceso admin protegido (2FA recomendado para directivos).
- Secretos en variables de entorno de Vercel.

## 6. Requisitos no funcionales
- Mobile-first, carga rápida, funciona en iOS y Android; PWA instalable.
- Idioma español (Colombia), moneda COP, zona horaria America/Bogota.
- Respaldos: exportación semanal (script/cron a almacenamiento privado).
- Accesibilidad básica (contraste en tema oscuro, tamaños táctiles).

## 7. Riesgos y decisiones abiertas
| Riesgo | Mitigación |
|---|---|
| Pausa de Supabase gratis por inactividad | Cron de ping + exportaciones periódicas |
| Interés sobre interés y 4% mensual pueden chocar con la tasa de usura en Colombia | Dejar la regla parametrizable; consultar a los directivos (es una decisión de reglamento, no técnica) |
| Reglas ambiguas del estatuto | Lista de puntos por confirmar en `Especificaciones de uso.md` §11 |
| Plazo de 1 mes | Entregar por fases (ver §8) |

## 8. Plan por fases (≈ 4 semanas)
1. **Semana 1**: proyecto Next.js + Supabase, esquema, RLS, login, roles, diseño base (tema oscuro, navegación inferior).
2. **Semana 2**: cuotas/aportes, estado de cuenta del asociado, carga de datos desde Excel, captura NU.
3. **Semana 3**: préstamos (solicitud, cola, votación, intereses, mora, abonos), asistencia/multas/juegos.
4. **Semana 4**: calendario, correos y crons, reportes/PDF, pruebas, dominio, puesta en producción.

## 9. Entornos
- Local → Preview (Vercel) → Producción en **fondofamiliar.nitro2tech.com** (CNAME en el DNS de nitro2tech.com hacia Vercel; dominio verificado en Resend para el correo). Repositorio Git por crear.
- Especificaciones y bitácora viven en `Instrucciones/`.
