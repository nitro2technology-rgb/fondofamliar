# Especificaciones de uso — Fondo de Ahorro Familiar

> Estado: v3 (actualizada el 2026-11-13, sesión 10). Base: estatutos + respuestas del usuario + lo construido. Los puntos marcados ⚠️ son supuestos por confirmar.

## 1. Propósito
Aplicación web privada (Art. 7 del estatuto) donde cada asociado verifica sus aportes, préstamos, estados de cuenta y demás información. **Solo registra y consulta; no mueve dinero.** El dinero está en una cuenta Banco NU administrada por el Tesorero.

## 2. Usuarios y roles
| Rol | Quién | Permisos |
|---|---|---|
| **Fiscal (administrador)** | Nicolás Pérez (también desarrolla la app) | Control total, auditoría, gestión de usuarios, configuración |
| **Contador (administrador)** | Fredy Yama | Registra aportes, pagos, intereses, multas; genera reportes |
| **Tesorero (administrador)** | Gianni Obando | Registra movimientos, sube captura mensual de la cuenta NU |
| **Asociado (usuario)** | Los 19 integrantes (incluye a los 3 administradores) | Ve **solo su propia información**; radica solicitudes de préstamo |

- Sin registro público: los 19 usuarios están precargados. **Primer ingreso por celular** (sin contraseña): el asociado escribe su celular, ve "Hola, <nombre>", y registra su correo real, una contraseña y su **cuenta o llave para recibir pagos**; después entra con correo + contraseña. Un admin puede permitir un nuevo primer ingreso si alguien olvida su contraseña.
- Los 3 administradores también son asociados: con un mismo usuario entran a **dos paneles** (Panel de usuario y Panel de administración) y pueden alternar entre ambos.
- Los externos apadrinados no tienen acceso (solo se registran como deudores).

## 3. Reglas del fondo (del estatuto)
**Aportes**
- Aporte tecnológico único: $20.000 (inicio del ciclo, Art. 9).
- Aporte inicial: $100.000.
- Cuota mensual: $83.000 = $40.000 ahorro + $40.000 cadena + $3.000 juegos (50% ganadores / 50% utilidad del fondo).

**Cadena**: 19 turnos, uno por mes, en la fecha de cada reunión. Cada mes un asociado recibe el recaudo de cadena (18 × $40.000 = $720.000, porque el del turno no paga su parte). **La cadena se paga directamente a quien tiene el turno** (no pasa por la cuenta NU del fondo); el ahorro + juegos sí van a la cuenta del fondo. Calendario en §12. Primer turno: Ángela Mora (por unanimidad); el resto se sorteó el 24-oct-2026.

**Préstamos**
- Tope: $1.000.000 acumulado entre asociado y su externo apadrinado (Art. 11).
- Solo a asociados al día y sin deudas con el fondo (Art. 12).
- Solicitud por la app; si no hay caja, se atiende por **orden de radicación** (cola).
- Aprobación: solo los 3 directivos votan.
- Interés: 4% mensual **fijo sobre el capital inicial** (ej.: préstamo de $100.000 → $4.000 cada mes). La cuota de interés no baja ni varía hasta cancelar todo el capital, aunque haya abonos (Art. 14 y 15). **Se paga cada mes el mismo día en que se desembolsó el préstamo** (el día en que se habilita), no en la reunión.
- **4x1000 (GMF)**: el banco cobra 0,4 % al desembolsar y la cuenta NU no es exenta; el deudor lo reembolsa **una sola vez, con su primera cuota de interés** (primero se cubre el 4x1000 y el resto es interés). Aparece como deuda del deudor y en la contabilidad es un movimiento aparte: **no suma a la caja prestable ni a las utilidades**. Los 6 préstamos cargados del Excel no lo pagan.
- Plazo indefinido: si tarda 2 años en pagar el capital, paga el interés fijo los 24 meses.
- Nuevo préstamo solo tras cancelar el anterior por completo.
- Pago del préstamo desde la app (Registrar pago → Préstamo): interés del mes, abono a capital por cualquier valor o pago total, siempre con comprobante; lo aprueba un administrador y no se puede deshacer. Para cancelar todo el capital hay que pagar también el interés pendiente.
- Fecha límite de pago (cuota e intereses): el día de la reunión. Mora desde el día siguiente; se cobra interés sobre intereses (Art. 16).
- Préstamo a externo con padrino: el padrino responde solidariamente (Art. 13).
- Obligación de dinamizar: si hay caja, quien nunca ha pedido préstamo debe pedir ≥ $100.000 o apadrinar a un externo (Art. 5).

