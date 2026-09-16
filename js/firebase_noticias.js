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
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
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

// Carga automática de noticias en la página pública (noticias.html)
const newsContainer = document.getElementById("firebase-news-container");
const loadingMsg = document.getElementById("loading-msg");

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
  if (!newsContainer) return;

  try {
    const q = query(collection(db, "noticias"), orderBy("fecha_creacion", "desc"));
    let querySnapshot;
    
    try {
      querySnapshot = await getDocs(q);
    } catch (orderErr) {
      // Fallback si aún no hay índice o fecha_creacion en docs antiguos
      console.warn("Cargando sin ordenamiento específico:", orderErr);
      querySnapshot = await getDocs(collection(db, "noticias"));
    }

    if (querySnapshot.empty) {
      if (loadingMsg) {
        loadingMsg.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem; color: #64748B;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" style="margin-bottom: 1rem;">
              <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
            </svg>
            <h3 style="color: #1E1B4B; margin-bottom: 0.5rem;">Aún no hay publicaciones recientes</h3>
            <p>Las últimas novedades, comunicados y proyectos de Stratum Group aparecerán aquí muy pronto.</p>
          </div>
        `;
      }
      return;
    }

    // Limpiar mensaje de carga
    newsContainer.innerHTML = "";

    // Optimización de rendimiento: acumular en array e insertar de un solo golpe (evita repintar en cada loop)
    const tarjetas = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawFecha = data.fecha || (data.fecha_creacion?.toDate ? data.fecha_creacion.toDate().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente');
      const fechaTexto = escapeHTML(rawFecha);
      const categoria = escapeHTML(data.categoria || 'Corporativo');
      const titulo = escapeHTML(data.titulo || '');
      const resumen = escapeHTML(data.resumen || '');
      const rawImg = data.imagen && data.imagen.trim() !== "" ? data.imagen.trim() : 'assets/drone_landscape.png';
      // Seguridad: solo permitir URLs https:// o rutas relativas de assets (previene XSS via src)
      const imgSafe = /^https:\/\//i.test(rawImg) || /^assets\//i.test(rawImg) ? rawImg : 'assets/drone_landscape.png';
      const imagenUrl = escapeHTML(imgSafe);
      // Validar que el enlace sea estrictamente una URL web http o https para evitar javascript:
      const enlaceUrl = data.enlace && /^https?:\/\//i.test(data.enlace.trim()) ? escapeHTML(data.enlace.trim()) : null;

      const articleHTML = `
        <article class="news-card-d6">
          <div class="news-card-img-wrap">
            <img src="${imagenUrl}" alt="${titulo}" class="news-card-img" onerror="this.onerror=null;this.src='assets/drone_landscape.png'">
            <span class="news-card-badge">
              ${categoria}
            </span>
          </div>
          <div class="news-card-body">
            <span class="news-card-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${fechaTexto}
            </span>
            <h3 class="news-card-title">${titulo}</h3>
            <p class="news-card-excerpt">${resumen}</p>
            ${enlaceUrl ? `
              <div class="news-card-footer">
                <a href="${enlaceUrl}" target="_blank" rel="noopener noreferrer" class="news-card-link">
                  Ver noticia completa &rarr;
                </a>
              </div>
            ` : ''}
          </div>
        </article>
      `;
      tarjetas.push(articleHTML);
    });

    newsContainer.innerHTML = tarjetas.join("");

  } catch (error) {
    console.error("Error cargando noticias desde Firebase:", error);
    if (loadingMsg) {
      loadingMsg.innerHTML = `
        <div style="text-align: center; color: #EF4444; padding: 2rem;">
          <p><strong>Hubo un problema al conectar con la base de datos.</strong></p>
          <p style="font-size: 0.85rem; color: #64748B;">Revisa que las reglas de Cloud Firestore permitan lectura pública.</p>
        </div>
      `;
    }
  }
}

// Ejecutar si estamos en noticias.html
if (newsContainer) {
  loadPublicNews();
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
  orderBy, 
  serverTimestamp,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  escapeHTML
};
