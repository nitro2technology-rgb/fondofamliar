# Especificaciones de uso — Fondo de Ahorro Familiar

> Estado: v1 (basada en estatutos + respuestas de la sesión 1). Los puntos marcados ⚠️ son supuestos por confirmar.

## 1. Propósito
Aplicación web privada (Art. 7 del estatuto) donde cada asociado verifica sus aportes, préstamos, estados de cuenta y demás información. **Solo registra y consulta; no mueve dinero.** El dinero está en una cuenta Banco NU administrada por el Tesorero.

## 2. Usuarios y roles
| Rol | Quién | Permisos |
|---|---|---|
| **Fiscal (administrador)** | Nicolás Pérez (también desarrolla la app) | Control total, auditoría, gestión de usuarios, configuración |
| **Contador (administrador)** | Fredy Yama | Registra aportes, pagos, intereses, multas; genera reportes |
| **Tesorero (administrador)** | Gianni Obando | Registra movimientos, sube captura mensual de la cuenta NU |
| **Asociado (usuario)** | Los 19 integrantes (incluye a los 3 administradores) | Ve **solo su propia información**; radica solicitudes de préstamo |

- Sin registro público: los usuarios los crea el administrador.
- Los 3 administradores también son asociados: con un mismo usuario entran a **dos paneles** (Panel de usuario y Panel de administración) y pueden alternar entre ambos.
- Los externos apadrinados no tienen acceso (solo se registran como deudores).

## 3. Reglas del fondo (del estatuto)
**Aportes**
- Aporte tecnológico único: $20.000 (inicio del ciclo, Art. 9).
- Aporte inicial: $100.000.
- Cuota mensual: $83.000 = $40.000 ahorro + $40.000 cadena + $3.000 juegos (50% ganadores / 50% utilidad del fondo).

**Cadena**: 19 turnos, uno por mes, en la fecha de cada reunión. Cada mes un asociado recibe el recaudo de cadena (18 × $40.000 = $720.000, porque el del turno no paga su parte). Calendario en §12. Primer turno: Ángela Mora (por unanimidad); el resto se sorteó el 24-oct-2026.

**Préstamos**
- Tope: $1.000.000 acumulado entre asociado y su externo apadrinado (Art. 11).
- Solo a asociados al día y sin deudas con el fondo (Art. 12).
- Solicitud por la app; si no hay caja, se atiende por **orden de radicación** (cola).
- Aprobación: solo los 3 directivos votan.
- Interés: 4% mensual **fijo sobre el capital inicial** (ej.: préstamo de $100.000 → $4.000 cada mes). La cuota de interés no baja ni varía hasta cancelar todo el capital, aunque haya abonos (Art. 14 y 15).
- Plazo indefinido: si tarda 2 años en pagar el capital, paga el interés fijo los 24 meses.
- Nuevo préstamo solo tras cancelar el anterior por completo.
- Fecha límite de pago (cuota e intereses): el día de la reunión. Mora desde el día siguiente; se cobra interés sobre intereses (Art. 16).
- Préstamo a externo con padrino: el padrino responde solidariamente (Art. 13).
- Obligación de dinamizar: si hay caja, quien nunca ha pedido préstamo debe pedir ≥ $100.000 o apadrinar a un externo (Art. 5).

**Reuniones y multas**
- Segundo viernes de cada mes, 7:30 p.m.; tolerancia hasta 7:45 p.m.
- Retraso: multa $5.000. Inasistencia injustificada (residentes en Pasto): $8.000 y sin juegos de esa reunión.

## 4. Funcionalidades

### Asociado
- Iniciar sesión (correo) y ver su **estado de cuenta**: aportes pagados/pendientes, ahorro acumulado, multas, turno de cadena.
- Ver sus préstamos: capital, intereses causados y pagados, mora, saldo.
- Radicar solicitud de préstamo (con opción de externo apadrinado) y ver su estado/posición en la cola.
- Ver próximas fechas (cuotas, reunión, su turno de cadena) en calendario.
- Recibir avisos por correo.

### Tesorero y Contador
- Registrar aportes, cuotas, pagos de interés/capital, multas, resultados de juegos.
- Subir mensualmente la **captura de pantalla** de la cuenta NU (Art. 8).
- Ver resumen consolidado del fondo y de cada asociado.

### Directivos (votación)
- Ver solicitudes de préstamo en orden de radicación.
- Votar aprobar/rechazar (solo los 3 directivos); se decide por **mayoría (2 de 3)**.
- Registrar asistencia a reunión (puntual / tarde / ausente / justificada) y generar multas automáticas.

### Administrador (Fiscal)
- Crear/desactivar usuarios, asignar roles.
- Configurar parámetros (montos, % interés, fechas) sin tocar código.
- Consultar bitácora de auditoría.

## 5. Flujos principales
1. **Aporte mensual**: Asociado paga por NU → Tesorero/Contador registra → asociado ve su estado actualizado.
2. **Préstamo**: Solicitud → validación automática (al día, sin préstamo vigente, tope) → cola → votación de directivos → desembolso registrado → intereses mensuales automáticos → abonos → cancelación.
3. **Mora**: pasada la fecha límite, el sistema marca mora, calcula interés sobre interés y envía aviso.
4. **Reunión mensual**: registro de asistencia → multas → resultados de juegos.
5. **Cierre mensual**: carga de captura NU + conciliación contra saldo calculado por la app.

## 6. Notificaciones (correo)
- Recordatorio de cuota próxima y de mora.
- Solicitud de préstamo recibida / aprobada / rechazada.
- Nueva solicitud pendiente de voto (a directivos).
- Recordatorio de reunión.

## 7. Reportes
- Estado de cuenta por asociado (descargable PDF).
- Saldo total del fondo y utilidades (intereses, juegos, multas).
- Historial de aportes, préstamos y movimientos.
- Cartera vigente y en mora.
- Conciliación mensual vs. captura NU.

## 8. Experiencia de uso (diseño)
- **Mobile-first**, uso principal desde celular; instalable como PWA.
- Referencia visual (carpeta `Instrucciones/Pantallazos`): tema oscuro, tarjetas redondeadas, barra de navegación inferior flotante (Inicio · Buscar · Calendario · Perfil), calendario mensual con puntos en fechas de eventos, resumen grande de totales.
- Pantallas asociado: Inicio (saldos y resumen) · Mis préstamos / solicitar · Calendario · Perfil.

## 9. Datos iniciales
- Migrar el Excel actual (pocos registros) a la base de datos.

## 10. Fuera de alcance (v1)
- Pagos o transferencias dentro de la app.
- Integración bancaria automática.
- Votación de los asociados (solo directivos votan).

## 11. Puntos por confirmar
1. **Mora (Art. 16)** — PENDIENTE de confirmar con los administradores. El estatuto no define tasa ni periodicidad. **Se implementa provisionalmente** así: el interés mensual no pagado se suma a lo adeudado y genera 4% adicional por cada mes de atraso; la regla queda parametrizable para cambiarla sin tocar código. ⚠️ Revisar también el riesgo de usura.

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
- La app debe: avisar a deudores, mostrar cartera pendiente, y generar un reporte de liquidación por asociado (ahorro + parte de utilidades). Liquidación por asociado = su ahorro acumulado + (utilidades totales ÷ 19), es decir, utilidades (intereses, juegos y multas) en **partes iguales**.
