// Panel de administración de noticias de Stratum Group.
import {
  db, auth, collection, getDocs, getDoc, addDoc, updateDoc, doc,
  query, where, orderBy, deleteField, deleteDoc, getCount,
  serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  writeBatch
} from "./firebase_noticias.js?v=15";

const { escapeHTML, safeImageUrl, safeNewsLink, fechaVisible, anclaNoticia, htmlPost } = formatoNoticias;
const $ = id => document.getElementById(id);

const loginSection = $("loginSection");
const dashboardSection = $("dashboardSection");
const loginForm = $("loginForm");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const btnLogin = $("btnLogin");
const loginAlert = $("loginAlert");
const currentUserEmail = $("currentUserEmail");
const btnLogout = $("btnLogout");
const publishNewsForm = $("publishNewsForm");
const btnPublish = $("btnPublish");
const btnSaveDraft = $("btnSaveDraft");
const btnCancelEdit = $("btnCancelEdit");
const editingNewsId = $("editingNewsId");
const formTitleText = $("formTitleText");
const publishAlert = $("publishAlert");
const adminNewsList = $("adminNewsList");
const newsCategory = $("newsCategory");
const listFilters = [...document.querySelectorAll("[data-vista-lista]")];
const navLinks = [...document.querySelectorAll(".adm-nav-link")];
const btnExportBackup = $("btnExportBackup");
const backupFileInput = $("backupFileInput");
const backupStatusMsg = $("backupStatusMsg");
const newsTitle = $("newsTitle");
const newsSummary = $("newsSummary");
const newsImage = $("newsImage");
const newsLink = $("newsLink");
const newsTitleCount = $("newsTitleCount");
const newsSummaryCount = $("newsSummaryCount");
const newsPreview = $("newsPreview");
const newsSearch = $("newsSearch");
const newsCategoryFilter = $("newsCategoryFilter");
const newsListSummary = $("newsListSummary");
const statPublicadas = $("statPublicadas");
const statBorradores = $("statBorradores");
const statRespaldo = $("statRespaldo");
const counts = { activas: $("countActivas"), borradores: $("countBorradores"), retiradas: $("countRetiradas") };
const BACKUP_KEY = "stratum_ultimo_respaldo";
const IMAGEN_RESPALDO = "assets/drone_landscape.webp";
const FECHA = { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" };
const hoy = () => new Date().toLocaleDateString("es-CO", FECHA);

// Estado del panel (declarado antes de cualquier callback de Firebase).
let savedForm = "";
let editing = null; // { id, data, borrador } de la noticia en edición
let listView = "activas";
let listRequest = 0;
let loadedNews = [];
let inactivityTimer;
const inactivityEvents = ["pointerdown", "keydown", "scroll", "touchstart"];

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

// SESIÓN
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
  dashboardSection.style.display = "";
  currentUserEmail.textContent = user.email || "";
  btnLogout.focus();
  setListView("activas");
  updateStats();
  showLastBackup();
  updateActiveSection();
  inactivityEvents.forEach(event => document.addEventListener(event, resetInactivity, { passive: true }));
  resetInactivity();
}

