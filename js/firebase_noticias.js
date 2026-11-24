// Configuración oficial y servicios de Firebase para Stratum Group
import { initializeApp } from "firebase/app";
import { esVistaLocal } from "./entorno.js";
import { 
  getFirestore, 
  collection, 
  getDoc, getDocs, connectFirestoreEmulator,
  writeBatch,
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  orderBy, 
  limit,
  serverTimestamp 
} from "firebase/firestore/lite";
import { 
  initializeAuth, connectAuthEmulator,
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  browserSessionPersistence
} from "firebase/auth";

// Configuración pública del SDK web; las reglas controlan el acceso.
const firebaseConfig = {
  apiKey: "AIzaSyCmhk8GsGVn3qcMsUgGNvHOUExV-Q48AT4",
  authDomain: "stratum-group.firebaseapp.com",
  projectId: "stratum-group",
  storageBucket: "stratum-group.firebasestorage.app",
  messagingSenderId: "1060403201870",
  appId: "1:1060403201870:web:c72ab431d64984bf00401f",
  measurementId: "G-XV8K98LN1V"
};

// Inicializar Firebase
const app = initializeApp(esVistaLocal ? {
  apiKey: "demo-stratum", projectId: "demo-stratum", appId: "demo-stratum"
} : firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app, { persistence: browserSessionPersistence });
if (esVistaLocal) {
  connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 18080);
}

