import { copyFile, lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { insertarPoliticaMeta } from "./politica-csp.mjs";

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const output = join(root, ".hosting-public");
const basePath = process.env.SITE_BASE_PATH || "";
if (basePath && !/^\/[\w.-]+$/.test(basePath)) throw new Error("Ruta de publicación inválida.");
let siteOrigin = "";
if (process.env.SITE_ORIGIN) {
  const url = new URL(process.env.SITE_ORIGIN);
  if (url.protocol !== "https:" || url.username || url.password || url.href !== url.origin + "/"
      || !/^[a-z0-9.-]+$/i.test(url.hostname)) {
    throw new Error("SITE_ORIGIN debe ser el origen HTTPS del sitio, sin rutas ni credenciales.");
  }
  siteOrigin = url.origin;
}
const firebase = JSON.parse(await readFile(join(root, "firebase.json"), "utf8"));
const politica = firebase.hosting.headers.flatMap(grupo => grupo.headers)
  .find(cabecera => cabecera.key === "Content-Security-Policy").value;
const files = [
  "index.html", "nosotros.html", "servicios.html", "noticias.html", "contacto.html",
  "aviso-legal.html", "politica-privacidad.html", "gracias.html", "404.html",
  "admin_noticias.html", "robots.txt", ...(siteOrigin ? ["sitemap.xml"] : []),
  "css/main.css", "js/app.js", "js/analytics.js", "js/admin.js", "js/entorno.js",
  "js/preferencias.js", "js/anti-marco.js",
  "js/noticias-publicas.js", "js/formato-noticias.js", "js/cargar-noticias.js", "js/contacto.js",
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
  if (file === "robots.txt" && !siteOrigin) {
    await writeFile(destination, "User-agent: *\nDisallow: /\n");
  } else if (file.endsWith(".html") || file === "robots.txt" || file === "sitemap.xml") {
    let template = await readFile(join(root, file), "utf8");
    if (file === "robots.txt") {
      // Las rutas de robots.txt son absolutas; GitHub Pages publica el sitio en una subcarpeta.
      template = template.replace(/^(Disallow: )\//gm, `$1${basePath}/`);
    }
    if (file.endsWith(".html")) template = insertarPoliticaMeta(template, politica);
    if (file === "404.html") {
      // Hosting sirve este documento también desde direcciones de varios niveles.
      template = template.replace(/\b(href|src)="(?=(?:css\/|js\/|img\/|assets\/|[\w-]+\.html))/g, `$1="${basePath}/`);
    }
    await writeFile(destination, template.replaceAll("{{SITE_ORIGIN}}", siteOrigin + basePath));
  } else {
    await copyFile(join(root, file), destination);
  }
}
await build({
  entryPoints: [join(root, "js/firebase_noticias.js")],
  outfile: join(output, "js/firebase_noticias.js"),
  bundle: true, format: "esm", platform: "browser", minify: true,
  legalComments: "eof"
});
console.log("Sitio preparado: " + (files.length + 1) + " archivos.");
