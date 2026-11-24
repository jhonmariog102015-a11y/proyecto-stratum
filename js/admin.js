// Panel de administración de noticias de Stratum Group.
import {
  db, auth, collection, getDocs, getDoc, addDoc, updateDoc, doc,
  query, where, orderBy, deleteField, getCount,
  serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  writeBatch
} from "./firebase_noticias.js?v=14";

const { escapeHTML, safeImageUrl, safeNewsLink, fechaVisible, anclaNoticia, htmlPost } = formatoNoticias;

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");
const loginAlert = document.getElementById("loginAlert");
const currentUserEmail = document.getElementById("currentUserEmail");
const btnLogout = document.getElementById("btnLogout");
const publishNewsForm = document.getElementById("publishNewsForm");
const btnPublish = document.getElementById("btnPublish");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const editingNewsId = document.getElementById("editingNewsId");
const formTitleText = document.getElementById("formTitleText");
const publishAlert = document.getElementById("publishAlert");
const adminNewsList = document.getElementById("adminNewsList");
const newsCategory = document.getElementById("newsCategory");
const listFilters = [...document.querySelectorAll("[data-vista-lista]")];
const btnExportBackup = document.getElementById("btnExportBackup");
const backupFileInput = document.getElementById("backupFileInput");
const backupStatusMsg = document.getElementById("backupStatusMsg");
const newsTitle = document.getElementById("newsTitle");
const newsSummary = document.getElementById("newsSummary");
const newsImage = document.getElementById("newsImage");
const newsLink = document.getElementById("newsLink");
const newsTitleCount = document.getElementById("newsTitleCount");
const newsSummaryCount = document.getElementById("newsSummaryCount");
const newsPreview = document.getElementById("newsPreview");
const newsSearch = document.getElementById("newsSearch");
const newsCategoryFilter = document.getElementById("newsCategoryFilter");
const newsListSummary = document.getElementById("newsListSummary");
const statPublicadas = document.getElementById("statPublicadas");
const statRetiradas = document.getElementById("statRetiradas");
const statRespaldo = document.getElementById("statRespaldo");
const BACKUP_KEY = "stratum_ultimo_respaldo";

// Estado del panel (declarado antes de cualquier callback de Firebase).
let savedForm = "";
let editingData = null;
let listView = "activas";
let listRequest = 0;
let loadedNews = [];

const PUBLISH_LABEL = "Publicar Noticia en la Web";
const SAVE_LABEL = "Guardar Cambios";

function showLoginError(message) {
  loginAlert.textContent = message;
  loginAlert.style.display = "block";
}

function showPublishAlert(message, type) {
  publishAlert.textContent = message;
  // Clases completas (alert-success, alert-error) para que se puedan buscar en el código.
  publishAlert.className = "alert-box " + (type === "success" ? "alert-success" : "alert-error");
  publishAlert.style.display = "block";
}

let inactivityTimer;
const inactivityEvents = ["pointerdown", "keydown", "scroll", "touchstart"];

function resetInactivity() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(async () => {
    try {
      await signOut(auth);
      showLoginError("La sesión se cerró por inactividad.");
    } catch {
      showLoginError("No se pudo cerrar la sesión automáticamente. Intenta cerrarla manualmente.");
    }
  }, 15 * 60 * 1000);
}

function stopInactivityWatcher() {
  clearTimeout(inactivityTimer);
  inactivityEvents.forEach(event => document.removeEventListener(event, resetInactivity));
}

async function showDashboard(user) {
  const permission = await getDoc(doc(db, "administradores", user.uid));
  if (auth.currentUser?.uid !== user.uid) return;
  if (!permission.exists()) {
    await signOut(auth);
    showLoginError("Esta cuenta no tiene acceso al panel. Solicita autorización a la persona que administra Firebase.");
    return;
  }
  loginAlert.style.display = "none";
  loginSection.style.display = "none";
  dashboardSection.style.display = "flex";
  currentUserEmail.textContent = user.email || "";
  btnLogout.focus();
  setListView("activas");
  updateStats();
  showLastBackup();
  inactivityEvents.forEach(event => document.addEventListener(event, resetInactivity, { passive: true }));
  resetInactivity();
}

