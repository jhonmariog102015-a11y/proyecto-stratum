// Reduce una imagen al tamaño con el que se muestra y la guarda en WebP (o PNG si la salida es .png).
// Uso: node scripts/optimizar-imagen.mjs <entrada> <salida.webp|.png> <ancho máx> [alto máx] [calidad]
import sharp from "sharp";

const [entrada, salida, ancho, alto, calidad = "78"] = process.argv.slice(2);
if (!entrada || !salida || !ancho) {
  console.error("Uso: node scripts/optimizar-imagen.mjs <entrada> <salida.webp|.png> <ancho máx> [alto máx] [calidad]");
  process.exit(1);
}

const imagen = sharp(entrada).rotate().resize({
  width: Number(ancho),
  height: alto && alto !== "-" ? Number(alto) : undefined,
  fit: "inside",
  withoutEnlargement: true
});
const info = salida.endsWith(".png")
  ? await imagen.png({ palette: true, quality: Number(calidad), compressionLevel: 9, effort: 10 }).toFile(salida)
  : await imagen.webp({ quality: Number(calidad), effort: 6, smartSubsample: true }).toFile(salida);
console.log(`${salida}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
