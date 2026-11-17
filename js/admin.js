// Panel de administración de noticias de Stratum Group.
import {
  db, auth, collection, getDocs, getDocFromServer, addDoc, updateDoc, doc,
  serverTimestamp, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  writeBatch, escapeHTML,
  safeImageUrl, safeNewsLink
} from "./firebase_noticias.js?v=12";

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
  const permission = await getDocFromServer(doc(db, "administradores", user.uid));
  if (!permission.exists()) {
    await signOut(auth);
    showLoginError("Esta cuenta no tiene acceso al panel. Solicita autorización a la persona que administra Firebase.");
    return;
  }
  if (auth.currentUser?.uid !== user.uid) return;
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

    // Validación de seguridad para URLs externas
    if (enlace && (!safeNewsLink(enlace) || safeNewsLink(enlace).length > 2000)) {
      if (publishAlert) {
        publishAlert.style.display = "block";
        publishAlert.className = "alert-box alert-error";
        publishAlert.textContent = "El enlace externo debe ser una URL HTTPS válida.";
      }
      if (btnPublish) {
        btnPublish.disabled = false;
        btnPublish.textContent = isEditing ? "Guardar Cambios" : "Publicar Noticia en la Web";
      }
      return;
    }

    if (imagen && !safeImageUrl(imagen)) {
      if (publishAlert) {
        publishAlert.style.display = "block";
        publishAlert.className = "alert-box alert-error";
        publishAlert.textContent = "La URL de la imagen debe comenzar con https:// o ser una ruta interna válida (assets/... o img/...).";
      }
      if (btnPublish) {
        btnPublish.disabled = false;
        btnPublish.textContent = isEditing ? "Guardar Cambios" : "Publicar Noticia en la Web";
      }
      return;
    }

    try {
      if (isEditing) {
        // ACTUALIZACIÓN DE NOTICIA EXISTENTE (EDITAR)
        await updateDoc(doc(db, "noticias", currentEditId), {
          titulo: titulo,
          categoria: categoria,
          resumen: resumen,
          imagen: safeImageUrl(imagen),
          enlace: safeNewsLink(enlace),
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
          imagen: safeImageUrl(imagen),
          enlace: safeNewsLink(enlace),
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
async function loadAdminNews() {
  if (!adminNewsList) return;
  adminNewsList.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>Cargando noticias...</p>";

  try {
    const querySnapshot = await getDocs(collection(db, "noticias"));
    
    if (querySnapshot.empty) {
      adminNewsList.innerHTML = "<p style='text-align: center; color: var(--text-muted); padding: 2rem;'>No hay noticias publicadas aún.</p>";
      return;
    }

    adminNewsList.innerHTML = "";

    activeDocs.forEach((docSnap) => {
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
          <button class="btn-delete" title="Eliminar noticia">
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

      // Evento de eliminar (sin confirm() que puede ser bloqueado por el navegador)
      const deleteBtn = itemEl.querySelector(".btn-delete");
      deleteBtn.addEventListener("click", async () => {
        // Si ya está en modo confirmación, ejecutar la eliminación lógica (Soft Delete)
        if (deleteBtn.dataset.confirming === "true") {
          try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
            // Soft delete: mantiene el respaldo en Firestore pero oculta la noticia
            await updateDoc(doc(db, "noticias", docId), {
              activo: false,
              fecha_eliminacion: serverTimestamp()
            });
            if (editingNewsId && editingNewsId.value === docId) {
              resetNewsForm();
            }
            loadAdminNews();
          } catch (delErr) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
            deleteBtn.dataset.confirming = "false";
            if (publishAlert) {
              publishAlert.style.display = "block";
              publishAlert.className = "alert-box alert-error";
              publishAlert.textContent = "Error al eliminar: " + delErr.message;
            }
          }
          return;
        }
        // Primer clic: cambiar a modo confirmación
        deleteBtn.dataset.confirming = "true";
        deleteBtn.title = "Haz clic de nuevo para confirmar";
        deleteBtn.style.background = "#DC2626";
        deleteBtn.style.color = "#fff";
        deleteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        // Auto-cancelar después de 3 segundos
        setTimeout(() => {
          if (deleteBtn.dataset.confirming === "true") {
            deleteBtn.dataset.confirming = "false";
            deleteBtn.title = "Eliminar noticia";
            deleteBtn.style.background = "";
            deleteBtn.style.color = "";
            deleteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
          }
        }, 3000);
      });

      adminNewsList.appendChild(itemEl);
    });

  } catch (err) {
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

      const snap = await getDocs(collection(db, "noticias"));
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
    if (imagen && !safeImageUrl(imagen)) throw invalid("imagen");
    if (enlace && (!safeLink || safeLink.length > 2000)) throw invalid("enlace");
    if (typeof item.activo !== "boolean") throw invalid("activo");
    const fechaCreacion = item.fecha_creacion ? new Date(item.fecha_creacion) : null;
    if (fechaCreacion && (typeof item.fecha_creacion !== "string"
        || !/^\d{4}-\d{2}-\d{2}T/.test(item.fecha_creacion)
        || !Number.isFinite(fechaCreacion.getTime()))) {
      throw invalid("fecha_creacion");
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
        fecha_creacion: fechaCreacion || serverTimestamp(),
        fecha_actualizacion: serverTimestamp()
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
