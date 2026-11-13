import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// Generador mínimo de reportes A4 con tablas y salto de página (fuente estándar, sin archivos externos).
const MARGEN = 40;
const ANCHO = 595;
const ALTO = 842;
const MORADO = rgb(0.043, 0.478, 0.341); // verde Bosque #0B7A57 del logo
const GRIS = rgb(0.4, 0.4, 0.4);

// WinAnsi no tiene espacios especiales ni otros símbolos: se normalizan.
const limpio = (t: string) => t.replace(/[\u00a0\u202f]/g, " ").replace(/[^\x20-\x7e\u00a1-\u00ff]/g, "?");

export async function nuevoReporte(titulo: string, subtitulo: string) {
  const doc = await PDFDocument.create();
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = doc.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;

  const texto = (t: string, x: number, size: number, f: PDFFont = normal, color = rgb(0.1, 0.1, 0.1), alinearDerecha = false) => {
    const s = limpio(t);
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: alinearDerecha ? x - w : x, y, size, font: f, color });
  };
  const salto = (alto: number) => {
    y -= alto;
    if (y < MARGEN + 20) {
      page = doc.addPage([ANCHO, ALTO]);
      y = ALTO - MARGEN;
    }
  };

  texto("Fondo de Ahorro Familiar", MARGEN, 10, negrita, MORADO);
  salto(22);
  texto(titulo, MARGEN, 18, negrita);
  salto(16);
  texto(subtitulo, MARGEN, 9, normal, GRIS);
  salto(22);

  return {
    seccion(nombre: string) {
      salto(8);
      texto(nombre, MARGEN, 12, negrita, MORADO);
      salto(6);
      page.drawLine({ start: { x: MARGEN, y }, end: { x: ANCHO - MARGEN, y }, thickness: 0.7, color: MORADO });
      salto(14);
    },
    linea(etiqueta: string, valor: string) {
      texto(etiqueta, MARGEN, 10, normal, GRIS);
      texto(valor, ANCHO - MARGEN, 10, negrita, rgb(0.1, 0.1, 0.1), true);
      salto(15);
    },
    nota(t: string) {
      texto(t, MARGEN, 9, normal, GRIS);
      salto(13);
    },
    // columnas: ancho en puntos y alineación. La última fila de `filas` puede marcarse como total.
    tabla(cabecera: string[], filas: string[][], anchos: number[], derecha: boolean[], total = false) {
      const dibujar = (celdas: string[], f: PDFFont, color = rgb(0.1, 0.1, 0.1)) => {
        let x = MARGEN;
        celdas.forEach((c, i) => {
          texto(c, derecha[i] ? x + anchos[i] - 6 : x + 2, 9, f, color, derecha[i]);
          x += anchos[i];
        });
        salto(14);
      };
      dibujar(cabecera, negrita, GRIS);
      page.drawLine({ start: { x: MARGEN, y: y + 10 }, end: { x: ANCHO - MARGEN, y: y + 10 }, thickness: 0.4, color: GRIS });
      filas.forEach((fila, i) => dibujar(fila, total && i === filas.length - 1 ? negrita : normal));
      salto(4);
    },
    async guardar() {
      const paginas = doc.getPages();
      paginas.forEach((p, i) =>
        p.drawText(`Pagina ${i + 1} de ${paginas.length}`, { x: ANCHO - MARGEN - 60, y: 20, size: 8, font: normal, color: GRIS }),
      );
      return doc.save();
    },
  };
}

export const respuestaPdf = (bytes: Uint8Array, nombre: string) =>
  new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nombre}"` },
  });
