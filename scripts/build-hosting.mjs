import { copyFile, lstat, mkdir, realpath, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const output = join(root, ".hosting-public");
const files = [
  "index.html", "nosotros.html", "servicios.html", "noticias.html", "contacto.html",
  "aviso-legal.html", "politica-privacidad.html", "gracias.html", "404.html",
  "admin_noticias.html", "robots.txt", "sitemap.xml",
  "css/main.css", "js/app.js", "js/analytics.js", "js/admin.js", "js/firebase_noticias.js",
  "assets/Portafolio_Stratum_Group.pdf", "assets/drone_landscape.png", "assets/coal_hand.png",
  "img/favicon-stratum.png", "img/logo_complet_sin_fondo.png",
  "img/metodologia_paso1.jpg", "img/metodologia_paso2.jpg", "img/metodologia_paso3.jpg",
  "img/metodologia_paso4.jpg", "img/entidades/logo_anm.png", "img/entidades/logo_anla.png",
  "img/entidades/CORPOBOYACA.png", "img/entidades/car-logo-cundinamarca.webp",
  "img/entidades/minambiente_clean.png", "img/entidades/Ideam_(Colombia)_logo.png",
  "img/entidades/logo_sena.svg", "img/entidades/logo_contraloria.png",
  "img/entidades/logo_fiscalia.svg"
];

// Comprueba la entrada antes de limpiar el directorio generado.
for (const file of files) {
  const source = join(root, file);
  if (!(await lstat(source)).isFile() || await realpath(source) !== source) {
    throw new Error("El archivo público debe ser un archivo real del proyecto: " + file);
  }
}

const existing = await lstat(output).catch(error => {
  if (error.code !== "ENOENT") throw error;
});
if (existing && (!existing.isDirectory() || await realpath(output) !== output)) {
  throw new Error("El directorio de salida debe estar en el proyecto: " + output);
}
await rm(output, { recursive: true, force: true });
for (const file of files) {
  const destination = join(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, file), destination);
}
console.log("Sitio preparado: " + files.length + " archivos.");
