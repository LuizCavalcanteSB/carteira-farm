const MAX_DIMENSAO = 1600;
const QUALIDADE_JPEG = 0.82;
// Abaixo disso não vale a pena recomprimir — o ganho é insignificante e só
// custa tempo de processamento no celular do consultor.
const TAMANHO_MINIMO_PARA_COMPRIMIR = 300 * 1024;

/** Redimensiona e recomprime uma foto antes do upload — sem isso, uma foto
 * de celular (vários MB, resolução total) é baixada inteira só pra aparecer
 * numa miniatura de 160px na ficha do cliente. Se algo der errado (formato
 * não suportado, navegador antigo), sobe o arquivo original. */
export async function comprimirImagem(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < TAMANHO_MINIMO_PARA_COMPRIMIR) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_DIMENSAO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, largura, altura);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG),
    );
    if (!blob || blob.size >= file.size) return file;

    const nome = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