onAuthStateChanged(auth, async user => {
  stopInactivityWatcher();
  loginSection.style.display = "flex";
  dashboardSection.style.display = "none";
  currentUserEmail.textContent = "";
  adminNewsList.replaceChildren();
  resetNewsForm();
  publishAlert.style.display = "none";
  backupStatusMsg.textContent = "";
  if (!user) return;

  try {
    await showDashboard(user);
  } catch (error) {
    console.error("No se pudo verificar el acceso:", error.code);
    if (auth.currentUser?.uid !== user.uid) return;
    await signOut(auth).catch(() => {});
    showLoginError("No se pudo verificar el acceso. Revisa tu conexión e intenta de nuevo.");
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (btnLogin.disabled) return;
  loginAlert.style.display = "none";
  btnLogin.disabled = true;
  btnLogin.textContent = "Verificando…";
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
    loginForm.reset();
  } catch (error) {
    showLoginError(error.code === "auth/too-many-requests"
      ? "Demasiados intentos. Espera unos minutos antes de volver a intentar."
      : "No se pudo iniciar sesión. Revisa tus credenciales y conexión.");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Iniciar sesión";
  }
});

btnLogout.addEventListener("click", async () => {
  if (!confirmDiscard()) return;
  try {
    await signOut(auth);
    loginEmail.focus();
  } catch {
    showPublishAlert("No se pudo cerrar la sesión. Intenta de nuevo.", "error");
  }
});

// Una categoría que no está en la lista (de un respaldo o de una versión anterior) se conserva
// como opción temporal; sin ella el selector quedaría vacío y la edición la borraría.
function selectCategory(value) {
  newsCategory.querySelectorAll("option[data-temporal]").forEach(option => option.remove());
  const category = value || "Corporativo";
  if (![...newsCategory.options].some(option => option.value === category)) {
    const option = new Option(category + " (categoría actual)", category);
    option.dataset.temporal = "";
    newsCategory.append(option);
  }
  newsCategory.value = category;
}

// CAMBIOS SIN GUARDAR, CONTADORES Y VISTA PREVIA
const formState = () => JSON.stringify([newsTitle.value, newsCategory.value, newsSummary.value,
  newsImage.value, newsLink.value]);
const isDirty = () => formState() !== savedForm;

function markClean() {
  savedForm = formState();
}

// Pregunta antes de descartar lo escrito en el formulario.
function confirmDiscard() {
  return !isDirty() || confirm("Hay cambios sin guardar en el formulario. ¿Quieres descartarlos?");
}

window.addEventListener("beforeunload", event => {
  if (auth.currentUser && isDirty()) event.preventDefault();
});

function updateFormExtras() {
  newsTitleCount.textContent = newsTitle.value.length + "/300";
  newsSummaryCount.textContent = newsSummary.value.length + "/20000";
  const fecha = editingData?.fecha || editingData?.fecha_creacion ? editingData
    : { fecha: new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }) };
  newsPreview.innerHTML = htmlPost({
    titulo: newsTitle.value.trim() || "Título de la noticia",
    resumen: newsSummary.value.trim() || "El resumen aparecerá aquí.",
    categoria: newsCategory.value,
    imagen: newsImage.value.trim(),
    enlace: newsLink.value.trim(),
    fecha: fecha.fecha,
    fecha_creacion: fecha.fecha_creacion
  });
  newsPreview.querySelector("img").addEventListener("error", event => {
    event.target.src = "assets/drone_landscape.png";
  }, { once: true });
}

publishNewsForm.addEventListener("input", updateFormExtras);
publishNewsForm.addEventListener("change", updateFormExtras);

function resetNewsForm() {
  publishNewsForm.reset();
  selectCategory("Corporativo");
  editingNewsId.value = "";
  editingData = null;
  formTitleText.textContent = "Publicar Nueva Noticia";
  btnPublish.disabled = false;
  btnPublish.textContent = PUBLISH_LABEL;
  btnCancelEdit.style.display = "none";
  updateFormExtras();
  markClean();
}

btnCancelEdit.addEventListener("click", () => {
  if (!confirmDiscard()) return;
  resetNewsForm();
  publishAlert.style.display = "none";
});

publishNewsForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (btnPublish.disabled) return;
  publishAlert.style.display = "none";

  const currentEditId = editingNewsId.value.trim() || null;
  const idleLabel = currentEditId ? SAVE_LABEL : PUBLISH_LABEL;
  const titulo = document.getElementById("newsTitle").value.trim();
  const categoria = newsCategory.value;
  const resumen = document.getElementById("newsSummary").value.trim();
  const imagen = document.getElementById("newsImage").value.trim();
  const enlace = document.getElementById("newsLink").value.trim();

  const link = safeNewsLink(enlace);
  const image = safeImageUrl(imagen);
  let aviso;
  if (titulo.length < 2 || !resumen) aviso = "Escribe un título de al menos dos caracteres y un resumen.";
  else if (!categoria) aviso = "Elige una categoría.";
  else if (enlace && (!link || link.length > 2000)) aviso = "Revisa el enlace HTTPS de la noticia (máximo 2000 caracteres).";
  else if (imagen && (!image || image.length > 3000)) aviso = "Usa una imagen HTTPS o una ruta de assets/ o img/ (máximo 3000 caracteres).";
  if (aviso) {
    showPublishAlert(aviso, "error");
    return;
  }

  btnPublish.disabled = true;
  btnPublish.textContent = currentEditId ? "Guardando cambios en la base de datos..." : "Publicando en la base de datos...";
  try {
    if (currentEditId) {
      await updateDoc(doc(db, "noticias", currentEditId), {
        titulo, categoria, resumen, imagen: image, enlace: link,
        fecha_actualizacion: serverTimestamp()
      });
      showPublishAlert("¡Noticia actualizada con éxito!", "success");
    } else {
      await addDoc(collection(db, "noticias"), {
        titulo, categoria, resumen, imagen: image, enlace: link,
        activo: true,
        fecha: new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }),
        fecha_creacion: serverTimestamp()
      });
      showPublishAlert("¡Noticia publicada con éxito!", "success");
    }
    resetNewsForm();
    setListView("activas");
    updateStats();
  } catch (error) {
    console.error("Error al guardar noticia:", error);
    showPublishAlert(error.code === "permission-denied"
      ? "Error de permisos: Asegúrate de tener una sesión activa de administrador en el sistema."
      : "Error al guardar: " + error.message, "error");
    btnPublish.disabled = false;
    btnPublish.textContent = idleLabel;
  }
});

// LISTA DE NOTICIAS: publicadas o retiradas

// Cantidades de noticias publicadas y retiradas (consultas de conteo, sin leer cada noticia).
async function updateStats() {
  const user = auth.currentUser;
  try {
    const noticias = collection(db, "noticias");
    const [activas, retiradas] = await Promise.all([true, false].map(estado =>
      getCount(query(noticias, where("activo", "==", estado)))));
    if (auth.currentUser !== user) return;
    statPublicadas.textContent = activas.data().count;
    statRetiradas.textContent = retiradas.data().count;
  } catch (error) {
    console.error("No se pudo contar las noticias.", error.code);
  }
}

function showLastBackup() {
  let fecha = null;
  try { fecha = new Date(localStorage.getItem(BACKUP_KEY) || NaN); } catch { /* Sin almacenamiento. */ }
  statRespaldo.textContent = fecha && Number.isFinite(fecha.getTime())
    ? fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" })
    : "Ninguno";
}

function setListView(view) {
  listView = view;
  listFilters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.vistaLista === view)));
  loadAdminNews();
}

listFilters.forEach(button => button.addEventListener("click", () => setListView(button.dataset.vistaLista)));

const ICON_EDIT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
const ICON_VIEW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
const ICON_RETIRE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

function showListMessage(text, color = "var(--text-muted)") {
  const message = document.createElement("p");
  message.style.cssText = "text-align: center; padding: 2rem; color: " + color + ";";
  message.textContent = text;
  adminNewsList.replaceChildren(message);
}