**Reuniones y multas**
- Segundo viernes de cada mes, 7:30 p.m.; tolerancia hasta 7:45 p.m.
- Retraso: multa $5.000. Inasistencia injustificada (residentes en Pasto): $8.000 y sin juegos de esa reunión.

## 4. Funcionalidades

### Asociado
- Iniciar sesión (correo y contraseña) y ver su **estado de cuenta**: cuota del mes, historial mes a mes, ahorro acumulado, multas, turno de cadena, próxima reunión.
- **Pagar y subir comprobantes** (botón prioritario en Inicio): por cada cuota sube la captura del pago al fondo (ahorro + juegos) y la del pago de la cadena (se le muestra el nombre y la cuenta o llave de quien tiene el turno). Puede reemplazar el comprobante si lo rechazan. Si no logra subirlo, un administrador lo carga por él.
- Registrar y editar en su Perfil la **cuenta o llave para recibir pagos**; la ven quienes deben consignarle la cadena el mes de su turno. Si falta, aparece un aviso en Inicio.
- **Si tiene el turno de cadena del mes**: ve "Confirmar pagos" (`/recibos`) desde el día 1 de su mes: los 18 pagos con su captura, quién no ha subido, y marca **Recibí** / **No lo recibí**. La ventana desaparece cuando los 18 están confirmados; al entrar al Inicio aparece una ventana emergente (una vez por sesión) si aún le faltan por confirmar. No ve los pagos al fondo.
- Ver sus préstamos: capital, intereses causados y pagados, mora, saldo.
- Radicar solicitud de préstamo (con opción de externo apadrinado) y ver su estado/posición en la cola.
- Ver próximas fechas (cuotas, reunión, su turno de cadena) en calendario.
- Recibir **avisos** por correo, por notificación push en el celular (opcional) y en la **campana** de la app (funciona en cualquier dispositivo).
- **Foto de perfil** opcional: se ofrece en el primer ingreso (se puede omitir) y se cambia en Perfil; se comprime sola.
- **Recuerdos**: en cada reunión ya realizada puede subir hasta 5 fotos (se comprimen automáticamente) y ver la galería de todos; cada quien borra las suyas y los administradores pueden borrar cualquiera.

### Tesorero y Contador
- **Pagos del mes** (botón prioritario, con contador de pendientes): lista por mes de quién envió comprobantes y quién no; ver cada captura en ventana flotante; **Aprobar / Rechazar (con motivo) / Deshacer**; subir el comprobante por un asociado que no supo hacerlo (queda anotado quién lo cargó); **copiar lista de pendientes** para pegarla en el grupo de WhatsApp.
- Registrar aportes únicos, pagos de interés/capital, multas, resultados de juegos. Las cuotas **ya no se marcan pagadas a mano**: solo con comprobante aprobado.
- Subir mensualmente la **captura de pantalla** de la cuenta NU (Art. 8); se puede editar el saldo, reemplazar la imagen o eliminarla. Se comprime sola.
- Ver resumen consolidado del fondo y de cada asociado.

### Directivos (votación)
- Ver solicitudes de préstamo en orden de radicación.
- Votar aprobar/rechazar (solo los 3 directivos); se decide por **mayoría (2 de 3)**.
- Registrar asistencia a reunión: **todos arrancan "Puntual"**; solo se cambia a quien llegó tarde, faltó o se excusó (Puntual / Tarde / Ausente / Excusa). Es editable y genera multas automáticas sin duplicarlas.

### Administrador (Fiscal)
- Crear/desactivar usuarios, asignar roles.
- Configurar parámetros (montos, % interés, fechas) sin tocar código.
- Consultar bitácora de auditoría.
- Descargar un respaldo completo de la base cuando quiera (Más → Respaldo de la base). Además, cada domingo el sistema genera uno y lo envía por correo al fiscal.
- Cerrar y reabrir el ciclo (Más → Cierre de ciclo).

