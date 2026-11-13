# Especificaciones técnicas — Fondo de Ahorro Familiar

> Estado: v3 (2026-11-13, sesión 10; Semanas 1–4 construidas, push, fotos y Recuerdos). Plazo objetivo: 1 mes desde 2026-10-27 (≈ 2026-11-27). Costo objetivo: $0 (planes gratuitos).

## 1. Resumen
Aplicación web privada, mobile-first y PWA, para ~19 usuarios. Baja concurrencia; prioridad en integridad de datos financieros, privacidad por usuario y trazabilidad.

## 2. Stack
| Capa | Elección | Notas |
|---|---|---|
| Frontend + backend | **Next.js (App Router) + TypeScript** | Server Actions / Route Handlers |
| UI | Tailwind CSS + lucide-react | Tema oscuro por defecto; Next.js 16 (App Router, `cacheComponents`, `proxy.ts`) |
| Hosting | **Vercel** (plan Hobby) | Dominio propio del usuario |
| Base de datos | **Supabase (PostgreSQL)** | Plan gratuito |
| Autenticación | Supabase Auth (correo + contraseña) | Sin registro público. Primer ingreso por celular: cuentas creadas con correo interno provisional `socio<turno>@fondofamiliar.nitro2tech.com` hasta que la persona registre su correo y contraseña |
| Autorización | **Row Level Security (RLS)** de Postgres + rol en perfil | El asociado solo lee sus filas |
| Archivos | Supabase Storage | Privados: `capturas-nu` (solo admin), `comprobantes-pago` (carpeta por asociado; admin lee todo) y `recuerdos` (fotos de reuniones; enlaces firmados de 1 h). Público: `fotos-perfil` (avatares, rutas no adivinables). Todas las imágenes se comprimen en el navegador (JPEG): comprobantes 2000 px; recuerdos 1600 px + miniatura 480 px; perfil 512 px cuadrada. Recuerdos y perfil se suben directo a Storage con política por carpeta del usuario; comprobantes pasan por Server Actions (límite 4 MB) |
| Correo | Resend (plan gratuito) o SMTP de Supabase | Avisos |
| Notificaciones push | Web Push (`web-push`, VAPID) + service worker `public/sw.js` | Claves en `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_ASUNTO`; suscripciones en `push_suscripciones`. En iPhone requiere la app instalada. Cada aviso se guarda además en `avisos` (campana de la app), útil en dispositivos sin push |
| Tareas programadas | **Vercel Cron** (`vercel.json`) | `/api/mantener-activo` y `/api/recordatorios` diarios (7 a. m. Colombia; protegidos con `CRON_SECRET` opcional) |

Limitaciones del plan gratuito a vigilar: Supabase pausa proyectos inactivos (7 días sin uso → mantener un cron de actividad) y no incluye respaldos diarios (hacer exportación propia periódica).

## 3. Modelo de datos (preliminar)
- `perfiles` (id = auth.users, nombre, correo, rol: asociado|tesorero|contador|fiscal, ciudad, celular, cuenta_pago, foto_ruta, primer_ingreso_completo, tutorial_asociado, tutorial_admin, activo)
- `ciclos` (id, nombre, inicio, fin)
- `parametros` (clave, valor, vigente_desde): cuota, interés %, tope préstamo, multas, etc.
- `cuotas` (id, asociado, periodo, ahorro, cadena, juegos, estado, fecha_pago, registrado_por)
- `aportes_unicos` (aporte inicial y tecnológico)
- `cadena_turnos` (asociado, turno 1–19, fecha_reunion, monto_recibido): cargados desde Listado General (nov-2026 a may-2028)
- `externos` (id, nombre, padrino_id)
- `prestamos` (id, deudor_asociado | externo, padrino, monto, estado, radicado_en, posicion_cola, desembolsado_en, cobrar_4x1000)
- `votos_prestamo` (prestamo, directivo, voto, fecha) — único por directivo
- `movimientos_prestamo` (prestamo, tipo: desembolso|interes|abono_capital|interes_mora|reembolso_4x1000, monto, periodo, fecha) — solo inserción
- `pagos_prestamo` (prestamo, asociado, monto_interes, monto_4x1000, monto_mora, monto_capital, ruta_archivo, estado, subido_por, revisado_por)
- `recuerdos` (reunion_id, asociado_id, ruta, ruta_mini, creado_en) — máximo 5 por persona y reunión (trigger `limitar_recuerdos`)
- `push_suscripciones` (asociado_id, endpoint único, p256dh, auth) y `avisos` (asociado_id, titulo, cuerpo, url, leido, creado_en; se limpian a los 60 días)
- `reuniones` (fecha, hora) y `asistencias` (reunion, asociado, estado, multa)
- `multas` (asociado, motivo, monto, estado)
- `juegos` (reunion, recaudo, premio, utilidad)
- `capturas_cuenta` (periodo, ruta_archivo, saldo_declarado, subido_por)
- `auditoria` (usuario, acción, tabla, registro, antes/después, fecha) — solo inserción
- `pagos_reportados` (cuota_id, asociado_id, tipo: fondo|cadena, monto, ruta_archivo, estado: pendiente|aprobado|rechazado, nota, subido_por, revisado_por, revisado_en; único por cuota+tipo)
- `entregas_cadena`: eliminada en la migración 0013 (la cadena se paga directo al receptor)