onAuthStateChanged(auth, async user => {
  stopInactivityWatcher();
  loginSection.style.display = "flex";
  dashboardSection.style.display = "none";
  currentUserEmail.textContent = "";
  adminNewsList.replaceChildren();
  loadedNews = [];
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

// MENÚ LATERAL: marca la sección visible y «Nueva noticia» prepara un formulario vacío.
function markSection(id) {
  navLinks.forEach(link => {
    if (link.dataset.seccion === id) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

navLinks.forEach(link => link.addEventListener("click", event => {
  if (link.id === "navNuevaNoticia") {
    if (!confirmDiscard()) {
      event.preventDefault();
      return;
    }
    resetNewsForm();
    publishAlert.style.display = "none";
    requestAnimationFrame(() => newsTitle.focus({ preventScroll: true }));
  }
  markSection(link.dataset.seccion);
}));

// La sección activa es la última que ya llegó a la parte superior de la pantalla; al final de
// la página se marca la última, aunque no alcance a subir hasta arriba.
let spyFrame = 0;
function updateActiveSection() {
  spyFrame = 0;
  if (dashboardSection.style.display === "none") return;
  const sections = navLinks.map(link => $(link.dataset.seccion)).filter(Boolean);
  const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  let active = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= Math.min(innerHeight / 3, 120)) active = section;
  }
  markSection((atBottom ? sections.at(-1) : active).id);
}
addEventListener("scroll", () => {
  if (!spyFrame) spyFrame = requestAnimationFrame(updateActiveSection);
}, { passive: true });

// FORMULARIO: cambios sin guardar, contadores y vista previa
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

function updateFormExtras() {
  newsTitleCount.textContent = newsTitle.value.length + "/300";
  newsSummaryCount.textContent = newsSummary.value.length + "/20000";
  // Una noticia publicada conserva su fecha; una nueva o un borrador se publicarán hoy.
  const publicada = editing && !editing.borrador;
  newsPreview.innerHTML = htmlPost({
    titulo: newsTitle.value.trim() || "Título de la noticia",
    resumen: newsSummary.value.trim() || "El resumen aparecerá aquí.",
    categoria: newsCategory.value,
    imagen: newsImage.value.trim(),
    enlace: newsLink.value.trim(),
    fecha: publicada ? editing.data.fecha : hoy(),
    fecha_creacion: publicada ? editing.data.fecha_creacion : undefined
  });
  newsPreview.querySelector("img").addEventListener("error", event => {
    event.target.src = IMAGEN_RESPALDO;
  }, { once: true });
}

publishNewsForm.addEventListener("input", updateFormExtras);
publishNewsForm.addEventListener("change", updateFormExtras);

function setFormButtons() {
  const publicada = editing && !editing.borrador;
  formTitleText.textContent = !editing ? "Nueva noticia" : publicada ? "Editar noticia" : "Editar borrador";
  btnPublish.textContent = publicada ? "Guardar cambios" : "Publicar";
  // Una noticia publicada no vuelve a borrador; para ocultarla se retira.
  btnSaveDraft.hidden = Boolean(publicada);
  btnSaveDraft.textContent = "Guardar borrador";
  btnPublish.disabled = false;
  btnSaveDraft.disabled = false;
  btnCancelEdit.style.display = editing ? "inline-flex" : "none";
}

function resetNewsForm() {
  publishNewsForm.reset();
  selectCategory("Corporativo");
  editingNewsId.value = "";
  editing = null;
  setFormButtons();
  updateFormExtras();
  markClean();
}

btnCancelEdit.addEventListener("click", () => {
  if (!confirmDiscard()) return;
  resetNewsForm();
  publishAlert.style.display = "none";
});

function startEditing(docId, data) {
  if (editingNewsId.value !== docId && !confirmDiscard()) return;
  newsTitle.value = data.titulo || "";
  selectCategory(data.categoria);
  newsSummary.value = data.resumen || "";
  newsImage.value = safeImageUrl(data.imagen);
  newsLink.value = safeNewsLink(data.enlace);
  editingNewsId.value = docId;
  editing = { id: docId, data, borrador: data.borrador === true };
  setFormButtons();
  updateFormExtras();
  markClean();
  publishAlert.style.display = "none";
  $("editor").scrollIntoView({ behavior: "smooth", block: "start" });
  newsTitle.focus({ preventScroll: true });
}

// GUARDAR: «Publicar» (envío del formulario) o «Guardar borrador».
async function saveNews(asDraft) {
  if (btnPublish.disabled) return;
  publishAlert.style.display = "none";
  const titulo = newsTitle.value.trim();
  const categoria = newsCategory.value;
  const resumen = newsSummary.value.trim();
  const imagen = newsImage.value.trim();
  const enlace = newsLink.value.trim();
  const link = safeNewsLink(enlace);
  const image = safeImageUrl(imagen);

  let aviso;
  if (titulo.length < 2) aviso = "Escribe un título de al menos dos caracteres.";
  else if (!resumen && !asDraft) aviso = "Escribe el resumen antes de publicar.";
  else if (!categoria) aviso = "Elige una categoría.";
  else if (enlace && (!link || link.length > 2000)) aviso = "Revisa el enlace HTTPS de la noticia (máximo 2000 caracteres).";
  else if (imagen && (!image || image.length > 3000)) aviso = "Usa una imagen HTTPS o una ruta de assets/ o img/ (máximo 3000 caracteres).";
  if (aviso) {
    showPublishAlert(aviso, "error");
    return;
  }

  const campos = { titulo, categoria, resumen, imagen: image, enlace: link };
  const publicada = editing && !editing.borrador;
  const boton = asDraft ? btnSaveDraft : btnPublish;
  const textoBoton = boton.textContent;
  btnPublish.disabled = true;
  btnSaveDraft.disabled = true;
  boton.textContent = "Guardando…";
  try {
    let mensaje;
    if (publicada) {
      await updateDoc(doc(db, "noticias", editing.id), { ...campos, fecha_actualizacion: serverTimestamp() });
      mensaje = "Cambios guardados. La noticia ya está actualizada en la web.";
    } else if (asDraft) {
      if (editing) {
        await updateDoc(doc(db, "noticias", editing.id), { ...campos, fecha_actualizacion: serverTimestamp() });
      } else {
        await addDoc(collection(db, "noticias"), {
          ...campos, activo: false, borrador: true, fecha_creacion: serverTimestamp()
        });
      }
      mensaje = "Borrador guardado. No se muestra en la web hasta que lo publiques.";
    } else {
      // Nueva noticia o borrador que se publica: la fecha de publicación es la de hoy.
      const publicacion = { ...campos, activo: true, fecha: hoy(), fecha_creacion: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(db, "noticias", editing.id), {
          ...publicacion, borrador: false, fecha_actualizacion: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "noticias"), publicacion);
      }
      mensaje = "¡Noticia publicada con éxito!";
    }
    resetNewsForm();
    showPublishAlert(mensaje, "success");
    setListView(asDraft && !publicada ? "borradores" : "activas");
    updateStats();
  } catch (error) {
    console.error("Error al guardar noticia:", error);
    showPublishAlert(error.code === "permission-denied"
      ? "No se pudo guardar por permisos. Revisa que tu sesión siga activa y que las reglas de Firestore estén actualizadas."
      : "Error al guardar: " + error.message, "error");
    btnPublish.disabled = false;
    btnSaveDraft.disabled = false;
    boton.textContent = textoBoton;
  }
}

publishNewsForm.addEventListener("submit", event => {
  event.preventDefault();
  saveNews(false);
});
btnSaveDraft.addEventListener("click", () => {
  // El resumen puede quedar vacío en un borrador; el título sigue siendo obligatorio.
  if (!newsTitle.reportValidity()) return;
  saveNews(true);
});

// RESUMEN
async function updateStats() {
  const user = auth.currentUser;
  try {
    const noticias = collection(db, "noticias");
    const contar = async (...filtros) => (await getCount(query(noticias, ...filtros))).data().count;
    const [activas, inactivas, borradores] = await Promise.all([
      contar(where("activo", "==", true)),
      contar(where("activo", "==", false)),
      contar(where("borrador", "==", true))
    ]);
    if (auth.currentUser !== user) return;
    statPublicadas.textContent = activas;
    statBorradores.textContent = borradores;
    counts.activas.textContent = activas;
    counts.borradores.textContent = borradores;
    counts.retiradas.textContent = Math.max(inactivas - borradores, 0);
  } catch (error) {
    console.error("No se pudo contar las noticias.", error.code);
  }
}

function showLastBackup() {
  let fecha = null;
  try { fecha = new Date(localStorage.getItem(BACKUP_KEY) || NaN); } catch { /* Sin almacenamiento. */ }
  statRespaldo.textContent = fecha && Number.isFinite(fecha.getTime())
    ? fecha.toLocaleDateString("es-CO", FECHA)
    : "Ninguno";
}

// LISTA DE NOTICIAS: publicadas, borradores o retiradas
const VACIA = {
  activas: "No hay noticias publicadas aún.",
  borradores: "No hay borradores.",
  retiradas: "No hay noticias retiradas."
};

function setListView(view) {
  listView = view;
  listFilters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.vistaLista === view)));
  loadAdminNews();
}

