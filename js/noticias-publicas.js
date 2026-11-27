import { esVistaLocal } from "./entorno.js";

const { escapeHTML, safeNewsLink, safeImageUrl, fechaVisible, anclaNoticia, htmlPost } = formatoNoticias;
const IMAGEN_RESPALDO = "assets/drone_landscape.webp";

async function fetchPublishedNews(limit) {
  const server = esVistaLocal ? "http://127.0.0.1:18080" : "https://firestore.googleapis.com";
  const project = esVistaLocal ? "demo-stratum" : "stratum-group";
  const url = server + "/v1/projects/" + project + "/databases/(default)/documents:runQuery";
  const response = await fetch(url, {
    method: "POST", credentials: "omit", signal: AbortSignal.timeout(6000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: "noticias" }],
      where: { fieldFilter: { field: { fieldPath: "activo" }, op: "EQUAL", value: { booleanValue: true } } },
      orderBy: [{ field: { fieldPath: "fecha_creacion" }, direction: "DESCENDING" }],
      limit
    } })
  });
  if (!response.ok) throw new Error("Firestore " + response.status);
  const rows = await response.json();
  return rows.filter(row => row.document?.fields).map(({ document: { name, fields } }) => ({
    id: name.split("/").at(-1),
    titulo: fields.titulo?.stringValue, resumen: fields.resumen?.stringValue,
    categoria: fields.categoria?.stringValue, fecha: fields.fecha?.stringValue,
    fecha_creacion: fields.fecha_creacion?.timestampValue,
    enlace: fields.enlace?.stringValue, imagen: fields.imagen?.stringValue
  }));
}

// Valores ya escapados para insertarlos en el HTML de las tarjetas.
function camposSeguros(data, categoriaPredeterminada, imagenPredeterminada) {
  return {
    fecha: escapeHTML(fechaVisible(data)),
    categoria: escapeHTML(data.categoria || categoriaPredeterminada),
    titulo: escapeHTML(data.titulo || ""),
    resumen: escapeHTML(data.resumen || ""),
    imagen: escapeHTML(safeImageUrl(data.imagen) || imagenPredeterminada),
    enlace: escapeHTML(safeNewsLink(data.enlace))
  };
}

function usarImagenDeRespaldo(container) {
  // Manejo de imágenes rotas sin atributos en línea (compatible con la CSP).
  container.querySelectorAll("img").forEach(img => {
    img.addEventListener("error", () => { img.src = IMAGEN_RESPALDO; }, { once: true });
  });
}

function mostrarError(container, error) {
  console.warn("No se pudieron consultar las noticias.", error.message);
  container.textContent = esVistaLocal
    ? "Las noticias de prueba requieren el emulador local. Inicia la vista previa y recarga esta página."
    : "No se pudieron cargar las noticias. Recarga la página para volver a intentarlo.";
}

const ATRIBUTOS_EXTERNOS = 'target="_blank" rel="noopener noreferrer"';

async function loadPublicNews(newsContainer) {
  try {
    const noticias = await fetchPublishedNews(20);
    if (noticias.length === 0) {
      newsContainer.innerHTML = `
        <div class="empty-news-state" style="text-align: center; padding: 4rem 1.5rem; color: var(--ink-3, #666);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 1.2rem; display: block; opacity: 0.6;" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <h3 style="font-size: 1.3rem; font-weight: 600; color: var(--ink, #111); margin-bottom: 0.5rem; font-family: var(--font-display);">No hay publicaciones disponibles</h3>
          <p style="max-width: 460px; margin: 0 auto; font-size: 0.95rem; line-height: 1.5;">Las novedades técnicas, normativas y comunicados de Stratum Group aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    // Primera noticia destacada (.featured)
    const f = camposSeguros(noticias[0], "Ingeniería minera", "img/metodologia_paso4.webp");
    const featuredTag = f.enlace ? "a" : "article";
    const featuredHTML = `
      <${featuredTag} class="featured" id="${escapeHTML(anclaNoticia(noticias[0].id))}" ${f.enlace ? `href="${f.enlace}" ${ATRIBUTOS_EXTERNOS}` : ""}>
        <div class="featured__img"><img src="${f.imagen}" alt=""></div>
        <div class="featured__body">
          <div class="featured__meta"><span class="cat">${f.categoria}</span><time>${f.fecha}</time></div>
          <h2>${f.titulo}</h2>
          <p>${f.resumen}</p>
          ${f.enlace ? '<span class="link">Leer artículo completo <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>' : ""}
        </div>
      </${featuredTag}>
    `;

    // Siguientes noticias en cuadrícula editorial (.posts)
    const secondaryCards = noticias.slice(1).map(data => htmlPost(data, { id: data.id })).join("");

    newsContainer.innerHTML = featuredHTML + (secondaryCards ? `<div class="posts">${secondaryCards}</div>` : "");
    usarImagenDeRespaldo(newsContainer);
    // El panel enlaza a noticias.html#noticia-<id>; la tarjeta aparece después de cargar.
    let destino = null;
    try {
      destino = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch { /* Un ancla mal formada no debe impedir mostrar las noticias. */ }
    if (destino) {
      destino.scrollIntoView({ block: "center" });
      destino.classList.add("is-target");
    }
  } catch (error) {
    mostrarError(newsContainer, error);
  }
}

// Las tres noticias más recientes en la página principal, en filas (.news-row).
async function loadHomeNews(homeNewsContainer) {
  try {
    const noticias = await fetchPublishedNews(3);
    if (noticias.length === 0) {
      homeNewsContainer.innerHTML = `
        <div style="padding: 2rem 0; color: var(--ink-3); font-size: 0.95rem;">
          No hay publicaciones recientes en este momento.
        </div>
      `;
      return;
    }

    homeNewsContainer.innerHTML = noticias.map(data => {
      const n = camposSeguros(data, "Corporativo", IMAGEN_RESPALDO);
      return `
        <a class="news-row" href="${n.enlace || "noticias.html#" + escapeHTML(encodeURIComponent(anclaNoticia(data.id)))}" ${n.enlace ? ATRIBUTOS_EXTERNOS : ""}>
          <time>${n.fecha}</time>
          <div>
            <h3>${n.titulo}</h3>
            <p class="news-row-desc">${n.resumen}</p>
            <span class="cat">${n.categoria}</span>
          </div>
          <span class="go" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>
          </span>
        </a>
      `;
    }).join("");
  } catch (error) {
    mostrarError(homeNewsContainer, error);
  }
}

const home = document.getElementById("home-news-container");
if (home) loadHomeNews(home);
const listado = document.getElementById("firebase-news-container");
if (listado) loadPublicNews(listado);