## 5. Flujos principales
1. **Aporte mensual**: el asociado paga (a) ahorro + juegos a la cuenta NU del fondo y (b) la cadena directamente a quien tiene el turno → sube la captura de cada pago → un administrador aprueba el pago al fondo; el pago de la cadena lo confirma **una** de las dos partes (el receptor con "Recibí" o un administrador con "Aprobar") → con ambos aprobados la cuota queda **pagada** y cambia el estado de cuenta. **Sin comprobante no hay confirmación.** Si alguien no sabe subirlo, el administrador lo carga.
2. **Préstamo**: Solicitud → validación automática (al día, sin préstamo vigente, tope) → cola → votación de directivos → desembolso registrado → intereses mensuales automáticos → abonos → cancelación.
3. **Mora**: pasada la fecha límite, el sistema marca mora, calcula interés sobre interés y envía aviso.
4. **Reunión mensual**: registro de asistencia → multas → resultados de juegos.
5. **Cierre mensual**: carga de captura NU + conciliación contra saldo calculado por la app.

## 6. Notificaciones (correo, push y bandeja) — construidas
Cada aviso se guarda en la bandeja (campana) y además se envía por correo y/o push según corresponda.
- Cuota: 3 días antes, el día de la reunión y mora semanal.
- Interés del préstamo: 3 días antes, el día de pago mensual y mora semanal (incluye el 4x1000 en la primera cuota).
- Solicitud de préstamo aprobada / rechazada, desembolso y pago aprobado / rechazado (al deudor).
- Nueva solicitud, pago por revisar y resumen de lo que vence hoy (a directivos).
- «Hay $X disponibles para prestar»: una vez al día a todos, si hay caja y el ciclo no está cerrado.
- Liquidación: aviso a todos 30, 7 y 1 día antes de la reunión de liquidación, y aviso al cerrar el ciclo.
- Push: en iPhone solo funciona con la app instalada desde «Agregar a pantalla de inicio»; en cualquier caso el aviso queda en la campana.

## 7. Reportes
- Estado de cuenta por asociado (descargable PDF).
- Saldo total del fondo y utilidades (intereses, juegos, multas).
- Historial de aportes, préstamos y movimientos.
- Cartera vigente y en mora.
- Conciliación mensual vs. captura NU.

## 8. Experiencia de uso (diseño)
- **Mobile-first**, uso principal desde celular; instalable como PWA (ícono y pantalla de arranque propios, también en iPhone).
- Referencia visual (carpeta `Instrucciones/Pantallazos`): tema oscuro, tarjetas redondeadas, barra de navegación inferior (Inicio · Préstamos · Calendario · Recuerdos · Perfil), calendario mensual con puntos en fechas de eventos, resumen grande de totales.
- Pantallas asociado: Inicio (botón "Pagar y subir comprobantes", resumen, historial de cuotas) · Préstamos · Calendario (próxima reunión, 19 meses con tu cuota y turno de cadena) · Perfil (cuenta de pagos, tema) · Pagar · Confirmar pagos (solo con turno).
- Identidad visual «Brote F» (carpeta `Instrucciones/Logo`): tema oscuro por defecto con botón para claro; acento verde #2BD9A0 (oscuro) / #0B7A57 (claro) y ámbar #FFB547 para pendientes y avisos. Los administradores eligen panel (Mi cuenta / Administración) tras iniciar sesión.
- Los botones de guardado se bloquean mientras se procesan y la pantalla se actualiza al instante (asistencia, aprobaciones, confirmaciones) para evitar dobles clics.

## 9. Datos iniciales
- Ya cargados: los 19 asociados (rol, ciudad, celular) y los 19 turnos de la cadena. Faltan los celulares de Freddy Yamá y Gianni Obando (se agregan en `/admin/asociados`).
- Pendiente: migrar el Excel del fondo (pagos históricos). Esos meses no tendrán comprobantes; hay que decidir cómo cargarlos.

## 10. Fuera de alcance (v1)
- Pagos o transferencias dentro de la app (sí se suben **comprobantes**, pero el dinero no se mueve por la app).
- Integración bancaria automática.
- Votación de los asociados (solo directivos votan).

## 11. Puntos por confirmar
1. **Mora (Art. 16)** — Respuesta del contador (Freddy, 2026-11-13, audio): si no se paga a tiempo, el 4 % se cobra sobre el monto más el interés pendiente. Coincide con lo implementado (4 % adicional por mes sobre el interés no pagado). Tope $1.000.000 y un solo préstamo activo por persona: confirmados. Faltan las respuestas de los otros dos directivos. Antes: PENDIENTE de confirmar con los administradores. El estatuto no define tasa ni periodicidad. **Se implementa provisionalmente** así: el interés mensual no pagado se suma a lo adeudado y genera 4% adicional por cada mes de atraso; la regla queda parametrizable para cambiarla sin tocar código.

