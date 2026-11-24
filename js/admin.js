// Panel de administración de noticias de Stratum Group.
import {
  db, auth, collection, getDocs, getDoc, addDoc, updateDoc, doc,
  query, where, orderBy,
  serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  writeBatch, escapeHTML,
  safeImageUrl, safeNewsLink
} from "./firebase_noticias.js?v=13";

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

function showLoginError(message) {
  loginAlert.textContent = message;
  loginAlert.style.display = "block";
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
  loadAdminNews();
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
  try {
    await signOut(auth);
    loginEmail.focus();
  } catch {
    publishAlert.textContent = "No se pudo cerrar la sesión. Intenta de nuevo.";
    publishAlert.className = "alert-box alert-error";
    publishAlert.style.display = "block";
  }
});

function resetNewsForm() {
  if (publishNewsForm) publishNewsForm.reset();
  if (editingNewsId) editingNewsId.value = "";
  if (formTitleText) formTitleText.textContent = "Publicar Nueva Noticia";
  if (btnPublish) {
    btnPublish.disabled = false;
    btnPublish.textContent = "Publicar Noticia en la Web";
  }
  if (btnCancelEdit) btnCancelEdit.style.display = "none";
}

if (btnCancelEdit) {
  btnCancelEdit.addEventListener("click", () => {
    resetNewsForm();
    if (publishAlert) publishAlert.style.display = "none";
  });
}

if (publishNewsForm) {
  publishNewsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btnPublish.disabled) return;
    if (publishAlert) publishAlert.style.display = "none";

    const isEditing = editingNewsId && editingNewsId.value.trim() !== "";
    const currentEditId = isEditing ? editingNewsId.value.trim() : null;

    if (btnPublish) {
      btnPublish.disabled = true;
      btnPublish.textContent = isEditing ? "Guardando cambios en la base de datos..." : "Publicando en la base de datos...";
    }

    const titulo = document.getElementById("newsTitle").value.trim();
    const categoria = document.getElementById("newsCategory").value;
    const resumen = document.getElementById("newsSummary").value.trim();
    const imagen = document.getElementById("newsImage").value.trim();
    const enlace = document.getElementById("newsLink").value.trim();

    const link = safeNewsLink(enlace);
    const image = safeImageUrl(imagen);
    let aviso;
    if (titulo.length < 2 || !resumen) aviso = "Escribe un título de al menos dos caracteres y un resumen.";
    else if (enlace && (!link || link.length > 2000)) aviso = "Revisa el enlace HTTPS de la noticia (máximo 2000 caracteres).";
    else if (imagen && (!image || image.length > 3000)) aviso = "Usa una imagen HTTPS o una ruta de assets/ o img/ (máximo 3000 caracteres).";
    if (aviso) {
      publishAlert.textContent = aviso;
      publishAlert.className = "alert-box alert-error";
      publishAlert.style.display = "block";
      btnPublish.disabled = false;
      btnPublish.textContent = isEditing ? "Guardar Cambios" : "Publicar Noticia en la Web";
      return;
    }

    try {
      if (isEditing) {
        // ACTUALIZACIÓN DE NOTICIA EXISTENTE (EDITAR)
        await updateDoc(doc(db, "noticias", currentEditId), {
          titulo: titulo,
          categoria: categoria,
          resumen: resumen,
          imagen: image,
          enlace: link,
          fecha_actualizacion: serverTimestamp()
        });

        if (publishAlert) {
          publishAlert.style.display = "block";
          publishAlert.className = "alert-box alert-success";
          publishAlert.textContent = "¡Noticia actualizada con éxito!";
        }
      } else {
        // CREACIÓN DE NOTICIA NUEVA (PUBLICAR)
        await addDoc(collection(db, "noticias"), {
          titulo: titulo,
          categoria: categoria,
          resumen: resumen,
          imagen: image,
          enlace: link,
          activo: true,
          fecha: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }),
          fecha_creacion: serverTimestamp()
        });

        if (publishAlert) {
          publishAlert.style.display = "block";
          publishAlert.className = "alert-box alert-success";
          publishAlert.textContent = "¡Noticia publicada con éxito!";
        }
      }

      resetNewsForm();
      loadAdminNews(); // Recargar lista
    } catch (error) {
      console.error("Error al guardar noticia:", error);
      if (publishAlert) {
        publishAlert.style.display = "block";
        publishAlert.className = "alert-box alert-error";
        if (error.code === "permission-denied" || (error.message && error.message.includes("permission"))) {
          publishAlert.textContent = "Error de permisos: Asegúrate de tener una sesión activa de administrador en el sistema.";
        } else {
          publishAlert.textContent = "Error al guardar: " + error.message;
        }
      }
    } finally {
      if (btnPublish) {
        btnPublish.disabled = false;
        btnPublish.textContent = editingNewsId.value ? "Guardar Cambios" : "Publicar Noticia en la Web";
      }
    }
  });
}