Funciones SQL: `es_admin()`, `generar_cuotas()`, `caja_disponible()`, `posicion_cola()`, `saldo_calculado(hasta)` (solo admins; ya sin cadena), `beneficiario_cadena(periodo)` (nombre y cuenta de quien tiene el turno, solo a quien tiene cuota ese mes o a un admin). Trigger que decide la votación con 2 votos iguales; índice único de multa por (reunión, asociado); índice único de un préstamo en curso por asociado.

Reglas de integridad: montos en pesos enteros (COP, sin decimales); movimientos nunca se editan ni borran (se corrigen con contramovimiento); toda escritura financiera pasa por funciones/RPC con auditoría.

## 4. Lógica de negocio crítica
- **Validación de préstamo**: asociado al día, sin préstamo vigente, tope $1.000.000 acumulado (asociado + externo).
- **Cola**: por `radicado_en`; se atiende según caja disponible (saldo calculado).
- **Votación**: solo los 3 administradores; aprobado con 2 de 3 votos.
- **Interés**: cuota fija = 4% × capital inicial, que vence **cada mes el mismo día del desembolso** (`sumarMeses` en `lib/prestamos.ts`, con ajuste a fin de mes) mientras haya saldo de capital; no cambia con los abonos. Se calcula al vuelo (`cuentasPrestamo`), sin tabla de causación.
- **4x1000**: 0,4 % del capital desembolsado (`PORCENTAJE_4X1000`), solo si `prestamos.cobrar_4x1000` (se marca al desembolsar; los 6 del Excel no). Lo que el deudor paga como interés cubre primero el 4x1000 pendiente (se separa al reportar el pago y se guarda como `reembolso_4x1000`, que no entra en `caja_disponible` ni en utilidades del cierre). `saldo_calculado` resta el impuesto pagado al banco al desembolsar y suma el reembolso.
- **Mora**: fecha límite = fecha de la reunión; desde día +1 interés sobre interés (fórmula por confirmar; riesgo legal §7).
- **Cadena**: el asociado con turno del mes no paga su parte de cadena ese mes (cuota con `cadena = 0`); monto recibido = (19 − 1) × $40.000, parametrizable. Se paga directo al receptor: no entra a la cuenta NU.
- **Pagos con comprobante**: `reportarPago` (asociado), `subirComprobanteAdmin` (admin, cliente de servicio por la política de almacenamiento), `revisarPago` (admin) y `confirmarRecepcion` (receptor del turno, validado en servidor con service role). `sincronizarCuota` marca la cuota pagada cuando el pago fondo (y cadena si aplica) están aprobados, o la devuelve a pendiente al deshacer. No existe marcado manual de cuotas.
- **Conciliación**: `saldo_calculado` = ahorro + juegos de cuotas pagadas + aportes únicos + intereses/mora/abonos + reembolsos 4x1000 + multas pagadas − desembolsos − 4x1000 pagado al banco − premios de juegos; se compara con el saldo declarado de la captura NU del mes.
- **Asistencia**: `guardarAsistencia` es idempotente (borra multas impagas de la reunión y las regenera con upsert que ignora duplicados).
- **Cierre**: bloquear cierre del ciclo mientras existan préstamos vigentes; generar liquidación por asociado = ahorro acumulado + utilidades ÷ 19 (partes iguales).
- **Multas**: generadas desde la asistencia (retraso $5.000, ausencia $8.000 solo Pasto).
- Parámetros editables en `parametros`, no hardcodeados.