2. **Usura**: no aplica (decisión del 2026-11-13): el fondo es un acuerdo familiar, no una entidad financiera, y el 4 % mensual se mantiene.
3. ⚠️ Supuestos de cálculo vigentes: ahorro acumulado = ahorro de cuotas pagadas + aporte inicial; caja prestable = ahorro pagado + aporte inicial + intereses/abonos − desembolsos − aprobados sin desembolsar (cadena y juegos no se prestan); los premios de juegos se pagan en la misma reunión; ausentes fuera de Pasto no pagan multa; el recaudo de juegos no descuenta la parte de los ausentes (el admin ajusta el monto).
4. **4x1000**: se cobra 0,4 % del desembolso al deudor en su primera cuota (cuenta NU no exenta; confirmado).

Resuelto: cadena (quien recibe no paga su parte de cadena $40.000, pero sí ahorro $40.000 y juegos $3.000; recibe 18 × $40.000 = $720.000); utilidades se reparten en partes iguales; fin del ciclo (ver §13). Sesión 2: interés fijo sobre capital inicial; mayoría 2 de 3; los 19 incluyen a los admins; fecha límite = día de la reunión; externos sin acceso.

## 12. Calendario de la cadena (Listado General)
| Turno | Asociado | Fecha |
|---|---|---|
| 1 | Angela Mora C. | 13/11/2026 |
| 2 | Sara Cuásquer N. | 11/12/2026 |
| 3 | Andrés Mora C. | 08/01/2027 |
| 4 | Camilo Cuásquer J. | 12/02/2027 |
| 5 | María Eugenia Cuásquer N. | 12/03/2027 |
| 6 | Claudia Patricia Villota C. | 09/04/2027 |
| 7 | Paola Cuásquer G. | 14/05/2027 |
| 8 | Freddy Yamá C. | 11/06/2027 |
| 9 | Nubia Guerrero M. | 09/07/2027 |
| 10 | Sofía Yamá C. | 13/08/2027 |
| 11 | Sandra Cuásquer G. | 10/09/2027 |
| 12 | Diana Cuásquer G. | 08/10/2027 |
| 13 | Ramiro Yamá G. | 12/11/2027 |
| 14 | Gianni Obando | 10/12/2027 |
| 15 | Nicolás Pérez C. | 14/01/2028 |
| 16 | Marcela Cuásquer G. | 11/02/2028 |
| 17 | Luna Castro C. | 10/03/2028 |
| 18 | María Elena Jojoa V. | 14/04/2028 |
| 19 | Segundo Cuásquer N. | 12/05/2028 |

Nota: algunas fechas de la lista (p. ej. 08/01/2027, 08/10/2027) no son el segundo viernes del mes; manda la lista.

## 13. Cierre del ciclo
- Al terminar el fondo (último turno de cadena 12-may-2028) se fija una **reunión de liquidación** donde se reparte todo.
- Antes de esa reunión todos los préstamos vigentes deben estar totalmente pagados (capital e intereses).
- **Cerrar ciclo** (directivos): botón disponible solo cuando no quedan préstamos por cancelar; bloquea solicitudes y desembolsos de préstamos nuevos y avisa a todos. Se puede reabrir si fue un error.
- La app debe: avisar a deudores, mostrar cartera pendiente, y generar un reporte de liquidación por asociado (ahorro + parte de utilidades). Liquidación por asociado = su ahorro acumulado + (utilidades totales ÷ 19), es decir, utilidades (intereses, juegos y multas) en **partes iguales**.

## 14. Pagos con comprobante y cadena directa (sesión 7)
- Cada cuota mensual tiene dos pagos con comprobante: **fondo** (ahorro + juegos) y **cadena** ($40.000 al receptor del mes; $0 el mes del propio turno).
- Estados de un comprobante: pendiente → aprobado / rechazado (con motivo). Rechazado: el asociado lo reemplaza. Aprobado: se puede deshacer.
- Fondo: lo aprueba un administrador. Cadena: basta **una** parte (receptor o administrador). La cuota pasa a pagada cuando ambos están aprobados; si se deshace una aprobación vuelve a pendiente.
- Visibilidad del receptor: solo los pagos de cadena de su mes, desde el día 1 hasta confirmar todos; luego solo los administradores.
- Errores al subir con mensajes claros (falta imagen, no es imagen, muy pesada) y alternativa: el admin carga el comprobante.
- El saldo esperado de la cuenta NU (conciliación) **no incluye la cadena**.