function startEditing(docId, data) {
  if (editingNewsId.value !== docId && !confirmDiscard()) return;
  newsTitle.value = data.titulo || "";
  selectCategory(data.categoria);
  newsSummary.value = data.resumen || "";
  newsImage.value = safeImageUrl(data.imagen);
  newsLink.value = safeNewsLink(data.enlace);
  editingNewsId.value = docId;
  editingData = data;
  updateFormExtras();
  markClean();
  formTitleText.textContent = "Editar Noticia";
  btnPublish.textContent = SAVE_LABEL;
  btnCancelEdit.style.display = "inline-flex";
  publishAlert.style.display = "none";
  publishNewsForm.scrollIntoView({ behavior: "smooth", block: "center" });
  newsTitle.focus();
}

function retireControls(itemEl, docId) {
  const deleteBtn = itemEl.querySelector(".btn-delete");
  const cancelBtn = itemEl.querySelector(".btn-cancel-retire");
  const icon = deleteBtn.firstElementChild;
  cancelBtn.addEventListener("click", () => {
    cancelBtn.hidden = true;
    deleteBtn.title = "Retirar noticia";
    deleteBtn.replaceChildren(icon);
    deleteBtn.focus();
  });
  deleteBtn.addEventListener("click", async () => {
    if (cancelBtn.hidden) {
      cancelBtn.hidden = false;
      deleteBtn.textContent = "Confirmar retiro";
      deleteBtn.title = "Retirar la noticia de la página";
      return;
    }
    deleteBtn.disabled = true;
    cancelBtn.disabled = true;
    try {
      await updateDoc(doc(db, "noticias", docId), {
        activo: false, fecha_eliminacion: serverTimestamp()
      });
      if (editingNewsId.value === docId) resetNewsForm();
      updateStats();
      await loadAdminNews();
    } catch (error) {
      deleteBtn.disabled = false;
      cancelBtn.disabled = false;
      showPublishAlert("No se pudo retirar la noticia. Revisa tu conexión y tus permisos.", "error");
      console.error("Error al retirar la noticia.", error.code);
    }
  });
}

function reactivateControl(itemEl, docId) {
  const button = itemEl.querySelector(".btn-reactivate");
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await updateDoc(doc(db, "noticias", docId), {
        activo: true, fecha_eliminacion: deleteField(), fecha_actualizacion: serverTimestamp()
      });
      showPublishAlert("Noticia publicada de nuevo en la web.", "success");
      updateStats();
      await loadAdminNews();
    } catch (error) {
      button.disabled = false;
      showPublishAlert("No se pudo reactivar la noticia. Revisa tu conexión y tus permisos.", "error");
      console.error("Error al reactivar la noticia.", error.code);
    }
  });
}

async function loadAdminNews() {
  const user = auth.currentUser;
  if (!user) return;
  const request = ++listRequest;
  const activas = listView === "activas";
  const isCurrent = () => request === listRequest && auth.currentUser === user;
  loadedNews = [];
  newsListSummary.textContent = "";
  showListMessage("Cargando noticias...");

  try {
    const querySnapshot = await getDocs(query(collection(db, "noticias"),
      where("activo", "==", activas), orderBy("fecha_creacion", "desc")));
    if (!isCurrent()) return;
    querySnapshot.forEach(docSnap => loadedNews.push({ id: docSnap.id, data: docSnap.data(), activas }));
    updateCategoryFilter();
    renderList();
  } catch (err) {
    if (!isCurrent()) return;
    console.error("Error listando noticias:", err);
    showListMessage("Error cargando noticias.", "#EF4444");
  }
}

// Categorías presentes en la lista, conservando la elegida si sigue existiendo.
function updateCategoryFilter() {
  const selected = newsCategoryFilter.value;
  const categories = [...new Set(loadedNews.map(({ data }) => data.categoria || "General"))]
    .sort((a, b) => a.localeCompare(b, "es"));
  newsCategoryFilter.replaceChildren(new Option("Todas las categorías", ""),
    ...categories.map(category => new Option(category, category)));
  newsCategoryFilter.value = categories.includes(selected) ? selected : "";
}