// 8. CARGAR LISTA DE NOTICIAS PARA ADMINISTRACIÓN
let listRequest = 0;
async function loadAdminNews() {
  const user = auth.currentUser;
  if (!adminNewsList || !user) return;
  const request = ++listRequest;
  const isCurrent = () => request === listRequest && auth.currentUser === user;
  adminNewsList.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>Cargando noticias...</p>";

  try {
    const querySnapshot = await getDocs(query(collection(db, "noticias"),
      where("activo", "==", true), orderBy("fecha_creacion", "desc")));
    if (!isCurrent()) return;
    
    if (querySnapshot.empty) {
      adminNewsList.innerHTML = "<p style='text-align: center; color: var(--text-muted); padding: 2rem;'>No hay noticias publicadas aún.</p>";
      return;
    }

    adminNewsList.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const imgUrl = escapeHTML(safeImageUrl(data.imagen) || "assets/drone_landscape.png");
      const tituloSeguro = escapeHTML(data.titulo || '');
      const fechaSegura = escapeHTML(data.fecha || 'Reciente');
      const catSegura = escapeHTML(data.categoria || 'General');

      const itemEl = document.createElement("div");
      itemEl.className = "news-item-card";
      itemEl.innerHTML = `
        <img src="${imgUrl}" alt="${tituloSeguro}" class="news-item-thumb">
        <div class="news-item-info">
          <h4>${tituloSeguro}</h4>
          <p>${fechaSegura} &bull; <strong style="color: var(--brand-purple);">${catSegura}</strong></p>
        </div>
        <div class="news-item-actions">
          <button class="btn-edit" title="Editar noticia">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="btn-cancel-retire" hidden>Cancelar</button>
          <button type="button" class="btn-delete" title="Retirar noticia">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      // Manejo seguro de error de imagen sin atributo inline (conforme a CSP)
      const thumbImg = itemEl.querySelector(".news-item-thumb");
      if (thumbImg) {
        thumbImg.addEventListener("error", () => {
          thumbImg.src = "assets/drone_landscape.png";
        }, { once: true });
      }

      // Evento de editar
      itemEl.querySelector(".btn-edit").addEventListener("click", () => {
        document.getElementById("newsTitle").value = data.titulo || "";
        document.getElementById("newsCategory").value = data.categoria || "Corporativo";
        document.getElementById("newsSummary").value = data.resumen || "";
        document.getElementById("newsImage").value = safeImageUrl(data.imagen);
        document.getElementById("newsLink").value = safeNewsLink(data.enlace);

        if (editingNewsId) editingNewsId.value = docId;
        if (formTitleText) formTitleText.textContent = "Editar Noticia";
        if (btnPublish) btnPublish.textContent = "Guardar Cambios";
        if (btnCancelEdit) btnCancelEdit.style.display = "inline-flex";
        if (publishAlert) publishAlert.style.display = "none";

        publishNewsForm.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("newsTitle").focus();
      });

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
          await loadAdminNews();
        } catch (error) {
          deleteBtn.disabled = false;
          cancelBtn.disabled = false;
          publishAlert.style.display = "block";
          publishAlert.className = "alert-box alert-error";
          publishAlert.textContent = "No se pudo retirar la noticia. Revisa tu conexión y tus permisos.";
          console.error("Error al retirar la noticia.", error.code);
        }
      });

      adminNewsList.appendChild(itemEl);
    });

  } catch (err) {
    if (!isCurrent()) return;
    console.error("Error listando noticias:", err);
    adminNewsList.innerHTML = "<p style='text-align:center; color: #EF4444;'>Error cargando noticias.</p>";
  }
}


// ==========================================
// 12. MÓDULO DE COPIAS DE SEGURIDAD (BACKUP & RESTORE - REQ. 21)
// ==========================================
const btnExportBackup = document.getElementById("btnExportBackup");
const backupFileInput = document.getElementById("backupFileInput");
const backupStatusMsg = document.getElementById("backupStatusMsg");

if (btnExportBackup) {
  btnExportBackup.addEventListener("click", async () => {
    try {
      if (backupStatusMsg) {
        backupStatusMsg.style.color = "#7B61FF";
        backupStatusMsg.textContent = "Generando copia de seguridad...";
      }

      const user = auth.currentUser;
      if (!user) return;
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
          fecha_actualizacion: d.fecha_actualizacion?.toDate?.().toISOString(),
          fecha_eliminacion: d.fecha_eliminacion?.toDate?.().toISOString(),
          fecha: d.fecha || "",
          autor: d.autor || "",
          fecha_creacion: d.fecha_creacion ? (d.fecha_creacion.toDate ? d.fecha_creacion.toDate().toISOString() : d.fecha_creacion) : (d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : new Date().toISOString())
        });
      });

      const backupData = {
        sistema: "Stratum Group S.A.S. - Panel de Noticias",
        version: "3.0",
        fecha_exportacion: new Date().toISOString(),
        usuario_exportador: auth.currentUser?.email || "admin",
        total_registros: records.length,
        datos: records
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `backup_stratum_noticias_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (backupStatusMsg) {
        backupStatusMsg.style.color = "#10B981";
        backupStatusMsg.textContent = `Copia descargada exitosamente (${records.length} registros).`;
      }
    } catch (err) {
      console.error("Error al exportar respaldo:", err);
      if (backupStatusMsg) {
        backupStatusMsg.style.color = "#EF4444";
        backupStatusMsg.textContent = "Error al exportar respaldo: " + err.message;
      }
    }
  });
}

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
    const safeLink = safeNewsLink(enlace);
    if (imagen && (!safeImageUrl(imagen) || safeImageUrl(imagen).length > 3000)) throw invalid("imagen");
    if (enlace && (!safeLink || safeLink.length > 2000)) throw invalid("enlace");
    if (typeof item.activo !== "boolean") throw invalid("activo");
    const dates = {};
    for (const field of ["fecha_creacion", "fecha_actualizacion", "fecha_eliminacion"]) {
      const value = item[field];
      if (value == null || value === "") continue;
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)
          || !Number.isFinite(Date.parse(value))) throw invalid(field);
      dates[field] = new Date(value);
    }
    return {
      id,
      data: {
        titulo,
        resumen: readText("resumen", 20000),
        categoria: readText("categoria", 100, "Corporativo"),
        imagen: safeImageUrl(imagen),
        enlace: safeLink,
        activo: item.activo,
        fecha: readText("fecha", 100),
        autor: readText("autor", 100),
        fecha_creacion: serverTimestamp(),
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
  backupStatusMsg.textContent = "Validando respaldo…";
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("El archivo supera 5 MB.");
    const records = parseBackup(await file.text());
    if (!confirm("¿Restaurar " + records.length + " noticias del archivo «" + file.name
        + "»? Se actualizarán las noticias con el mismo identificador.")) {
      backupStatusMsg.textContent = "Restauración cancelada.";
      return;
    }
    backupStatusMsg.textContent = "Restaurando noticias…";
    const batch = writeBatch(db);
    const news = collection(db, "noticias");
    for (const { id, data } of records) {
      batch.set(id ? doc(news, id) : doc(news), data, { merge: true });
    }
    await batch.commit();
    backupStatusMsg.textContent = "Restauración completada: " + records.length + " noticias sincronizadas.";
    loadAdminNews();
  } catch (error) {
    console.error("Error al restaurar respaldo:", error);
    backupStatusMsg.textContent = error.code
      ? "No se restauró ninguna noticia. Revisa los permisos y vuelve a intentarlo."
      : error.message;
  } finally {
    backupFileInput.value = "";
    backupFileInput.disabled = false;
  }
});
