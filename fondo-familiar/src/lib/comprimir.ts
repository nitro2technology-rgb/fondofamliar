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