const normalizar = texto => (texto || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function renderList() {
  if (!auth.currentUser || listRequest === 0) return;
  const activas = listView === "activas";
  if (loadedNews.length === 0) {
    newsListSummary.textContent = "";
    showListMessage(activas ? "No hay noticias publicadas aún." : "No hay noticias retiradas.");
    return;
  }
  const search = normalizar(newsSearch.value.trim());
  const category = newsCategoryFilter.value;
  const visible = loadedNews.filter(({ data }) =>
    (!category || (data.categoria || "General") === category)
    && (!search || normalizar(data.titulo + " " + data.resumen).includes(search)));
  newsListSummary.textContent = visible.length === loadedNews.length
    ? loadedNews.length + (loadedNews.length === 1 ? " noticia" : " noticias")
    : "Mostrando " + visible.length + " de " + loadedNews.length;
  if (visible.length === 0) {
    showListMessage("Ninguna noticia coincide con la búsqueda.");
    return;
  }

  adminNewsList.replaceChildren(...visible.map(({ id: docId, data, activas: esActiva }) => {
    const imgUrl = escapeHTML(safeImageUrl(data.imagen) || "assets/drone_landscape.png");
    const itemEl = document.createElement("div");
    itemEl.className = "news-item-card";
    itemEl.innerHTML = `
      <img src="${imgUrl}" alt="" class="news-item-thumb">
      <div class="news-item-info">
        <h4>${escapeHTML(data.titulo || "")}</h4>
        <p>${escapeHTML(fechaVisible(data))} &bull; <strong style="color: var(--brand-purple);">${escapeHTML(data.categoria || "General")}</strong></p>
      </div>
      <div class="news-item-actions">
        ${esActiva ? `
        <a class="btn-view" href="noticias.html#${escapeHTML(encodeURIComponent(anclaNoticia(docId)))}" target="_blank" rel="noopener" title="Ver en la web" aria-label="Ver en la web">${ICON_VIEW}</a>
        <button type="button" class="btn-edit" title="Editar noticia" aria-label="Editar noticia">${ICON_EDIT}</button>
        <button type="button" class="btn-cancel-retire" hidden>Cancelar</button>
        <button type="button" class="btn-delete" title="Retirar noticia">${ICON_RETIRE}</button>` : `
        <button type="button" class="btn-cancel-edit btn-reactivate">Reactivar</button>`}
      </div>
    `;
    itemEl.querySelector(".news-item-thumb").addEventListener("error", event => {
      event.target.src = "assets/drone_landscape.png";
    }, { once: true });
    if (esActiva) {
      itemEl.querySelector(".btn-edit").addEventListener("click", () => startEditing(docId, data));
      retireControls(itemEl, docId);
    } else {
      reactivateControl(itemEl, docId);
    }
    return itemEl;
  }));
}

newsSearch.addEventListener("input", renderList);
newsCategoryFilter.addEventListener("change", renderList);

// COPIAS DE SEGURIDAD
function isoDate(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return undefined;
}

function setBackupStatus(message, color = "#64748B") {
  backupStatusMsg.style.color = color;
  backupStatusMsg.textContent = message;
}

btnExportBackup.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user || btnExportBackup.disabled) return;
  btnExportBackup.disabled = true;
  setBackupStatus("Generando copia de seguridad...", "#7B61FF");
  try {
    const snap = await getDocs(collection(db, "noticias"));
    if (auth.currentUser !== user) return;
    const records = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      records.push({
        id: docSnap.id,
        titulo: d.titulo || "",
        categoria: d.categoria || "",
        resumen: d.resumen || "",
        imagen: d.imagen || "",
        enlace: d.enlace || "",
        activo: d.activo === true,
        fecha: d.fecha || "",
        autor: d.autor || "",
        // Sin una fecha real, el campo se omite: al restaurar se conserva la del documento.
        fecha_creacion: isoDate(d.fecha_creacion) ?? isoDate(d.createdAt),
        fecha_actualizacion: isoDate(d.fecha_actualizacion),
        fecha_eliminacion: isoDate(d.fecha_eliminacion)
      });
    });

    const backupData = {
      sistema: "Stratum Group S.A.S. - Panel de Noticias",
      version: "3.1",
      fecha_exportacion: new Date().toISOString(),
      usuario_exportador: user.email || "admin",
      total_registros: records.length,
      datos: records
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_stratum_noticias_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Algunos navegadores leen el archivo después del clic; se libera más tarde.
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    setBackupStatus(`Copia descargada exitosamente (${records.length} registros).`, "#10B981");
    try { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); } catch { /* Sin almacenamiento. */ }
    showLastBackup();
  } catch (err) {
    console.error("Error al exportar respaldo:", err);
    setBackupStatus("Error al exportar respaldo: " + err.message, "#EF4444");
  } finally {
    btnExportBackup.disabled = false;
  }
});