// SEGURIDAD: escapa cualquier texto que venga de Firestore antes de insertarlo en el DOM.
// Evita ataques de Cross-Site Scripting (XSS almacenado).
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function safeNewsLink(value) {
  if (typeof value !== "string" || !/^https:\/\//i.test(value.trim())) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export function safeImageUrl(value) {
  const external = safeNewsLink(value);
  if (external) return external;
  if (typeof value !== "string") return "";
  const path = value.trim();
  return /^(?:assets|img)\/(?:[A-Za-z0-9_() -]+\/)*[A-Za-z0-9_() -]+\.(?:png|jpe?g|webp|gif|svg|avif)$/i.test(path)
    ? path
    : "";
}

async function fetchPublishedNews(max) {
  const snapshot = await getDocs(query(collection(db, "noticias"),
    where("activo", "==", true), orderBy("fecha_creacion", "desc"), limit(max)));
  return snapshot.docs.map(item => item.data());
}

export async function loadPublicNews() {
  const newsContainer = document.getElementById("firebase-news-container");
  if (!newsContainer) return;

  try {
    const docsActivos = await fetchPublishedNews(20);

    if (docsActivos.length === 0) {
      newsContainer.innerHTML = `
        <div class="empty-news-state" style="text-align: center; padding: 4rem 1.5rem; color: var(--ink-3, #666);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 1.2rem; display: block; opacity: 0.6;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <h3 style="font-size: 1.3rem; font-weight: 600; color: var(--ink, #111); margin-bottom: 0.5rem; font-family: var(--font-display);">No hay publicaciones disponibles</h3>
          <p style="max-width: 460px; margin: 0 auto; font-size: 0.95rem; line-height: 1.5;">Las novedades técnicas, normativas y comunicados de Stratum Group aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    // Limpiar contenedor (incluyendo mensaje de carga y skeleton)
    newsContainer.innerHTML = "";

    // Primera noticia destacada (.featured)
    const firstData = docsActivos[0];
    const fFecha = escapeHTML(firstData.fecha || (firstData.fecha_creacion?.toDate ? firstData.fecha_creacion.toDate().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'));
    const fCategoria = escapeHTML(firstData.categoria || 'Ingeniería minera');
    const fTitulo = escapeHTML(firstData.titulo || '');
    const fResumen = escapeHTML(firstData.resumen || '');
    const fImgUrl = escapeHTML(safeImageUrl(firstData.imagen) || 'img/metodologia_paso4.jpg');
    const fEnlace = escapeHTML(safeNewsLink(firstData.enlace));
    const featuredTag = fEnlace ? 'a' : 'article';

    const featuredHTML = `
      <${featuredTag} class="featured" ${fEnlace ? `href="${fEnlace}" target="_blank" rel="noopener noreferrer"` : ''}>
        <div class="featured__img"><img src="${fImgUrl}" alt=""></div>
        <div class="featured__body">
          <div class="featured__meta"><span class="cat">${fCategoria}</span><time>${fFecha}</time></div>
          <h2>${fTitulo}</h2>
          <p>${fResumen}</p>
          ${fEnlace ? '<span class="link">Leer artículo completo <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>' : ''}
        </div>
      </${featuredTag}>
    `;

    // Siguientes noticias en cuadrícula editorial (.posts)
    let postsHTML = "";
    if (docsActivos.length > 1) {
      const secondaryCards = docsActivos.slice(1).map((data) => {
        const pFecha = escapeHTML(data.fecha || (data.fecha_creacion?.toDate ? data.fecha_creacion.toDate().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'));
        const pCategoria = escapeHTML(data.categoria || 'Minería Estratégica');
        const pTitulo = escapeHTML(data.titulo || '');
        const pResumen = escapeHTML(data.resumen || '');
        const pImgUrl = escapeHTML(safeImageUrl(data.imagen) || 'assets/drone_landscape.png');
        const pEnlace = escapeHTML(safeNewsLink(data.enlace));
        const postTag = pEnlace ? 'a' : 'article';

        return `
          <${postTag} class="post" ${pEnlace ? `href="${pEnlace}" target="_blank" rel="noopener noreferrer"` : ''}>
            <div class="post__img"><img src="${pImgUrl}" alt="" loading="lazy"></div>
            <div class="post__body">
              <div class="post__meta"><time>${pFecha}</time> &bull; <span class="cat">${pCategoria}</span></div>
              <h3>${pTitulo}</h3>
              <p class="post__desc">${pResumen}</p>
              ${pEnlace ? '<span class="post__link">Leer artículo completo &rarr;</span>' : ''}
            </div>
          </${postTag}>
        `;
      }).join("");

      postsHTML = `<div class="posts">${secondaryCards}</div>`;
    }

    newsContainer.innerHTML = featuredHTML + postsHTML;

    // Manejo seguro de fallback para imágenes rotas sin inline handlers (CSP seguro)
    newsContainer.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => {
        img.src = "assets/drone_landscape.png";
      }, { once: true });
    });

  } catch (error) {
    console.error("Error cargando noticias desde Firebase:", error);
    if (newsContainer) {
      newsContainer.innerHTML = `
        <div class="error-news-state" style="text-align: center; padding: 3rem 1.5rem; color: var(--ink-3, #666);">
          <p style="font-size: 0.95rem;">No fue posible cargar las noticias en este momento. Por favor recarga la página o intenta más tarde.</p>
        </div>
      `;
    }
  }
}

// Carga automática de noticias destacadas en la página principal (index.html)
export async function loadHomeNews() {
  const homeNewsContainer = document.getElementById("home-news-container");
  if (!homeNewsContainer) return;

  try {
    const docsActivos = await fetchPublishedNews(3);

    // Si no hay noticias en Firestore, mostramos aviso sutil en lugar de noticias no existentes
    if (docsActivos.length === 0) {
      homeNewsContainer.innerHTML = `
        <div style="padding: 2rem 0; color: var(--ink-3); font-size: 0.95rem;">
          No hay publicaciones recientes en este momento.
        </div>
      `;
      return;
    }

    // Mostrar máximo 3 noticias en el inicio
    const noticiasHome = docsActivos.slice(0, 3);
    const tarjetas = [];

    noticiasHome.forEach((data) => {
      const rawFecha = data.fecha || (data.fecha_creacion?.toDate ? data.fecha_creacion.toDate().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente');
      const fechaTexto = escapeHTML(rawFecha);
      const categoria = escapeHTML(data.categoria || 'Corporativo');
      const titulo = escapeHTML(data.titulo || '');
      const resumen = escapeHTML(data.resumen || '');
      const imagenUrl = escapeHTML(safeImageUrl(data.imagen) || 'assets/drone_landscape.png');
      const externalUrl = safeNewsLink(data.enlace);
      const enlaceUrl = escapeHTML(externalUrl || 'noticias.html');
      const isExternal = Boolean(externalUrl);

      if (homeNewsContainer.classList.contains("news-rows")) {
        const rowHTML = `
          <a class="news-row" href="${enlaceUrl}" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            <time>${fechaTexto}</time>
            <div>
              <h3>${titulo}</h3>
              <p class="news-row-desc">${resumen}</p>
              <span class="cat">${categoria}</span>
            </div>
            <span class="go" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>
            </span>
          </a>
        `;
        tarjetas.push(rowHTML);
      } else {
        const articleHTML = `
          <article class="news-card-d6" style="margin: 0;">
            <div class="news-card-img-wrap">
              <img src="${imagenUrl}" alt="" class="news-card-img" loading="lazy">
              <span class="news-card-badge">${categoria}</span>
            </div>
            <div class="news-card-body">
              <span class="news-card-date">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ${fechaTexto}
              </span>
              <h3 class="news-card-title">${titulo}</h3>
              <p class="news-card-excerpt">${resumen}</p>
              <div class="news-card-footer">
                <a href="${enlaceUrl}" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''} class="news-card-link">
                  ${isExternal ? 'Ver noticia completa &rarr;' : 'Leer en Noticias &rarr;'}
                </a>
              </div>
            </div>
          </article>
        `;
        tarjetas.push(articleHTML);
      }
    });

    homeNewsContainer.innerHTML = tarjetas.join("");

    // Fallback de imágenes de forma segura
    homeNewsContainer.querySelectorAll(".news-card-img").forEach((img) => {
      img.addEventListener("error", () => {
        img.src = "assets/drone_landscape.png";
      }, { once: true });
    });

  } catch (error) {
    console.warn("No se pudieron cargar las noticias del inicio.", error.code);
    homeNewsContainer.textContent = "No se pudieron cargar las noticias. Recarga la página para volver a intentarlo.";
  }
}

// Inicialización automática y segura según el estado del DOM
function initAllNews() {
  if (document.getElementById("firebase-news-container")) {
    loadPublicNews();
  }
  if (document.getElementById("home-news-container")) {
    loadHomeNews();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAllNews);
} else {
  initAllNews();
}

// Exportar servicios para el panel de administración
export { 
  app, 
  db, 
  auth, 
  collection, 
  getDocs, 
  getDoc,
  writeBatch,
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  orderBy, 
  limit,
  serverTimestamp,
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  escapeHTML
};