## 5. Seguridad
- HTTPS (Vercel), claves con hash gestionadas por Supabase Auth, sesiones con cookies seguras.
- RLS activa en **todas** las tablas; `service_role` solo en servidor, nunca en el cliente (usos: primer ingreso, editar la cuenta de pagos propia, lectura de pagos de cadena para el receptor, carga de comprobantes por admin, cron).
- Permisos por rol verificados en BD, no solo en la UI.
- Los admins también son asociados: `perfiles.rol` (fiscal|tesorero|contador|asociado) y todos son asociados; dos paneles con el mismo login (grupo de rutas del asociado y `/admin`), este último solo para admins; el selector está en `/elegir-panel`. `lib/auth.ts` (`requerirPerfil`/`requerirAdmin`) valida en servidor además de RLS.
- Auditoría inmutable; acceso admin protegido (2FA recomendado para directivos).
- Secretos en variables de entorno de Vercel.

## 6. Requisitos no funcionales
- Mobile-first, carga rápida, funciona en iOS y Android; PWA instalable.
- Idioma español (Colombia), moneda COP, zona horaria America/Bogota.
- Respaldos: **construido**. `lib/respaldo.ts` exporta todas las tablas a un JSON comprimido; los domingos (hora Colombia) el cron `/api/mantener-activo` lo guarda en el bucket privado `respaldos` (últimos 12) y lo envía por correo al fiscal (adjunto Resend). Descarga manual en `/admin/respaldo`. No incluye los archivos de Storage.
- Estructura de pantalla (móvil): `components/Cascaron.tsx` fija la app a la pantalla completa (`fixed inset-0`) con zona de desplazamiento interna y el menú inferior como parte de la columna (no `position: fixed`), para que el menú quede siempre al borde de abajo en iPhone con la app instalada.
- Accesibilidad básica (contraste en tema oscuro, tamaños táctiles).

## 7. Riesgos y decisiones abiertas
| Riesgo | Mitigación |
|---|---|
| Pausa de Supabase gratis por inactividad | Cron diario de Vercel ya implementado (`/api/mantener-activo`) y respaldo semanal construido |
| Variables y despliegue en Vercel | `SUPABASE_SERVICE_ROLE_KEY` es tipo Sensitive (no se vuelve a ver); cada cambio de variable exige Redeploy; ejecutar las migraciones SQL **antes** de usar el despliegue que las necesita |
| Migraciones aplicadas al proyecto equivocado de Supabase | Verificar que el SQL Editor esté en el proyecto de la URL de `.env.local` |
| Interés sobre interés y 4% mensual pueden chocar con la tasa de usura en Colombia | Dejar la regla parametrizable; consultar a los directivos (es una decisión de reglamento, no técnica) |
| Reglas ambiguas del estatuto | Lista de puntos por confirmar en `Especificaciones de uso.md` §11 |
| Plazo de 1 mes | Entregar por fases (ver §8) |

## 8. Plan por fases (≈ 4 semanas)
1. **Semana 1** ✅: proyecto Next.js + Supabase, esquema, RLS, login, roles, diseño base.
2. **Semana 2** ✅ (excepto Excel): cuotas/aportes, estado de cuenta, captura NU con conciliación. Falta migrar el Excel.
3. **Semana 3** ✅: préstamos (solicitud, cola, votación, intereses, mora, abonos), asistencia/multas/juegos.
4. **Extra (sesión 7)** ✅: pagos con comprobante, confirmación del receptor, cuenta de pagos, cron anti-pausa.
5. **Sesión 8** ✅: calendario real y Perfil completo, correos y recordatorios (Resend), cobro de intereses (avisos + resumen para directivos + "Por cobrar"), reportes PDF (estado de cuenta y cartera), carga inicial (aportes y 6 préstamos del Excel), rediseño estilo Revolut (Inicio, barra inferior, tarjeta del préstamo, botones de archivo), pagos de préstamo con comprobante y flujo "¿Qué deseas pagar?".
6. **Sesiones 9–10** ✅: panel admin estilo usuario, cierre de ciclo con liquidación y PDF, tutorial guiado, interés mensual por día de desembolso, 4x1000, push + bandeja de avisos, identidad «Brote F» (paleta verde/ámbar), PWA instalable con splash de iPhone, foto de perfil y Recuerdos.
7. **Pendiente**: respaldo periódico de la base, avisos de cierre de ciclo y acción «cerrar ciclo», pruebas de punta a punta con datos reales.

