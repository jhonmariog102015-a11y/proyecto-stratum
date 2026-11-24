import { readFile } from "node:fs/promises";

// Esta copia editorial solo se carga en el emulador local de la vista previa.
if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080") {
  throw new Error("Se requiere el emulador local de Firestore.");
}
const url = "http://127.0.0.1:18080/v1/projects/demo-stratum/databases/(default)/documents/noticias";
const noticias = JSON.parse(await readFile(new URL("./noticias-de-muestra.json", import.meta.url), "utf8"));
for (const { id, fields } of noticias) {
  const response = await fetch(url + "?documentId=" + encodeURIComponent(id), {
    method: "POST",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
  // Si ya existe, conserva las ediciones y los retiros de esta sesión.
  if (!response.ok && response.status !== 409) throw new Error("Error al cargar las noticias: " + response.status);
}
if (process.argv.includes("--servir")) {
  console.log("Vista previa disponible en http://127.0.0.1:5500/. Pulsa Ctrl+C para cerrar.");
  // emulators:exec mantiene los servicios mientras viva este proceso.
  setInterval(() => {}, 2 ** 30);
}
