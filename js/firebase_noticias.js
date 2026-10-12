// Configuración oficial y servicios de Firebase para Stratum Group
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy, 
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Credenciales oficiales de Stratum Group
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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

export async function loadPublicNews() {
  const newsContainer = document.getElementById("firebase-news-container");
  const loadingMsg = document.getElementById("loading-msg");
  if (!newsContainer) return;

  try {
    let querySnapshot;
    
    try {
      // Intentar ordenar por fecha_creacion descendente
      const q = query(
        collection(db, "noticias"), 
        orderBy("fecha_creacion", "desc"), 
        limit(20)
      );
      querySnapshot = await getDocs(q);
    } catch (orderErr) {
      // Si la colección no tiene índice o tiene documentos legacy sin fecha_creacion
      querySnapshot = null;
    }

    // Si la consulta ordenada falló o vino vacía, consultar la colección directa
    if (!querySnapshot || querySnapshot.empty) {
      querySnapshot = await getDocs(collection(db, "noticias"));
    }

    // Filtrar en memoria: incluir noticias activas y noticias legacy (donde 'activo' aún no esté definido)
    // Excluir únicamente las que hayan sido eliminadas lógicamente (activo === false)
    const docsActivos = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.activo !== false) {
        docsActivos.push({ id: docSnap.id, data });
      }
    });

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
    const firstItem = docsActivos[0];
    const firstData = firstItem.data;
    const fFecha = escapeHTML(firstData.fecha || (firstData.fecha_creacion?.toDate ? firstData.fecha_creacion.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'));
    const fCategoria = escapeHTML(firstData.categoria || 'Ingeniería minera');
    const fTitulo = escapeHTML(firstData.titulo || '');
    const fResumen = escapeHTML(firstData.resumen || '');
    const fRawImg = firstData.imagen && firstData.imagen.trim() !== "" ? firstData.imagen.trim() : 'img/metodologia_paso4.jpg';
    const fImgSafe = /^(https:\/\/|assets\/|img\/)/i.test(fRawImg) ? fRawImg : 'img/metodologia_paso4.jpg';
    const fImgUrl = escapeHTML(fImgSafe);
    const fEnlace = firstData.enlace && /^https?:\/\//i.test(firstData.enlace.trim()) ? escapeHTML(firstData.enlace.trim()) : null;

    const featuredHTML = `
      <a class="featured" href="${fEnlace || '#'}" ${fEnlace ? 'target="_blank" rel="noopener noreferrer"' : ''}>
        <div class="featured__img"><img src="${fImgUrl}" alt="${fTitulo}"></div>
        <div class="featured__body">
          <div class="featured__meta"><span class="cat">${fCategoria}</span><time>${fFecha}</time></div>
          <h2>${fTitulo}</h2>
          <p>${fResumen}</p>
          <span class="link">${fEnlace ? 'Leer artículo completo en el medio' : 'Ver comunicado'} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
        </div>
      </a>
    `;

    // Siguientes noticias en cuadrícula editorial (.posts)
    let postsHTML = "";
    if (docsActivos.length > 1) {
      const secondaryCards = docsActivos.slice(1).map(({ id, data }) => {
        const pFecha = escapeHTML(data.fecha || (data.fecha_creacion?.toDate ? data.fecha_creacion.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente'));
        const pCategoria = escapeHTML(data.categoria || 'Minería Estratégica');
        const pTitulo = escapeHTML(data.titulo || '');
        const pResumen = escapeHTML(data.resumen || '');
        const pRawImg = data.imagen && data.imagen.trim() !== "" ? data.imagen.trim() : 'assets/drone_landscape.png';
        const pImgSafe = /^(https:\/\/|assets\/|img\/)/i.test(pRawImg) ? pRawImg : 'assets/drone_landscape.png';
        const pImgUrl = escapeHTML(pImgSafe);
        const pEnlace = data.enlace && /^https?:\/\//i.test(data.enlace.trim()) ? escapeHTML(data.enlace.trim()) : null;

        return `
          <a class="post" href="${pEnlace || '#'}" ${pEnlace ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            <div class="post__img"><img src="${pImgUrl}" alt="${pTitulo}" loading="lazy"></div>
            <div class="post__body">
              <div class="post__meta"><time>${pFecha}</time> &bull; <span class="cat">${pCategoria}</span></div>
              <h3>${pTitulo}</h3>
              <p class="post__desc">${pResumen}</p>
              <span class="post__link">${pEnlace ? 'Leer artículo completo &rarr;' : 'Ver detalle &rarr;'}</span>
            </div>
          </a>
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
    let querySnapshot = null;
    try {
      const q = query(
        collection(db, "noticias"), 
        orderBy("fecha_creacion", "desc"), 
        limit(6)
      );
      querySnapshot = await getDocs(q);
    } catch (orderErr) {
      querySnapshot = null;
    }

    if (!querySnapshot || querySnapshot.empty) {
      querySnapshot = await getDocs(collection(db, "noticias"));
    }

    const docsActivos = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.activo !== false) {
        docsActivos.push({ id: docSnap.id, data });
      }
    });

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

    noticiasHome.forEach(({ id, data }) => {
      const rawFecha = data.fecha || (data.fecha_creacion?.toDate ? data.fecha_creacion.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente');
      const fechaTexto = escapeHTML(rawFecha);
      const categoria = escapeHTML(data.categoria || 'Corporativo');
      const titulo = escapeHTML(data.titulo || '');
      const resumen = escapeHTML(data.resumen || '');
      const rawImg = data.imagen && data.imagen.trim() !== "" ? data.imagen.trim() : 'assets/drone_landscape.png';
      const imgSafe = /^(https:\/\/|assets\/|img\/)/i.test(rawImg) ? rawImg : 'assets/drone_landscape.png';
      const imagenUrl = escapeHTML(imgSafe);
      const enlaceUrl = data.enlace && /^https?:\/\//i.test(data.enlace.trim()) ? escapeHTML(data.enlace.trim()) : 'noticias.html';
      const isExternal = enlaceUrl.startsWith('http');

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
              <img src="${imagenUrl}" alt="${titulo}" class="news-card-img" loading="lazy">
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
    console.warn("Aviso: No se pudo conectar con Firestore para noticias en el inicio, usando contenido local:", error);
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
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy, 
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  escapeHTML
};
