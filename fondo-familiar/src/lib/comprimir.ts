// Reduce el peso de una imagen en el navegador antes de subirla (JPEG, lado mayor limitado).
export async function comprimirImagen(archivo: File, maxLado = 2000, calidad = 0.82): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/gif") return archivo;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return archivo;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}

// Copia los datos del formulario reemplazando el archivo por su versión comprimida.
export async function datosConImagenComprimida(form: HTMLFormElement, campo = "archivo"): Promise<FormData> {
  const datos = new FormData(form);
  const archivo = datos.get(campo);
  if (archivo instanceof File && archivo.size > 0) datos.set(campo, await comprimirImagen(archivo));
  return datos;
}

// Tope de seguridad: el envío al servidor admite 4 MB; una imagen más pesada ya comprimida no se puede subir.
const LIMITE_BYTES = 3.5 * 1024 * 1024;

// Mensaje claro para quien no sabe subir el comprobante; null si el archivo es válido.
export function errorDeArchivo(datos: FormData, campo = "archivo", obligatorio = true): string | null {
  const archivo = datos.get(campo);
  if (!(archivo instanceof File) || archivo.size === 0) {
    return obligatorio ? "Falta la imagen. Toca «Elegir archivo» y selecciona el pantallazo del pago." : null;
  }
  if (!archivo.type.startsWith("image/")) return "El archivo debe ser una imagen (pantallazo o foto), no un PDF u otro documento.";
  if (archivo.size > LIMITE_BYTES) return "La imagen es muy pesada. Toma un pantallazo de la pantalla en lugar de una foto.";
  return null;
}
