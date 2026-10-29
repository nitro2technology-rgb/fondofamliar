# Especificaciones técnicas — Fondo de Ahorro Familiar

> Estado: v2 (cierre de la sesión 7, 2026-10-29; Semanas 1–3 construidas más pagos con comprobante). Plazo objetivo: 1 mes desde 2026-10-27 (≈ 2026-11-27). Costo objetivo: $0 (planes gratuitos).

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
| Archivos | Supabase Storage (buckets privados) | `capturas-nu` (solo admin) y `comprobantes-pago` (carpeta por asociado; admin lee todo). Las imágenes se comprimen en el navegador (JPEG, máx. 2000 px); límite de acción 4 MB |
| Correo | Resend (plan gratuito) o SMTP de Supabase | Avisos |
| Tareas programadas | **Vercel Cron** (`vercel.json`) | Ya activo: `/api/mantener-activo` diario (consulta mínima para que Supabase no se pause; protegido con `CRON_SECRET` opcional). Pendiente: recordatorios y avisos |

Limitaciones del plan gratuito a vigilar: Supabase pausa proyectos inactivos (7 días sin uso → mantener un cron de actividad) y no incluye respaldos diarios (hacer exportación propia periódica).

## 3. Modelo de datos (preliminar)
- `perfiles` (id = auth.users, nombre, correo, rol: asociado|tesorero|contador|fiscal, ciudad, celular, cuenta_pago, primer_ingreso_completo, activo)
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
- `pagos_reportados` (cuota_id, asociado_id, tipo: fondo|cadena, monto, ruta_archivo, estado: pendiente|aprobado|rechazado, nota, subido_por, revisado_por, revisado_en; único por cuota+tipo)
- `entregas_cadena` (turno, monto, fecha_entrega): **en desuso** desde que la cadena se paga directo; la tabla queda sin usar
- `notificaciones` (destinatario, tipo, enviada_en) — pendiente

Funciones SQL: `es_admin()`, `generar_cuotas()`, `caja_disponible()`, `posicion_cola()`, `saldo_calculado(hasta)` (solo admins; ya sin cadena), `beneficiario_cadena(periodo)` (nombre y cuenta de quien tiene el turno, solo a quien tiene cuota ese mes o a un admin). Trigger que decide la votación con 2 votos iguales; índice único de multa por (reunión, asociado); índice único de un préstamo en curso por asociado.

Reglas de integridad: montos en pesos enteros (COP, sin decimales); movimientos nunca se editan ni borran (se corrigen con contramovimiento); toda escritura financiera pasa por funciones/RPC con auditoría.

## 4. Lógica de negocio crítica
- **Validación de préstamo**: asociado al día, sin préstamo vigente, tope $1.000.000 acumulado (asociado + externo).
- **Cola**: por `radicado_en`; se atiende según caja disponible (saldo calculado).
- **Votación**: solo los 3 administradores; aprobado con 2 de 3 votos.
- **Interés**: cuota fija = 4% × capital inicial, causada cada mes (cron) mientras haya saldo de capital; no cambia con los abonos; sin fecha de vencimiento.
- **Mora**: fecha límite = fecha de la reunión; desde día +1 interés sobre interés (fórmula por confirmar; riesgo legal §7).
- **Cadena**: el asociado con turno del mes no paga su parte de cadena ese mes (cuota con `cadena = 0`); monto recibido = (19 − 1) × $40.000, parametrizable. Se paga directo al receptor: no entra a la cuenta NU.
- **Pagos con comprobante**: `reportarPago` (asociado), `subirComprobanteAdmin` (admin, cliente de servicio por la política de almacenamiento), `revisarPago` (admin) y `confirmarRecepcion` (receptor del turno, validado en servidor con service role). `sincronizarCuota` marca la cuota pagada cuando el pago fondo (y cadena si aplica) están aprobados, o la devuelve a pendiente al deshacer. No existe marcado manual de cuotas.
- **Conciliación**: `saldo_calculado` = ahorro + juegos de cuotas pagadas + aportes únicos + intereses/mora/abonos + multas pagadas − desembolsos − premios de juegos; se compara con el saldo declarado de la captura NU del mes.
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
- Respaldos: exportación semanal (script/cron a almacenamiento privado).
- Accesibilidad básica (contraste en tema oscuro, tamaños táctiles).

## 7. Riesgos y decisiones abiertas
| Riesgo | Mitigación |
|---|---|
| Pausa de Supabase gratis por inactividad | Cron diario de Vercel ya implementado (`/api/mantener-activo`); falta exportación periódica de respaldo |
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
5. **Semana 4 (pendiente)**: calendario real, correos y recordatorios (Resend), reportes/PDF por asociado, cierre de ciclo (liquidación), Perfil completo, exportación de respaldo, pruebas de punta a punta.

## 9. Entornos
- Local → Producción en **fondofamiliar.nitro2tech.com** (Vercel, Root Directory = `fondo-familiar`; despliega con cada push a `main`). Repo GitHub `nitro2technology-rgb/fondofamliar` (raíz = carpeta del proyecto; la app está en `fondo-familiar/`). Resend aún sin configurar.
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
| 0010 | `pagos_reportados.subido_por` (**pendiente de ejecutar**) |

## 11. Rutas principales
- Asociado: `/` (Inicio), `/pagos`, `/recibos` (solo con turno), `/prestamos`, `/calendario`, `/perfil`, `/primer-ingreso`, `/completar-cuenta`, `/login`, `/elegir-panel`.
- Admin: `/admin`, `/admin/pagos`, `/admin/prestamos`, `/admin/cuotas` (consulta), `/admin/asistencia`, `/admin/multas`, `/admin/aportes`, `/admin/capturas`, `/admin/asociados`, `/admin/exportar` (CSV).
- API: `/api/mantener-activo` (cron).