## 9. Entornos
- Local → Producción en **fondofamiliar.nitro2tech.com** (Vercel, Root Directory = `fondo-familiar`; despliega con cada push a `main`). Repo GitHub `nitro2technology-rgb/fondofamliar` (raíz = carpeta del proyecto; la app está en `fondo-familiar/`). Resend configurado (dominio `nitro2tech.com` verificado; variables `RESEND_API_KEY`, opcional `CORREO_REMITENTE` y `APP_URL`).
- Especificaciones y bitácora viven en `Instrucciones/`.

## 10. Migraciones SQL (`fondo-familiar/supabase/migrations/`)
| N.º | Contenido |
|---|---|
| 0001 | Esquema base, RLS y auditoría |
| 0002 | Perfil automático al crear usuario |
| 0003 | Celular y primer ingreso |
| 0004 | Reuniones, `generar_cuotas()`, bucket `capturas-nu` |
| 0005 | Préstamos: caja, cola, votación, índices |
| 0006 | Entregas de cadena (en desuso), `multas.pagada_en`, `saldo_calculado` |
| 0007 | `pagos_reportados`, bucket `comprobantes-pago`, índice único de multas, borrar capturas NU |
| 0008 | `perfiles.cuenta_pago`, `beneficiario_cadena()` |
| 0009 | `saldo_calculado` sin cadena |
| 0010 | `pagos_reportados.subido_por` |
| 0011 | Carga inicial: aportes inicial y tecnológico de los 19 y los 6 préstamos vigentes del Excel (se ejecuta una sola vez) |
| 0012 | `pagos_prestamo` (interés, mora y capital con comprobante) y `aprobar_pago_prestamo()` (crea los movimientos y cierra el préstamo si el capital llega a 0) |
| 0013 | Elimina `entregas_cadena` |
| 0014 | `perfiles.tutorial_asociado` / `tutorial_admin` |
| 0015 | `prestamos.cobrar_4x1000`, movimiento `reembolso_4x1000`, `pagos_prestamo.monto_4x1000`, `aprobar_pago_prestamo()` y `saldo_calculado()` actualizados, `push_suscripciones` |
| 0016 | `perfiles.foto_ruta`, buckets `fotos-perfil` y `recuerdos`, tabla `recuerdos` con RLS y límite de 5 |
| 0017 | Tabla `avisos` (bandeja de avisos con RLS) |
| 0018 | Bucket privado `respaldos` (respaldo semanal de la base) |
| 0019 | Parámetro `ciclo_cerrado` (interruptor de cierre de ciclo) |

## 11. Rutas principales
- Asociado: `/` (Inicio), `/pagos`, `/recibos` (solo con turno), `/prestamos`, `/calendario`, `/recuerdos` y `/recuerdos/[id]`, `/avisos`, `/perfil`, `/primer-ingreso`, `/completar-cuenta`, `/login`, `/elegir-panel`.
- Admin: `/admin`, `/admin/pagos`, `/admin/prestamos`, `/admin/cuotas` (consulta), `/admin/asistencia`, `/admin/multas`, `/admin/aportes`, `/admin/capturas`, `/admin/asociados`, `/admin/exportar` (CSV).
- PDF: `/estado-cuenta` (cada asociado el suyo; admin con `?id=`), `/admin/cartera-pdf`.
- API (crons diarios, protegidos con `CRON_SECRET`): `/api/mantener-activo`, `/api/recordatorios` (cuotas e intereses de préstamos: 3 días antes, el día, y mora al día siguiente y cada 7 días; avisos de liquidación a 30, 7 y 1 día). Rutas admin nuevas: `/admin/respaldo` (descarga) y cierre/reapertura de ciclo en `/admin/cierre`.
- Correos (`lib/correo.ts`, Resend por API HTTP): se omiten los correos provisionales `socioN@fondofamiliar...`.
- Avisos (`lib/push.ts`): `enviarPush` guarda el aviso en la bandeja y lo envía por push a quien activó las notificaciones.