function parseBackup(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("El archivo no contiene JSON válido.");
  }
  const items = Array.isArray(parsed) ? parsed : parsed?.datos;
  if (!Array.isArray(items) || items.length === 0 || items.length > 400) {
    throw new Error("El respaldo debe contener entre 1 y 400 noticias.");
  }

  const ids = new Set();
  return items.map((item, index) => {
    const invalid = field => new Error("Noticia " + (index + 1) + ": revisa " + field + ".");
    if (!item || typeof item !== "object" || Array.isArray(item)) throw invalid("el formato");
    const readText = (key, max, fallback = "") => {
      const value = item[key] ?? fallback;
      if (typeof value !== "string" || value.length > max) throw invalid(key);
      return value.trim();
    };
    const id = item.id;
    if (id !== undefined) {
      if (typeof id !== "string" || !id || id === "." || id === ".." || /[\/\\]/.test(id)
          || /^__.*__$/.test(id) || new TextEncoder().encode(id).length > 1500 || ids.has(id)) {
        throw invalid("el identificador (inválido o repetido)");
      }
      ids.add(id);
    }
    const titulo = readText("titulo", 300);
    if (titulo.length < 2) throw invalid("titulo");
    const imagen = readText("imagen", 3000);
    const enlace = readText("enlace", 2000);
    const safeImage = safeImageUrl(imagen);
    const safeLink = safeNewsLink(enlace);
    if (imagen && (!safeImage || safeImage.length > 3000)) throw invalid("imagen");
    if (enlace && (!safeLink || safeLink.length > 2000)) throw invalid("enlace");
    if (typeof item.activo !== "boolean") throw invalid("activo");
    const categoria = readText("categoria", 100, "Corporativo") || "Corporativo";
    const dates = {};
    for (const field of ["fecha_creacion", "fecha_actualizacion", "fecha_eliminacion"]) {
      const value = item[field];
      if (value == null || value === "") continue;
      if (!isoDate(value)) throw invalid(field);
      dates[field] = new Date(value);
    }
    return {
      id,
      data: {
        titulo,
        resumen: readText("resumen", 20000),
        categoria,
        imagen: safeImage,
        enlace: safeLink,
        activo: item.activo,
        fecha: readText("fecha", 100),
        autor: readText("autor", 100),
        fecha_actualizacion: serverTimestamp(),
        ...dates
      }
    };
  });
}

backupFileInput.addEventListener("change", async () => {
  const file = backupFileInput.files[0];
  if (!file || backupFileInput.disabled) return;
  backupFileInput.disabled = true;
  setBackupStatus("Validando respaldo…");
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("El archivo supera 5 MB.");
    const records = parseBackup(await file.text());
    if (!confirm("¿Restaurar " + records.length + " noticias del archivo «" + file.name
        + "»? Se actualizarán las noticias con el mismo identificador.")) {
      setBackupStatus("Restauración cancelada.");
      return;
    }
    setBackupStatus("Restaurando noticias…");
    const news = collection(db, "noticias");
    // Una noticia existente conserva su fecha de creación si el respaldo no trae una.
    const existing = new Set();
    (await getDocs(news)).forEach(docSnap => {
      if (docSnap.get("fecha_creacion")) existing.add(docSnap.id);
    });
    const batch = writeBatch(db);
    for (const { id, data } of records) {
      if (!data.fecha_creacion && !(id && existing.has(id))) data.fecha_creacion = serverTimestamp();
      batch.set(id ? doc(news, id) : doc(news), data, { merge: true });
    }
    await batch.commit();
    setBackupStatus("Restauración completada: " + records.length + " noticias sincronizadas.", "#10B981");
    updateStats();
    loadAdminNews();
  } catch (error) {
    console.error("Error al restaurar respaldo:", error);
    setBackupStatus(error.code
      ? "No se restauró ninguna noticia. Revisa los permisos y vuelve a intentarlo."
      : error.message, "#EF4444");
  } finally {
    backupFileInput.value = "";
    backupFileInput.disabled = false;
  }
});
