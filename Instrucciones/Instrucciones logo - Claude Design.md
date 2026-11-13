# Encargo para Claude Design: logo de «Fondo Familiar»

## Qué es el proyecto
Fondo Familiar es una web/app privada (PWA, pensada para celular) de un fondo de ahorro entre familiares: 19 asociados que ahorran cada mes, se prestan entre sí y reciben todo el ahorro más las utilidades al cerrar el ciclo. Es un proyecto de confianza, unión y progreso compartido. Dominio: `fondofamiliar.nitro2tech.com`.

## Qué necesito
Un **logo moderno y bonito** para la app, con libertad creativa total: **tú eliges el concepto, la forma y la paleta de colores**.

Entregables:
1. **Logo principal** (símbolo + nombre «Fondo Familiar») en versión horizontal.
2. **Símbolo solo** (sin texto), que funcione como ícono de app.
3. **Ícono de app cuadrado** con el símbolo, listo para exportar a 512×512 y 192×192 px (PNG). Debe verse bien con las esquinas recortadas en círculo o cuadrado redondeado (zona segura «maskable»: el símbolo dentro del 80 % central).
4. **Versión sobre fondo oscuro y sobre fondo claro** (la app tiene tema oscuro por defecto y tema claro opcional).
5. **Versión de un solo color** (blanco o negro) para usos sencillos.
6. La **paleta elegida**, con códigos hex y para qué sirve cada color (principal, acento, fondo, texto).
7. Una propuesta de **pantalla de bienvenida (splash)**: fondo + logo centrado, formato vertical de celular.

## Sensación que debe transmitir
- Confianza, calidez, unión familiar y crecimiento del ahorro.
- Moderno, limpio y minimalista; que se sienta como una app financiera actual (referencia de estilo: apps tipo Revolut/Nubank), pero con un toque humano y familiar, no frío ni corporativo.
- Evitar clichés muy gastados (alcancía de cerdito genérica, monedas con signo de pesos, manos dándose la mano de clip art).

## Ideas de partida (puedes ignorarlas o proponer otras)
- Un símbolo que combine **grupo/familia** con **ahorro/crecimiento** (por ejemplo, formas que se unen, un círculo que se completa, una semilla/brote, una casa o un nido abstracto).
- Una **«F» estilizada** que pueda integrar alguno de esos conceptos.
- Formas simples y geométricas, que se reconozcan a 32 px.

## Contexto visual actual de la app (para que el logo encaje)
- Estilo de la interfaz: tarjetas oscuras muy redondeadas, botones en píldora, degradados suaves, cifras grandes. Tipografía de interfaz: Geist (sans moderna).
- Hoy el acento es un **morado** provisional (`#7c3aed`) y el fondo oscuro es `#0b0b10`. **No estás obligado a mantenerlos**: si propones otra paleta, indica cómo adaptar la interfaz (acento, degradado de la tarjeta del préstamo, etc.).
- La tarjeta del préstamo tiene aspecto de tarjeta bancaria con el texto «Fondo Familiar» arriba a la izquierda; el logo debería poder reemplazar ese texto.

## Requisitos técnicos
- Formato vectorial (SVG) para el logo y el símbolo; PNG para los íconos de app.
- Fondo transparente en las versiones de logo.
- Debe leerse bien en tamaños pequeños (favicon de 32 px y pestaña del navegador).
- Contraste suficiente sobre fondo oscuro y claro (accesible).
- Que no dependa de degradados complejos para reconocerse (la versión de un color debe funcionar).

## Cómo entregarlo
- Archivos con nombres claros: `logo-horizontal.svg`, `simbolo.svg`, `icono-512.png`, `icono-192.png`, `logo-claro.svg`, `logo-oscuro.svg`, `logo-1color.svg`, `splash.png`.
- Un breve texto explicando el concepto elegido y la paleta.
- Guardar todo en `Instrucciones/Diseño/Logo/` (o donde el usuario indique). Después se integra en la app: `fondo-familiar/public/icons/` (íconos PWA), `src/app/apple-icon.png`, `src/app/favicon.ico` y la tarjeta del préstamo.