listFilters.forEach(button => button.addEventListener("click", () => setListView(button.dataset.vistaLista)));

const ICON = {
  view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14M10 11v6M14 11v6"/></svg>',
  retire: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg>'
};

function showListMessage(text, error = false) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 4;
  cell.className = error ? "adm-empty adm-empty-error" : "adm-empty";
  cell.textContent = text;
  row.append(cell);
  adminNewsList.replaceChildren(row);
}

function retireControls(row, docId) {
  const deleteBtn = row.querySelector(".btn-delete");
  const cancelBtn = row.querySelector(".btn-cancel-retire");
  const icon = deleteBtn.firstElementChild;
  cancelBtn.addEventListener("click", () => {
    cancelBtn.hidden = true;
    row.classList.remove("is-confirming");
    deleteBtn.title = "Retirar noticia";
    deleteBtn.classList.remove("is-confirm");
    deleteBtn.replaceChildren(icon);
    deleteBtn.focus();
  });
  deleteBtn.addEventListener("click", async () => {
    if (cancelBtn.hidden) {
      cancelBtn.hidden = false;
      row.classList.add("is-confirming");
      deleteBtn.textContent = "Sí, retirar";
      deleteBtn.title = "Retirar la noticia de la página";
      deleteBtn.classList.add("is-confirm");
      return;
    }
    deleteBtn.disabled = true;
    cancelBtn.disabled = true;
    try {
      await updateDoc(doc(db, "noticias", docId), {
        activo: false, borrador: false, fecha_eliminacion: serverTimestamp()
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

// Eliminar para siempre: solo en Retiradas y con una segunda confirmación en la fila.
function deleteForeverControl(row, docId, titulo) {
  const deleteBtn = row.querySelector(".btn-delete-forever");
  const cancelBtn = row.querySelector(".btn-cancel-delete");
  const icon = deleteBtn.firstElementChild;
  const restore = () => {
    cancelBtn.hidden = true;
    row.classList.remove("is-confirming");
    deleteBtn.classList.remove("is-confirm");
    deleteBtn.setAttribute("aria-label", "Eliminar definitivamente");
    deleteBtn.replaceChildren(icon);
  };
  cancelBtn.addEventListener("click", () => {
    restore();
    deleteBtn.focus();
  });
  deleteBtn.addEventListener("click", async () => {
    if (cancelBtn.hidden) {
      cancelBtn.hidden = false;
      row.classList.add("is-confirming");
      deleteBtn.classList.add("is-confirm");
      deleteBtn.textContent = "Sí, eliminar";
      deleteBtn.setAttribute("aria-label", "Sí, eliminar «" + titulo + "» para siempre");
      return;
    }
    deleteBtn.disabled = true;
    cancelBtn.disabled = true;
    try {
      await deleteDoc(doc(db, "noticias", docId));
      showPublishAlert("Noticia eliminada definitivamente. Solo se puede recuperar desde un respaldo.", "success");
      updateStats();
      await loadAdminNews();
    } catch (error) {
      deleteBtn.disabled = false;
      cancelBtn.disabled = false;
      restore();
      showPublishAlert(error.code === "permission-denied"
        ? "No se pudo eliminar por permisos. Revisa que las reglas de Firestore estén actualizadas."
        : "No se pudo eliminar la noticia. Revisa tu conexión.", "error");
      console.error("Error al eliminar la noticia.", error.code);
    }
  });
}

function reactivateControl(row, docId) {
  const button = row.querySelector(".btn-reactivate");
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await updateDoc(doc(db, "noticias", docId), {
        activo: true, borrador: false, fecha_eliminacion: deleteField(), fecha_actualizacion: serverTimestamp()
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
  const view = listView;
  const isCurrent = () => request === listRequest && auth.currentUser === user;
  loadedNews = [];
  newsListSummary.textContent = "";
  showListMessage("Cargando noticias…");

  try {
    // Borradores y retiradas comparten activo == false; se separan por el campo borrador.
    const querySnapshot = await getDocs(query(collection(db, "noticias"),
      where("activo", "==", view === "activas"), orderBy("fecha_creacion", "desc")));
    if (!isCurrent()) return;
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const esBorrador = data.borrador === true;
      if (view === "activas" || (view === "borradores") === esBorrador) {
        loadedNews.push({ id: docSnap.id, data, view });
      }
    });
    updateCategoryFilter();
    renderList();
  } catch (err) {
    if (!isCurrent()) return;
    console.error("Error listando noticias:", err);
    showListMessage("Error cargando noticias. Recarga la página para volver a intentarlo.", true);
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

function rowActions(view, docId) {
  if (view === "retiradas") {
    return '<button type="button" class="adm-btn adm-btn-secondary adm-btn-sm btn-reactivate">Reactivar</button>'
      + '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm btn-cancel-delete" hidden>Cancelar</button>'
      + `<button type="button" class="adm-icon-btn btn-delete-forever" title="Eliminar definitivamente" aria-label="Eliminar definitivamente">${ICON.trash}</button>`;
  }
  const ver = view === "activas"
    ? `<a class="adm-icon-btn btn-view" href="noticias.html#${escapeHTML(encodeURIComponent(anclaNoticia(docId)))}" target="_blank" rel="noopener" title="Ver en la web" aria-label="Ver en la web">${ICON.view}</a>`
    : "";
  return ver
    + `<button type="button" class="adm-icon-btn btn-edit" title="Editar noticia" aria-label="Editar noticia">${ICON.edit}</button>`
    + '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm btn-cancel-retire" hidden>Cancelar</button>'
    + `<button type="button" class="adm-icon-btn btn-delete" title="Retirar noticia">${ICON.retire}</button>`;
}

function renderList() {
  if (!auth.currentUser || listRequest === 0) return;
  if (loadedNews.length === 0) {
    newsListSummary.textContent = "";
    showListMessage(VACIA[listView]);
    return;
  }
  const search = normalizar(newsSearch.value.trim());
  const category = newsCategoryFilter.value;
  const visible = loadedNews.filter(({ data }) =>
    (!category || (data.categoria || "General") === category)
    && (!search || normalizar(data.titulo + " " + data.resumen).includes(search)));
  newsListSummary.textContent = (visible.length === loadedNews.length
    ? loadedNews.length + (loadedNews.length === 1 ? " noticia" : " noticias")
    : "Mostrando " + visible.length + " de " + loadedNews.length)
    + (listView === "retiradas" ? ". Lo que elimines aquí no se puede recuperar, salvo desde un respaldo." : "");
  if (visible.length === 0) {
    showListMessage("Ninguna noticia coincide con la búsqueda.");
    return;
  }

  adminNewsList.replaceChildren(...visible.map(({ id: docId, data, view }) => {
    const row = document.createElement("tr");
    row.className = "adm-row";
    const fecha = view === "borradores"
      ? '<span class="adm-badge">Borrador</span>'
      : escapeHTML(fechaVisible(data));
    row.innerHTML = `
      <td class="adm-cell-title" data-etiqueta="Título">
        <img src="${escapeHTML(safeImageUrl(data.imagen) || IMAGEN_RESPALDO)}" alt="" class="adm-thumb" width="44" height="44" loading="lazy">
        <span class="adm-title-text">${escapeHTML(data.titulo || "Sin título")}</span>
      </td>
      <td class="adm-cell-muted" data-etiqueta="Categoría">${escapeHTML(data.categoria || "General")}</td>
      <td class="adm-cell-muted" data-etiqueta="Fecha">${fecha}</td>
      <td class="adm-cell-actions"><div class="adm-row-actions">${rowActions(view, docId)}</div></td>
    `;
    row.querySelector(".adm-thumb").addEventListener("error", event => {
      event.target.src = IMAGEN_RESPALDO;
    }, { once: true });
    if (view === "retiradas") {
      reactivateControl(row, docId);
      deleteForeverControl(row, docId, data.titulo || "Sin título");
    } else {
      row.querySelector(".btn-edit").addEventListener("click", () => startEditing(docId, data));
      retireControls(row, docId);
    }
    return row;
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

function setBackupStatus(message, tipo = "") {
  backupStatusMsg.textContent = message;
  backupStatusMsg.dataset.tipo = tipo;
}

btnExportBackup.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user || btnExportBackup.disabled) return;
  btnExportBackup.disabled = true;
  setBackupStatus("Generando copia de seguridad…");
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
        borrador: d.borrador === true,
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
      version: "3.2",
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
    setBackupStatus(`Copia descargada (${records.length} registros).`, "ok");
    try { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); } catch { /* Sin almacenamiento. */ }
    showLastBackup();
  } catch (err) {
    console.error("Error al exportar respaldo:", err);
    setBackupStatus("Error al exportar respaldo: " + err.message, "error");
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
    const borrador = item.borrador ?? false;
    if (typeof borrador !== "boolean" || (borrador && item.activo)) throw invalid("borrador");
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
        borrador,
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
    setBackupStatus("Restauración completada: " + records.length + " noticias sincronizadas.", "ok");
    updateStats();
    loadAdminNews();
  } catch (error) {
    console.error("Error al restaurar respaldo:", error);
    setBackupStatus(error.code
      ? "No se restauró ninguna noticia. Revisa los permisos y vuelve a intentarlo."
      : error.message, "error");
  } finally {
    backupFileInput.value = "";
    backupFileInput.disabled = false;
  }
});
