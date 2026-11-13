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

## Sesión 4 (cierre) — Despliegue en producción
**Hecho**
- Repo GitHub `nitro2technology-rgb/fondofamliar` (raíz = carpeta `Fondo famliar`, la app está en `fondo-familiar/`).
- Vercel: Root Directory = `fondo-familiar`, Framework = Next.js, dominio `fondofamiliar.nitro2tech.com`. **Login funcionando en producción.**
- Variables en Vercel: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` tipo Config; `SUPABASE_SERVICE_ROLE_KEY` tipo Sensitive (solo servidor).

**Notas**
- Si Vercel muestra 404 tras un deploy "Ready": revisar Root Directory, que el deploy sea Production/Current y el dominio asignado.
- Las variables nuevas requieren Redeploy para aplicarse.

**Próximo paso**
- Panel admin: crear los 19 usuarios (service role en servidor) y cargar turnos de cadena; luego Semana 2 (cuotas, estado de cuenta real, Excel, captura NU).

## Sesión 5 — Primer ingreso por celular y panel de asociados
**Decisiones**
- Primer ingreso solo con celular (sin contraseña): botón "Primer ingreso" en el login -> celular -> "Hola, <nombre>" -> la persona escribe su correo real y crea contraseña -> desde ahí entra con correo + contraseña. Se aceptó el riesgo (hay confianza en el fondo).
- Las cuentas se crean con un correo interno provisional (`socio<turno>@fondofamiliar.nitro2tech.com`) y contraseña aleatoria que nadie conoce; el celular identifica a la persona hasta completar la cuenta.
- Celular y ciudad editables en el panel de administración (`/admin/asociados`); allí también "Permitir nuevo primer ingreso" (si alguien olvida su contraseña).

**Hecho (código)**
- Migración `0003_celular_primer_ingreso.sql` (columnas `celular` y `primer_ingreso_completo`).
- Páginas `/primer-ingreso`, `/completar-cuenta`, `/admin/asociados`; acciones en `lib/acciones.ts`; `lib/supabase/admin.ts` (service role, solo servidor); `proxy.ts` permite rutas públicas `/login` y `/primer-ingreso`.
- Excel `Instrucciones/Listado general/Asociados - celulares.xlsx` (excluido de git): 17 de 19 celulares; faltan Freddy Yamá y Gianni Obando (se agregan en el panel).
- Script de carga (fuera del repo) listo para crear los 19 usuarios + `cadena_turnos`.

**Pendiente**
1. Usuario ejecuta `0003` en el SQL Editor de Supabase.
2. Ejecutar el script de carga (crea 19 usuarios, perfiles con rol/ciudad/celular y los 19 turnos de la cadena).
3. Subir a GitHub (deploy en Vercel) y probar Primer ingreso en producción.
3. Agregar celulares de Freddy y Gianni en `/admin/asociados`.
5. Nota: la cuenta de administrador previa del usuario (correo propio) ya no se necesita; Nicolás entra por Primer ingreso como fiscal.

## Sesión 5 (cierre) — Primer ingreso funcionando en producción
**Hecho**
- Cargados los 19 usuarios, perfiles (rol, ciudad, celular) y los 19 turnos de la cadena en Supabase.
- Primer ingreso por celular funcionando en `fondofamiliar.nitro2tech.com`.

**Lecciones (despliegue)**
- `SUPABASE_SERVICE_ROLE_KEY` en Vercel es tipo Sensitive: el valor nunca se vuelve a mostrar (el candado es normal). Si falla, borrar la variable y recrearla pegando el valor directo desde `.env.local` (sin comillas ni espacios) y hacer Redeploy.
- Con la clave pública en lugar de la secreta, las consultas devuelven vacío sin error ("celular no registrado"). Con la clave mal pegada devuelven error ("Error del servidor al verificar tu celular").
- Cada cambio de variable requiere un Redeploy.
- `acciones.ts` incluye diagnóstico de clave de servidor (mensaje claro si la clave no es de administrador); ya está subido.

**Pendiente**
1. Agregar celulares de Freddy Yamá y Gianni Obando en `/admin/asociados`.
2. Avisar a los 19 que activen su cuenta con "Primer ingreso".
3. Siguiente fase (Semana 2): cuotas/aportes con registro por tesorero y contador, estado de cuenta real en Inicio, migración del Excel del fondo, captura mensual de la cuenta NU.

## Sesión 6 — Semana 2 (cuotas, estado de cuenta, captura NU)
**Hecho (código, sin subir aún)**
- Migración `0004_cuotas_y_capturas.sql`: crea las reuniones desde la cadena, función `generar_cuotas()` (19 meses × 19 asociados; el mes de su turno la cadena queda en 0, `select generar_cuotas()` ya se ejecuta al final) y bucket privado `capturas-nu` con políticas solo admin.
- Inicio con datos reales (`lib/cuentas.ts`): cuota pendiente/en mora (vence = día de reunión), ahorro acumulado, turno de cadena, próxima reunión, multas. Préstamo/caja siguen en mock (Semana 3).
- Admin: `/admin/cuotas` (registrar/deshacer pago por mes), `/admin/aportes` (inicial y tecnológico), `/admin/capturas` (subir captura NU + saldo declarado).

**Supuestos a confirmar**
- Ahorro acumulado = ahorro de cuotas pagadas + aporte inicial.
- "En mora" se calcula al vuelo (cuota impaga con reunión ya pasada); el cobro de interés de mora es de Semana 3.

**Pendiente**
1. Usuario ejecuta `0004` en el SQL Editor y sube a GitHub.
2. Probar: registrar un pago en `/admin/cuotas` y verlo en Inicio.
3. Excel del fondo (migración de pagos históricos), exportar estado de cuenta, conciliación NU vs. saldo calculado.
4. Semana 3: préstamos, votación, intereses, mora, multas/asistencia.

## Sesión 6 (cont.) — Semana 3: préstamos
**Hecho (código)**
- Migración `0005_prestamos.sql`: `caja_disponible()`, `posicion_cola()`, trigger que decide la votación con 2 votos iguales, votos inmutables, índice único (un préstamo en curso por asociado).
- `lib/prestamos.ts`: capital, interés fijo 4% sobre capital inicial (vence cada reunión posterior al desembolso), mora provisional.
- Asociado: `/prestamos` (solicitar con externo opcional, posición en cola, saldo, movimientos, historial). Inicio ahora usa préstamo/caja reales y muestra "Mis cuotas" (historial mes a mes).
- Admin: `/admin/prestamos` (votar aprobar/rechazar, desembolsar, registrar interés/mora/capital; al abonar todo el capital pasa a "pagado").

**Supuestos**
- Caja prestable = ahorro de cuotas pagadas + aporte inicial + intereses y abonos − desembolsos − aprobados sin desembolsar. Cadena y juegos no se prestan.
- Se puede radicar aunque no haya caja (queda en cola); el desembolso exige caja >= 0.
- Solo se radica estando al día (cuotas vencidas y multas).

**Pendiente**
1. Usuario ejecuta `0005` en Supabase y sube a GitHub.
2. Semana 3 restante: asistencia, multas y juegos; pago de la cadena al receptor del turno; conciliación NU.
3. Pendiente confirmar fórmula de mora.

## Sesión 6 (cont.) — Semana 3: asistencia, multas y juegos
**Hecho (código, sin migración nueva; usa tablas de 0001)**
- `/admin/asistencia`: elegir reunión, marcar puntual/tarde/ausente/justificada por asociado. Al guardar se generan multas: tarde = $5.000; ausente = $8.000 solo si la ciudad es Pasto (las ya pagadas no se tocan; las impagas de esa reunión se regeneran).
- Juegos en la misma pantalla: recaudo sugerido = suma de la parte de juegos de las cuotas pagadas del mes (editable); 50% premios / 50% utilidad.
- `/admin/multas`: lista, total pendiente, marcar pagada/deshacer. El Inicio del asociado ya suma sus multas pendientes y le bloquea nuevos préstamos.

**Supuestos**
- "Sin juegos de esa reunión" para ausentes no se descuenta del recaudo automáticamente (el admin ajusta el monto).
- Ausencias de residentes fuera de Pasto no generan multa.

**Pendiente**
1. Subir a GitHub y probar. Falta pagar la cadena al receptor del turno y la conciliación NU (necesita el saldo calculado completo).
2. Semana 4: calendario real, correos/recordatorios, reportes PDF, pruebas.
3. Confirmar fórmula de mora y, con el Excel, migrar datos históricos.

## Sesión 6 (cont.) — Cadena y conciliación NU (cierra Semana 3)
**Hecho (código)**
- Migración `0006_cadena_conciliacion.sql`: tabla `entregas_cadena`, columna `multas.pagada_en`, función `saldo_calculado(hasta)` (solo admins).
- `/admin/cadena`: recaudo de cadena por turno y "Registrar entrega" al receptor.
- `/admin/capturas`: cada captura muestra saldo NU vs saldo de la app a fin de mes y "Cuadra" / diferencia.

**Fórmula del saldo de la app**: cuotas pagadas (ahorro+cadena+juegos) + aportes únicos + intereses/mora/abonos + multas pagadas − desembolsos − entregas de cadena − premios de juegos (se asume que se pagan en la reunión).

**Pendiente**
1. Ejecutar `0006` en Supabase y subir a GitHub.
2. Semana 4: calendario real, correos/recordatorios (Resend), reportes PDF, pruebas, cierre de ciclo.

## (Histórico) Estado al cierre de la sesión 6 — superado por el ESTADO ACTUAL del final
**Semanas 1–3 completas en código y subidas a GitHub** (último commit `38a678d`). Producción: `fondofamiliar.nitro2tech.com` (Vercel despliega al hacer push).

**Migraciones SQL (carpeta `fondo-familiar/supabase/migrations/`)**
- 0001–0005: ejecutadas en Supabase por el usuario (0004 confirmado; 0005 se pidió correr).
- **0006: pendiente de ejecutar** (entregas de cadena, `multas.pagada_en`, `saldo_calculado`). Sin ella fallan `/admin/cadena` y la conciliación en `/admin/capturas`.

**Pantallas del asociado**: Inicio (préstamo/caja reales, resumen, "Mis cuotas"), Préstamos (solicitar, cola, saldo, movimientos), Calendario y Perfil (aún maqueta/mock), Primer ingreso, Completar cuenta.
**Pantallas admin** (`/admin`): Préstamos (votar, desembolsar, interés/mora/capital), Cuotas, Cadena, Asistencia y juegos, Multas, Aportes únicos, Captura NU (con conciliación), Asociados, Descargar cuotas (CSV).

**Cada asociado solo ve lo suyo**: los pagos registrados a otra persona se ven en `/admin/cuotas`, no en el Inicio del admin.

**Supuestos pendientes de confirmar con los directivos**
1. Mora: 4% mensual sobre cada interés vencido y no pagado, por cada reunión transcurrida (provisional, `lib/prestamos.ts`).
2. Ahorro acumulado = ahorro de cuotas pagadas + aporte inicial.
3. Caja prestable = ahorro pagado + aporte inicial + intereses/abonos − desembolsos − aprobados sin desembolsar (cadena y juegos no se prestan).
4. Premios de juegos se pagan en la reunión; ausentes no pagan multa si no viven en Pasto; ausentes no descuentan su parte del recaudo de juegos.
5. Posible choque del 4% mensual con la tasa de usura (decisión del reglamento).

**Pendiente (orden sugerido)**
1. Usuario: ejecutar 0006 (y confirmar 0005) en el SQL Editor; probar el flujo completo: pago de cuota → Inicio, solicitud → votación 2/3 → desembolso → interés/abono, asistencia → multa, cadena, captura NU.
2. Usuario: entregar el Excel del fondo (migrar pagos históricos) y avisar a los 19 asociados que activen su cuenta con "Primer ingreso" cuando todo esté listo.
3. **Semana 4**: Calendario real (cuotas, reuniones, turno de cadena, vencimientos); correos y recordatorios con Resend (confirmar que el dominio esté verificado) y crons; reportes/PDF por asociado; cierre de ciclo (liquidación, utilidades en partes iguales entre los 19); pruebas; Perfil real.
4. Notas técnicas: en Windows el `git push` a veces tarda >2 min (reintentar); el usuario ya aprobó commit/push directo en esta sesión.

## Sesión 7 — Pagos con comprobante, asistencia ágil, capturas editables
**Hecho (código, sin subir aún; compila y pasa lint)**
- Migración `0007_pagos_reportados.sql`: tabla `pagos_reportados` (tipo fondo/cadena, estado pendiente/aprobado/rechazado), bucket privado `comprobantes-pago`, índice único de multa por (reunión, asociado), política para borrar capturas NU.
- Asociado: `/pagos` ("Registrar pago y captura", botón en Inicio): sube comprobante del pago al fondo (ahorro+juegos) y de la cadena (a quien tiene el turno); puede reemplazarlo si lo rechazan.
- Admin: `/admin/pagos` (por mes, lista de quién envió, Ver/Aprobar/Rechazar/Deshacer). Cuando fondo (+ cadena si aplica) están aprobados, la cuota pasa a "pagada" sola.
- Asistencia: todos arrancan "Puntual"; botones Puntual/Tarde/Ausente/Excusa; guardado optimista, botón deshabilitado, idempotente (no duplica multas).
- Capturas NU: editar saldo/imagen, eliminar, visor flotante con X, compresión automática (JPEG, máx. 2000 px). Misma compresión en comprobantes de pago.
- `BotonEnvio` (anti doble clic) en cuotas, multas, cadena y juegos.

**Pendiente**
1. Ejecutar `0007` en Supabase (proyecto correcto) y subir a GitHub.
2. Decidir contabilidad de la cadena: si se paga directo al receptor, no pasa por la cuenta NU y `saldo_calculado` (0006) debe dejar de contarla.

## Sesión 7 (cont.) — Cuenta de pagos y cron anti-pausa
**Hecho (código)**
- Migración `0008_cuenta_pago.sql`: `perfiles.cuenta_pago` y función `beneficiario_cadena(periodo)` (entrega nombre y cuenta de quien tiene el turno solo a quien tiene cuota ese mes o a un admin).
- "Completar cuenta" pide "Cuenta o llave para que te hagan los pagos"; editable en Perfil y por admins en `/admin/asociados`; banner en Inicio si falta. `/pagos` muestra la cuenta del beneficiario en la tarjeta de cadena.
- Cron diario `vercel.json` -> `/api/mantener-activo` (consulta mínima a Supabase para que no se pause). Opcional: variable `CRON_SECRET` en Vercel (si existe, el endpoint la exige).

**Pendiente**
1. Ejecutar `0007` y `0008` en Supabase ANTES de usar el despliegue (sin `0008` falla "Completar cuenta" y el guardado de asociados).
2. Los 19 deben registrar su cuenta (Perfil). Definir control de entrega de cadena (propuesta pendiente de decisión) y ajustar `saldo_calculado` si la cadena va directa al receptor.

## Sesión 7 (cont.) — Cadena directa y confirmación del receptor (sin subir aún)
**Decisiones**
- La cadena se paga directo a quien tiene el turno (comprobantes también van al grupo de WhatsApp). Ya no pasa por la cuenta NU.
- El pago de cadena queda confirmado por UNA de las partes: el receptor ("Recibí") o un admin ("Aprobar"). El pago al fondo lo aprueba solo un admin. Cuando ambos están aprobados, la cuota pasa a pagada.
- El receptor ve `/recibos` desde el día 1 de su mes hasta confirmar todos; al completar, la ventana desaparece (los admins la siguen viendo). Ventana emergente al entrar si le faltan por confirmar (una vez por sesión del navegador).

**Hecho (código)**
- Migración `0009_cadena_directa.sql`: `saldo_calculado` ya no cuenta la cadena ni las entregas. Se eliminó `/admin/cadena` y sus acciones (tabla `entregas_cadena` queda sin uso).
- `/recibos` (receptor), `lib/recibos.ts`, acción `confirmarRecepcion`, `AvisoConfirmar`, botón "Pagar y subir comprobantes" arriba en Inicio, "Pagos del mes" destacado en Admin con contador, "Copiar lista de pendientes" (texto para WhatsApp) y "Confirmado por X" en `/admin/pagos`.

**Pendiente**: ejecutar `0009` en Supabase, commit y push.

## Sesión 7 (cierre) — Sin comprobante no hay confirmación
**Decisión**: una cuota solo queda pagada con comprobante aprobado (fondo, y cadena si aplica). Se quitó el registro manual de pagos en `/admin/cuotas` (ahora es solo consulta). Si un asociado no sabe subirlo, el admin lo sube por él en `/admin/pagos` ("Subir comprobante de fondo/cadena"); queda anotado "Comprobante cargado por X".
- Migración `0010_comprobante_cargado_por.sql` (`pagos_reportados.subido_por`).
- Errores claros al subir: falta imagen, archivo no es imagen, imagen muy pesada; ayuda "¿No logras subirlo? Envíaselo a un administrador".
- Para el receptor, una cuota pagada sin comprobante NO cuenta como confirmada.
- Migraciones ejecutadas por el usuario: 0007, 0008, 0009. **Falta 0010.** Al migrar el Excel histórico habrá que cargar esos pagos sin comprobante de otra forma.

## (Histórico) Estado al cierre de la sesión 7 — superado por la sesión 8

**Producción**: `fondofamiliar.nitro2tech.com` (Vercel despliega con cada push a `main`). Último commit subido: `5d7e4d3`. Las especificaciones de uso y técnicas (v2) están al día con todo lo construido.

**Qué hay construido**
- Semanas 1–3 completas: login (primer ingreso por celular), cuotas, estado de cuenta, aportes únicos, captura NU con conciliación, préstamos (cola, votación 2/3, desembolso, interés fijo 4%, mora provisional), asistencia (todos "puntual" por defecto), multas, juegos.
- Sesión 7: pagos con comprobante (fondo y cadena), aprobación de admins, confirmación del receptor de la cadena (`/recibos` + ventana emergente), cuenta o llave para recibir pagos, capturas NU editables con visor flotante y compresión, botones anti doble clic, cron diario anti-pausa de Supabase, "Copiar lista de pendientes" para WhatsApp.
- Reglas vigentes: la cadena se paga directo al receptor (fuera de la cuenta NU); una cuota solo queda pagada con comprobantes aprobados (fondo + cadena si aplica); el pago de cadena lo confirma el receptor **o** un admin; si alguien no sabe subir, el admin carga el comprobante; `/admin/cuotas` es solo consulta.

**Migraciones SQL**: 0001–0010 ejecutadas por el usuario (0010 confirmada al cierre de la sesión 7).

**Pendiente — usuario (antes de seguir)**
1. Variable `CRON_SECRET` en Vercel (texto largo aleatorio) + Redeploy, para proteger el cron `/api/mantener-activo` (opcional pero recomendado).
2. Probar de punta a punta en producción: subir comprobantes como asociado → aprobar en `/admin/pagos` → confirmar como receptor en `/recibos` → ver la cuota pagada en Inicio; asistencia/multas; captura NU y conciliación; préstamo completo (solicitud → votos → desembolso → interés/abono). Revertir a mano en el SQL Editor lo que sea de prueba (cuotas marcadas a mano antes quedan pagadas sin comprobante).
4. Agregar celulares de Freddy Yamá y Gianni Obando en `/admin/asociados`; pedir a los 19 que activen su cuenta con "Primer ingreso" y registren su cuenta o llave de pagos.
4. Entregar el Excel del fondo (migración de pagos históricos; esos meses no tendrán comprobantes, hay que decidir cómo cargarlos).
5. Confirmar con los directivos: fórmula de mora (provisional, 4% mensual sobre cada interés vencido y no pagado), definición de ahorro acumulado y caja prestable, premios de juegos pagados en la reunión, multa de ausencia solo en Pasto, y el riesgo de usura del 4% mensual.

**Pendiente — desarrollo (Semana 4, orden sugerido)**
1. Calendario real (cuotas, reuniones, turno de cadena, vencimientos) y Perfil completo (hoy Calendario es maqueta).
2. Correos y recordatorios con Resend (verificar dominio) + crons: cuota próxima/mora, nuevas solicitudes de préstamo, recordatorio de reunión.
3. Cobro automático de interés de mora y causación mensual de intereses si se decide automatizar (hoy el admin registra pagos).
4. Reportes: estado de cuenta en PDF por asociado, cartera vigente y en mora, historial.
5. Cierre de ciclo: reunión de liquidación (último turno 12-may-2028), bloqueo mientras haya préstamos vigentes, liquidación por asociado = ahorro + utilidades ÷ 19.
6. Respaldo: exportación periódica de la base (Supabase gratis no trae respaldos diarios).
7. Limpieza: la tabla `entregas_cadena` quedó en desuso; las pruebas end-to-end y pulido móvil/PWA (instalable).

**Notas técnicas**
- La app está en `fondo-familiar/` (Next.js 16, `cacheComponents`, `proxy.ts`); las especificaciones y esta bitácora en `Instrucciones/`. En Windows el `git push` a veces tarda >2 min (reintentar). Los archivos del repo usan CRLF en parte; al editar con scripts conservar los saltos de línea.
- Si falla algo tras un deploy: ¿se ejecutó la migración correspondiente en el proyecto correcto de Supabase? ¿Se hizo Redeploy tras cambiar variables?
- Commits: terminan con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. El usuario pide el commit/push explícitamente cada vez.


## Sesión 8 (2026-11-11) — Semana 4 casi completa (superado: leer «ESTADO ACTUAL» al final del archivo)

**Hecho (todo en producción salvo lo marcado)**
- Calendario real (`/calendario`) y Perfil completo (celular, ciudad, turno).
- Correos con Resend (`lib/correo.ts`): recordatorios de cuota, aviso a directivos de nuevas solicitudes y de pagos de préstamo. Probado el envío (dominio verificado, clave válida).
- Cobro de intereses: `/api/recordatorios` avisa al deudor (3 días antes, el día y mora semanal), resumen a directivos el día de la reunión, bloque "Por cobrar" en `/admin/prestamos`. La mora es estimada (fórmula provisional) y el pago lo sigue registrando/aprobando un admin.
- Reportes PDF (`pdf-lib`): `/estado-cuenta` y `/admin/cartera-pdf`.
- Carga inicial `0011` ejecutada: 38 aportes (inicial y tecnológico) y 6 préstamos vigentes del Excel `Creditos Fondo.xlsx` ($1.800.000; el 4x1000 lo asume el usuario). La solicitud de prueba quedó como `rechazado`.
- Rediseño estilo Revolut (carpeta `Instrucciones/Diseño`): degradado y cifra grande en Inicio, botones circulares de acción, barra inferior plana con etiquetas, tarjetas oscuras muy redondeadas, botones blancos en píldora, tarjeta del préstamo con aspecto de tarjeta física (`components/TarjetaPrestamo.tsx`), botón "Seleccionar archivo" global (CSS).
- Pagos de préstamo (`0012` ejecutada): `/pagos` ahora pregunta "¿Qué deseas pagar?" (Cuota o Préstamo). Cuota: solo la inmediata con su fecha + resumen de pagadas y por pagar. Préstamo: interés del mes, abono a capital o pago total, con comprobante; el admin aprueba en `/admin/pagos` (no se deshace). Botón "Abonar o pagar interés" en `/prestamos`.

**Reglas confirmadas esta sesión**
- Un solo préstamo en curso por asociado (estatuto): para pedir otro hay que cancelar el anterior por completo.
- El interés se paga cada reunión hasta cancelar todo el capital; se puede abonar a capital cuando se quiera, por cualquier valor.
- El aporte tecnológico ($20.000) y el inicial ($100.000) ya los pagaron los 19.

**Pendiente — usuario**
1. Ejecutar el SQL de limpieza de pruebas (cuotas de noviembre marcadas pagadas de Nicolás, Camilo y Andrés; multa y asistencia de prueba; entrega de cadena de prueba). Ver el SQL en la conversación o rehacerlo: cuotas `pagada` de 2026-11-01 -> `pendiente`; borrar la multa de $5.000, la asistencia `tarde` de la reunión 255c3aae... y `entregas_cadena`.
2. En Vercel: `RESEND_API_KEY` (y `CRON_SECRET`) + Redeploy.
3. Avisar a los 19 que activen su cuenta con "Primer ingreso" y registren su cuenta de pagos (hasta entonces nadie recibe correos: tienen correo provisional).
4. Subir la captura NU de octubre (la conciliación debe dar $480.000 = $2.280.000 de aportes menos $1.800.000 desembolsados).
5. Confirmar con los directivos: fórmula de mora, definición de ahorro acumulado y caja prestable, premios de juegos, multa de ausencia solo en Pasto, riesgo de usura del 4% y si se permite más de un préstamo a la vez.

**Pendiente — desarrollo**
1. Rediseño del panel de administración (el usuario lo pidió; falta definir qué cambiar).
2. Extender el estilo nuevo (títulos grandes, botones en píldora) a las pantallas internas y a admin.
3. Cierre de ciclo: reunión de liquidación (12-may-2028), bloqueo con préstamos vigentes, liquidación = ahorro + utilidades ÷ 19.
4. Respaldo periódico de la base (Supabase gratis no trae respaldos diarios).
5. Mensaje en `/prestamos` ya explica el límite de un préstamo; pendiente PWA instalable, splash con logo y pruebas de punta a punta.
6. Limpieza: tabla `entregas_cadena` en desuso.

**Notas técnicas**
- Si el shell falla con heredocs largos, escribir los archivos con la herramienta de escritura. Consultas con relaciones de PostgREST: usar el nombre de la FK (`perfiles!cuotas_asociado_id_fkey`, `perfiles!prestamos_asociado_id_fkey`) porque hay varias FK a `perfiles`.
- `votos_prestamo` y `movimientos_prestamo` son de solo inserción (trigger `bloquear_cambios`): no se borran; se corrigen con estados o contramovimientos.
- Commits terminan con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Sesión 9 (2026-11-12) — Panel admin estilo usuario y cierre de ciclo (sin subir aún; compila y pasa lint)
**Hecho**
- Panel admin rediseñado igual al del asociado: barra inferior (Resumen · Pagos · Préstamos · Más), degradado, cifra grande "Disponible para prestar", botones circulares, "Siguiente en recibir" (cadena), tarjeta de préstamos activos + lista por deudor. Menú restante en `/admin/mas`. Archivos: `components/AdminNav.tsx`, `admin/layout.tsx`, `admin/page.tsx`, `admin/mas`, `lib/fondo.ts`.
- Cierre de ciclo: `/admin/cierre` (deudas por cancelar, utilidades = intereses + mora + multas pagadas + utilidad de juegos, liquidación por asociado = ahorro + utilidades ÷ 19) y PDF `/admin/liquidacion-pdf`. Plazo de devolución = un minuto antes de la hora de la última reunión (7:30 p. m. -> 7:29; 7:00 -> 6:59); pasado el plazo, `reportarPagoPrestamo` rechaza nuevos pagos de préstamo (`lib/cierre.ts`).
- Migración `0013_limpiar_entregas_cadena.sql` (borra la tabla en desuso). **Falta ejecutarla.**

**Pendiente**: ejecutar 0013, commit/push, avisar a los 19, captura NU de octubre (en `/admin/capturas`), confirmar mora, respaldo periódico, PWA instalable, estilo en pantallas internas de admin.

## Sesión 9 (cont.) — Pagos, detalle de socio, préstamos, captura NU, asistencia (sin subir; compila y pasa lint)
- Componente `SelectorArchivo` (zona de carga con vista previa, cambiar/quitar) usado en todos los formularios de imagen; `Avatar` (inicial con color por nombre); `SelectorMes` (lista desplegable).
- Pagos > Préstamos: el admin puede subir el comprobante por el deudor (`subirPagoPrestamoAdmin`, queda "por revisar"). Mismo botón en el detalle del socio.
- Detalle de socio `/admin/socio/[id]`: cuotas mes a mes, aportes, multas, asistencia y cada préstamo (solicitud, desembolso, intereses/abonos/movimientos, saldo y mora). Se llega tocando el nombre en Pagos, Préstamos y Resumen.
- `/admin/prestamos`: pestañas Cola (cadena de solicitudes numerada, votos de los 3 directivos, aprobar/rechazar, aviso si no alcanza la caja, desembolso) / Vigentes / Historial.
- `/admin/capturas`: solo subir (mes en lista desplegable), historial mes a mes con miniatura, editar y eliminar; meses sin captura aparecen para subirlas. Botón "Captura NU" en el Resumen y aviso si falta la del mes anterior.
- Asistencia: muestra la multa de cada tarde/ausente, resumen del total por cobrar y sección "Multas de esta reunión" con botón Cobrar.

## Sesión 9 (cont. 2) — Cuotas informativas, bloqueo por multas, captura ligada a la reunión (sin subir)
- `/admin/cuotas`: lista desplegable de mes, resumen "x/19 han pagado" con recaudado/por recaudar, listas Faltan/Ya pagaron (cada nombre abre el detalle) y botón "Cobrar a N que deben" -> `/admin/pagos` filtrado.
- Multas: el asociado ve en Inicio una tarjeta roja con sus multas y en `/prestamos` la solicitud queda bloqueada mientras deba multas o tenga la cuota en mora (el servidor ya lo exigía). Se desbloquea cuando el admin marca la multa como cobrada. Pendiente (no hecho): impedir también el desembolso de una solicitud ya radicada si el deudor tiene multas.
- Captura NU: el mes se elige por reunión (`lib/capturas.ts`: octubre 2026 como cierre + cada mes cuya reunión ya llegó); lista desplegable para consultar; conciliación con corte al día de la reunión. Botones "Ver" y "Editar" ahora son botones (píldora), no texto subrayado.

## Sesión 9 (cont. 3) — Capturas por ronda y solicitud rápida (sin subir)
- Captura NU: el desplegable lista octubre 2026 (cierre) y TODAS las rondas del ciclo ("Ronda N · mes · reunión fecha"), se pueden subir por adelantado; las futuras no se concilian. El aviso del Resumen solo marca las rondas cuya reunión ya llegó.
- `components/SolicitudRapida.tsx`: en Inicio (y arriba en /prestamos) tarjeta "Hay $X disponible para prestar" con "Solicitar $X ahora" (el menor entre tope y caja) o "Pedir otro monto"; sin saldo permite solicitar igual y queda en cola. No aparece si ya tiene préstamo, multas o cuota en mora. Solicitud para externo quedó en un desplegable en /prestamos.

## Sesión 9 (cont. 4) — Tutorial de bienvenida (sin subir)
- `components/Tutorial.tsx` + contenido en `lib/tutorial.ts` (8 pasos para asociados, 7 para el panel admin). Se abre solo la primera vez en Inicio y en el Resumen admin; se repite desde Perfil y desde Admin -> Más ("Ver tutorial de la plataforma"). Al cerrar/omitir se guarda con `marcarTutorialVisto`.
- Migración `0014_tutorial_visto.sql` (`perfiles.tutorial_asociado` / `tutorial_admin`). **Falta ejecutarla**; mientras no exista la columna, el tutorial no se abre solo (no rompe nada). Al ejecutarla, todos los usuarios lo verán una vez.
- Para cambiar el texto del tutorial: editar `lib/tutorial.ts`.

## Sesión 9 (cont. 5) — Tutorial sobre la pantalla y primer ingreso en 2 pasos (sin subir)
- Tutorial reescrito como recorrido guiado: resalta cada elemento (atributos `data-tour` en Inicio, Resumen admin y barras inferiores) y muestra burbujas con flecha que explican qué hacer. Pasos en `lib/tutorial.ts` (campo `objetivo` = nombres `data-tour`); componente `components/Tutorial.tsx`. Se abre solo la primera vez o con `/?tutorial=1` y `/admin?tutorial=1` (botones en Perfil y Admin -> Más). Si un elemento no existe en pantalla, la burbuja sale centrada.
- `/completar-cuenta` ahora es un asistente de 2 pasos antes de entrar: (1) correo + contraseña nueva, (2) banco/billetera (Nu, Nequi, Daviplata, Bancolombia, Davivienda, Otro) y número o llave donde recibirá los pagos. Se guarda como "Nu · número" en `perfiles.cuenta_pago`.
- Flujo de un asociado nuevo: Primer ingreso (celular) -> Completar cuenta (2 pasos) -> Inicio con el recorrido guiado.

---
# ESTADO ACTUAL (cierre sesión 9, 2026-11-12) — LEER ESTO PRIMERO
**En producción** (`fondofamiliar.nitro2tech.com`, último commit de código `bc8a44d`). Migraciones 0001–0014 ejecutadas. Variables de Vercel (Supabase, Resend, CRON_SECRET) listas.

**Construido en la sesión 9**: panel admin estilo usuario (Resumen · Pagos · Préstamos · Más), Pagos con pestañas Cuota/Préstamos, filtros Deben/Pagaron y subida manual de comprobantes (también de préstamos), detalle de cada socio (`/admin/socio/[id]`), cola de préstamos con votos y desembolso, cuotas informativas con botón de cobro, captura NU por rondas (se sube por adelantado) con historial, asistencia con multas cobrables y bloqueo de préstamo por multas/mora, solicitud rápida de préstamo en Inicio, cierre de ciclo con liquidación y PDF (plazo = un minuto antes de la última reunión), selector de archivos con vista previa, tutorial guiado en pantalla (asociado y admin), primer ingreso en 2 pasos (correo+contraseña, cuenta de pagos), limpieza de `entregas_cadena`.

## Qué falta
**Usuario**
1. Probar en el celular lo nuevo: primer ingreso (2 pasos), tutorial guiado, panel admin, Pagos, cola de préstamos, captura NU.
2. Avisar a los 19 que activen su cuenta con «Primer ingreso» (hasta entonces nadie recibe correos).
3. Agregar celulares de Freddy Yamá y Gianni Obando en Más → Asociados.
4. Subir la captura NU de octubre (la conciliación debe dar $480.000) y las de cada ronda en su reunión.
5. Entregar el Excel histórico si se quiere migrar pagos de cuotas pasados (la carga 0011 solo trajo aportes únicos y 6 préstamos vigentes). Decidir cómo cargar pagos sin comprobante.
6. Confirmar con los directivos: fórmula de mora (provisional, 4 % mensual sobre cada interés vencido y no pagado), definición de ahorro acumulado y caja prestable, premios de juegos pagados en la reunión, multa de ausencia solo en Pasto, riesgo de usura del 4 % y si se permite más de un préstamo a la vez.

**Desarrollo**
1. Pruebas de punta a punta con datos reales (pago de cuota -> aprobación -> confirmación del receptor; préstamo completo; asistencia -> multa -> cobro -> desbloqueo; cierre). Revertir en SQL lo que sea de prueba.
2. PWA instalable (manifest, ícono, splash con logo).
3. Respaldo periódico de la base (Supabase gratis no trae respaldos diarios): exportación automática o script.
4. Bloquear el desembolso de una solicitud ya radicada si el deudor tiene multas pendientes (hoy solo se bloquea radicar).
5. «Registrar pago recibido» en `/admin/prestamos` no exige comprobante, a diferencia de la regla de cuotas; decidir si se deja o se elimina.
6. Rediseño pendiente (mismo estilo píldora/tarjetas) de Multas, Aportes únicos y Asociados.
7. Cierre de ciclo: hoy solo informa y genera PDF; faltan avisos por correo a deudores al acercarse la última reunión y, si se quiere, una acción de «cerrar ciclo» que bloquee nuevos préstamos.
8. Actualizar `Especificaciones de uso.md` y `Especificaciones tecnicas.md` a v3 (siguen en v2 de la sesión 7).
9. Limpieza menor: `lib/mock.ts` sin uso real; unificar saltos de línea (mezcla CRLF/LF).

**Notas técnicas nuevas**
- Páginas admin usan `requerirAdmin()` y consultas con RLS; las que necesitan cartera/vigentes usan `lib/cartera.ts` (service role, solo servidor).
- Tutorial: texto en `lib/tutorial.ts`, elementos señalados con `data-tour="..."`; se repite con `/?tutorial=1` o `/admin?tutorial=1`.
- Con `cacheComponents`, los componentes cliente que usan `usePathname`/`useSearchParams` deben ir dentro de `<Suspense>` (por eso `AdminNav` está envuelto en `admin/layout.tsx`).
- Para editar archivos con CRLF desde scripts Python usar `newline=""` y respetar el salto de línea del archivo.

## Sesión 10 (2026-11-13) — PWA y bloqueo por multas (sin subir; compila y pasa lint)
- PWA instalable: `src/app/manifest.ts`, íconos provisionales (morado con "F") en `public/icons/` y `src/app/apple-icon.png`, `appleWebApp` en el layout; el proxy deja pasar `manifest.webmanifest`. Falta: ícono/logo definitivo y splash.
- `desembolsarPrestamo` ya no desembolsa si el deudor tiene multas pendientes (el botón no avisa; pendiente mostrar aviso en la cola).
- Celulares de Freddy y Gianni ya cargados por el usuario.
- Rediseño estilo píldora/tarjetas de `/admin/multas` (Por cobrar/Cobradas, botón Cobrar), `/admin/aportes` (resumen x/19) y `/admin/asociados` (tarjeta desplegable con Avatar y progreso de cuentas activas); enlaces "← Más". Aviso rojo y botón desactivado en la cola de préstamos si el deudor tiene multas (`BotonEnvio` ahora acepta `disabled`).
- Decisión pendiente: si «Registrar pago recibido» en `/admin/prestamos` debe exigir comprobante (recomendado). Respaldo periódico de la base: se deja para después.
- DECIDIDO: todo pago queda con soporte. Se eliminó `registrarMovimientoPrestamo` y el formulario «Registrar pago recibido»; en `/admin/prestamos` (Vigentes) ahora el botón lleva a `/admin/pagos?tipo=prestamo` (el admin sube el comprobante por el deudor).
- Creado `Instrucciones/Instrucciones logo - Claude Design.md` (encargo del logo, paleta libre). Al recibir el logo: integrarlo en íconos PWA, favicon, splash y tarjeta del préstamo.

## Sesión 10 (cont.) — 4x1000, día de pago mensual y notificaciones push (sin subir; compila y pasa lint)
- **Interés del préstamo**: ahora vence cada MES el mismo día del desembolso (`desembolsado_en`), ya no en reuniones (`lib/prestamos.ts`: `sumarMeses`, `proximoPago`, `ultimoVencimiento`; se quitó el parámetro `reuniones`). Mora: por cada mes de retraso.
- **4x1000**: 0,4 % del capital, se suma una sola vez a la PRIMERA cuota de interés (`interesProximo`, `primeraCuotaPendiente`). Solo aplica a préstamos con `prestamos.cobrar_4x1000 = true` (se marca al desembolsar); los 6 cargados del Excel quedan en false. Se muestra en Pagos y Préstamos.
- **Push**: `public/sw.js`, `lib/push.ts` (web-push, borra suscripciones caducadas), `components/ActivarNotificaciones.tsx` (aviso en Inicio y interruptor en Perfil), acciones `guardarSuscripcionPush`/`quitarSuscripcionPush`. Avisos: nueva solicitud y pago por revisar (admins), solicitud aprobada/rechazada, desembolso y pago aprobado/rechazado (deudor), y el cron diario: cuota (3 días antes/día/mora), interés del préstamo (3 días antes/día/mora semanal) y «Hay $X disponibles para prestar» a todos una vez al día. En iPhone solo funcionan con la app instalada.
- **Migración `0015_4x1000_y_push.sql`** (columna `cobrar_4x1000` + tabla `push_suscripciones`). **Falta ejecutarla.**
- **Variables en Vercel (obligatorias para push)**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (Sensitive) y `VAPID_ASUNTO` (valores en `.env.local`); luego Redeploy. Sin ellas la app funciona pero no envía push.
- Revisar: los 6 préstamos del Excel ahora pagan el día del mes de su fecha de desembolso; confirmar que esas fechas sean correctas.
- **4x1000 en la contabilidad (ajuste)**: la cuenta NU NO es exenta, así que siempre se cobra 0,4 % del desembolso. El reembolso es un movimiento propio `reembolso_4x1000` (migración 0015; `pagos_prestamo.monto_4x1000`): NO suma a la caja prestable ni a las utilidades del cierre. Lo que se paga como interés cubre primero el 4x1000 pendiente. Se debe desde el primer vencimiento y aparece en la deuda del deudor (`interesPendiente` = interés + 4x1000 vencido; `gmfPendiente`, `interesSoloPendiente`). `saldo_calculado` descuenta el impuesto pagado al banco al desembolsar y suma el reembolso (la conciliación NU cuadra). Si el `alter type ... add value` falla en el SQL Editor, ejecutar esa línea sola primero.

## Sesión 10 (cont.) — Logo «Brote F» y login con memoria (sin subir; compila y pasa lint)
- Logo en `Instrucciones/Logo/FondoFamiliar-Logo/` (LEEME.txt con concepto y paleta). Integrado: íconos PWA (`public/icons`), `apple-icon.png`, `favicon.ico`, `public/logo/*`, componente `components/Logo.tsx` (`Logo` cambia según tema; `Simbolo` en línea).
- **Paleta nueva (verde)** en `globals.css`: Brote #2BD9A0 / Bosque #0B7A57 (acento), Ámbar #FFB547 (`--amber`), fondo Noche #0A0E0D, tarjetas #141B19; tema claro Niebla #F4F7F6. Degradado de tarjetas #0B7A57 -> #0E3B2E; avatares, correos, PDFs y manifest actualizados. Variante Tailwind `light:` para elementos solo del tema claro.
- Logo en login, primer ingreso, completar cuenta, elegir panel y tarjeta del préstamo.
- Login recuerda a la última persona (correo + nombre en localStorage, nunca la contraseña): «Hola de nuevo, X» y solo pide la contraseña; «No soy yo» lo olvida. La sesión de Supabase ya persistía por cookies.
- Falta (opcional): splash de iOS (`public/logo/splash.png` está disponible).
- Colores del logo en TODA la app (asociado y admin): botones principales y pestañas activas en verde (`bg-accent text-accent-fg`), navegación activa verde, estados pendientes/por revisar en ámbar (`bg-amber/15 text-amber`), chip de la tarjeta dorado, avatares en verde/ámbar, `--ok` = verde de marca. Ya no queda ningún morado ni azul.

## Sesión 10 (cont.) — Foto de perfil y Recuerdos (sin subir; compila, pasa lint y build)
- **Foto de perfil (opcional)**: `components/SubirFotoPerfil.tsx` (recorta cuadrado 512 px y comprime en el navegador, sube directo a Supabase Storage). Se pide como paso 3 («Omitir y entrar») del asistente `/completar-cuenta`, se puede poner/cambiar/quitar en Perfil, y en Inicio sale un aviso cerrable (`AvisoFoto`) a quien no tiene. `Avatar` acepta `foto`; se muestra en Inicio, panel admin, Perfil, Asociados, detalle de socio y Recuerdos (en otras listas aún salen las iniciales). `lib/fotos.ts` (URL pública) y `lib/fotos-servidor.ts` (`fotosPerfil`, tolera que falte la columna).
- **Recuerdos** (`/recuerdos`, nuevo ítem en la barra inferior): lista de reuniones ya realizadas (con portada y conteo) y galería por reunión `/recuerdos/[id]` con cuadrícula, visor con flechas, y «Subir fotos» (hasta 5 por persona por reunión; cada una se comprime a 1600 px y se crea miniatura de 480 px). Cada quien borra las suyas; los admins pueden borrar cualquiera. Archivos privados con enlaces firmados de 1 hora.
- **Migración `0016_fotos_y_recuerdos.sql`** (columna `perfiles.foto_ruta`, buckets `fotos-perfil` público y `recuerdos` privado, tabla `recuerdos` con RLS y trigger de máximo 5). **Falta ejecutarla** (junto con 0015).
- Nota: el layout de `(app)` envuelve `BottomNav` en `<Suspense>` (necesario para rutas dinámicas con `cacheComponents`).

## Sesión 10 (cont. 2) — Fotos en listas, splash iPhone, bandeja de avisos, limpieza (sin subir; compila, pasa lint y build)
- Fotos de perfil en todas las listas del admin: `components/AvatarSocio.tsx` (busca la foto por nombre, una consulta por petición) y `fotos` en `FormularioAsistencia`.
- Splash de iPhone: `public/splash/*` (11 tamaños, generados desde `public/logo/splash.png`) y `lib/splash-ios.ts` conectado en `appleWebApp.startupImage`.
- Notificaciones en todos los dispositivos: `ActivarNotificaciones` ahora explica la causa (sin clave VAPID en el servidor, iPhone sin instalar, navegador no compatible). Si en el iPhone dice «todavía no están configuradas», faltan las variables VAPID en Vercel (son de build: requieren Redeploy). Además, **bandeja de avisos**: tabla `avisos` (migración **0017**, falta ejecutarla), `/avisos`, campana con contador en Inicio y panel admin; `enviarPush` guarda cada aviso en la bandeja aunque el dispositivo no soporte push.
- Celular/iPhone: `viewportFit: cover` + relleno superior por la barra de estado (app instalada) y letra de 16 px en campos para evitar el zoom automático de iOS.
- Tutorial: pasos nuevos de campana de avisos y Recuerdos; Perfil menciona foto y notificaciones. Especificaciones de uso y técnicas actualizadas a v3. Se eliminó `lib/mock.ts`; `.gitattributes` fija saltos de línea LF.
- `Instrucciones/Mensaje para directivos.md`: texto corto para copiar y pegar con las 5 reglas por confirmar.
- Pendiente de código: respaldo periódico de la base; avisos de cierre de ciclo y acción «cerrar ciclo»; pruebas de punta a punta.
- Campana de avisos convertida en pestañita desplegable (`components/PanelAvisos.tsx` + `CampanaAvisos.tsx`): al tocarla en Inicio o en el Resumen admin se abre un panel con los últimos 8 avisos (resalta los nuevos, se marcan leídos al abrir) y «Ver todos los avisos» (`/avisos`). (sin subir)

## Sesión 10 (cont. 3) — Respaldo de la base (sin subir; compila, pasa lint y build)
- `lib/respaldo.ts`: exporta todas las tablas (paginado de 1000) a un JSON comprimido (gzip). El cron diario `/api/mantener-activo` lo ejecuta **los domingos** (hora Colombia): lo guarda en el bucket privado `respaldos` (se conservan los últimos 12) y lo envía por correo (adjunto, Resend) al fiscal. Un fallo no afecta el cron. No se agregó un tercer cron (límite del plan Hobby).
- Descarga manual: Admin > Más > Reportes > «Respaldo de la base» (`/admin/respaldo`, solo directivos). Las fotos de Storage no se incluyen.
- **Migración `0018_respaldos.sql`** (bucket privado `respaldos`): **falta ejecutarla**.
- Pendiente de código: avisos de cierre de ciclo y acción «cerrar ciclo»; pruebas de punta a punta.

## Sesión 10 (cont. 4) — Cerrar ciclo (compila, pasa lint y build)
- Parámetro `ciclo_cerrado` (migración **0019_cierre_de_ciclo.sql**, falta ejecutarla). En `/admin/cierre`: botón «Cerrar ciclo y avisar a todos» (solo habilitado sin préstamos por cancelar) y «Reabrir ciclo». Cerrado: `solicitarPrestamo` y `desembolsarPrestamo` se bloquean y el cron deja de avisar «hay dinero disponible». Al cerrar se envía push/aviso a todos.
- El cron diario avisa por correo + push + bandeja a todos 30, 7 y 1 día antes de la reunión de liquidación (última fecha de la cadena).
- Pendiente de código: ninguno grande; quedan las pruebas de punta a punta (las haces tú).

## Sesión 10 (cont. 5) — Menú inferior fijo, visor de fotos y especificaciones (compila, pasa lint y build)
- Menú inferior: ya no es `position: fixed`. Nuevo `components/Cascaron.tsx` (usado por `(app)/layout.tsx` y `admin/layout.tsx`): pantalla completa con zona de desplazamiento interna y el menú como parte de la columna, así siempre queda al borde de abajo en todas las secciones. El tutorial desplaza esa zona (`[data-scroll]`).
- Visor de fotos: la X y el título respetan la barra de estado; abajo hay un botón grande «Cerrar» (Recuerdos y visor de comprobantes).
- Especificaciones de uso y técnicas actualizadas (respaldo, cierre de ciclo, avisos de liquidación, migraciones 0018-0019).

## Sesión 10 (cont. 6) — Campana en vivo y menú más abajo (compila, pasa lint y build)
- Campana en vivo: `PanelAvisos` consulta `avisosRecientes()` (acción de servidor) cada 20 s con la app visible y al volver a ella; el contador y la lista se actualizan solos.
- Menú inferior: relleno inferior reducido a `max(0.25rem, safe-area - 1.25rem)` para que quede en el borde (en el pantallazo sobraban ~60 pt bajo las etiquetas). Si queda muy pegado al indicador de inicio del iPhone, subir el 1.25rem en `BottomNav.tsx` y `AdminNav.tsx`.

## Sesión 10 (cont. 7) — Avisos reforzados, pago en efectivo/grupal y multas en el pago (compila, pasa lint y build)
- Avisos: reunión (push diario la semana previa, correo a 7 y 1 día), interés de préstamo (push diario la semana previa; correo 7 días, 1 día y el día), multas pendientes (push + correo cada 7 días y push al generarse).
- **Pago en efectivo / de varios** (Admin > Pagos > Cuota > «Registrar pago en efectivo / de varios»): un solo pantallazo se copia en cada asociado marcado, con descripción libre (por defecto «Pago dividido en N») y quién recolectó (cualquier asociado). Cada pago queda pendiente de aprobar y muestra «Efectivo recolectado por X · descripción». Migración **0020_pago_grupal.sql** (`pagos_reportados.descripcion`, `recolector_id`): falta ejecutarla.
- **Multas en el pago**: en cada tarjeta de Admin > Pagos aparece «Debe la multa» con el botón «Venía en este pago» (la marca cobrada y avisa al asociado) o se deja pendiente. En Admin > Multas las pendientes dicen «Debe la multa».
- Pendiente: pagos de préstamo en efectivo/grupales (hoy se suben uno por uno con `SubirPagoPrestamoAdmin`).
