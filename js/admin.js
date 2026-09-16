// Panel de Administración de Noticias y Seguridad - Stratum Group
import { 
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
  serverTimestamp,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  escapeHTML
} from "./firebase_noticias.js?v=3";

// Elementos de la interfaz
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const authSubtitle = document.getElementById("authSubtitle");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const btnLogin = document.getElementById("btnLogin");

const registerForm = document.getElementById("registerForm");
const regEmail = document.getElementById("regEmail");
const regSecretCode = document.getElementById("regSecretCode");
const regPassword = document.getElementById("regPassword");
const regPasswordConfirm = document.getElementById("regPasswordConfirm");
const btnRegister = document.getElementById("btnRegister");

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

const addEmailForm = document.getElementById("addEmailForm");
const newAuthEmail = document.getElementById("newAuthEmail");
const authorizedEmailsList = document.getElementById("authorizedEmailsList");
const updateMasterKeyForm = document.getElementById("updateMasterKeyForm");
const newMasterKey = document.getElementById("newMasterKey");
const securityAlert = document.getElementById("securityAlert");

// 0. FUNCIÓN CRIPTOGRÁFICA SHA-256 (Nativa en el navegador con Web Crypto API)
export async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 1. ALTERNAR PESTAÑAS (INICIAR SESIÓN / REGISTRAR ADMINISTRADOR)
export function switchAuthTab(tab) {
  if (!tabLogin || !tabRegister || !loginForm || !registerForm) return;

  if (tab === 'login') {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    if (authSubtitle) authSubtitle.textContent = "Ingresa con tus credenciales de Stratum Group";
    if (loginAlert) loginAlert.style.display = "none";
  } else {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    if (authSubtitle) authSubtitle.textContent = "Crea tu cuenta administradora para gestionar noticias";
    if (loginAlert) loginAlert.style.display = "none";
  }
}

// Exponer globalmente para onclicks si existen y vincular listeners
window.switchAuthTab = switchAuthTab;
if (tabLogin) tabLogin.addEventListener("click", () => switchAuthTab("login"));
if (tabRegister) tabRegister.addEventListener("click", () => switchAuthTab("register"));

// 2. ESTADO DE AUTENTICACIÓN
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuario conectado -> Mostrar Dashboard
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "flex";
    if (currentUserEmail) currentUserEmail.textContent = user.email;
    loadAdminNews();
    loadSecurityConfig(user.email);
  } else {
    // Usuario desconectado -> Mostrar Login
    if (loginSection) loginSection.style.display = "flex";
    if (dashboardSection) dashboardSection.style.display = "none";
  }
});

// 3. INICIAR SESIÓN
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginAlert) loginAlert.style.display = "none";
    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = "Verificando...";
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
      loginForm.reset();
    } catch (error) {
      console.error("Error de login:", error);
      if (loginAlert) {
        loginAlert.style.display = "block";
        loginAlert.className = "alert-box alert-error";
        
        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
          loginAlert.textContent = "Correo o contraseña incorrectos. Si aún no te has registrado, usa la pestaña 'Registrar Admin'.";
        } else if (error.code === "auth/too-many-requests") {
          loginAlert.textContent = "Demasiados intentos fallidos. Espera unos minutos.";
        } else if (error.code === "auth/configuration-not-found") {
          loginAlert.innerHTML = "<strong>Falta activar la Autenticación en Firebase:</strong><br>Abre este enlace: <a href='https://console.firebase.google.com/project/stratum-group/authentication' target='_blank' style='color:#991B1B; text-decoration:underline; font-weight:700;'>Consola de Stratum Group</a>, haz clic en <strong>Comenzar</strong> y activa <strong>Correo electrónico/Contraseña</strong>.";
        } else {
          loginAlert.textContent = "Error al iniciar sesión: " + error.message;
        }
      }
    } finally {
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = "Iniciar Sesión";
      }
    }
  });
}

// 4. REGISTRAR NUEVO ADMINISTRADOR CON VALIDACIÓN EN FIREBASE
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginAlert) loginAlert.style.display = "none";

    const email = regEmail.value.trim().toLowerCase();
    const inputCode = regSecretCode.value.trim();
    const password = regPassword.value;
    const confirmPassword = regPasswordConfirm.value;

    if (password !== confirmPassword) {
      if (loginAlert) {
        loginAlert.style.display = "block";
        loginAlert.className = "alert-box alert-error";
        loginAlert.textContent = "Las contraseñas no coinciden. Asegúrate de escribirlas iguales.";
      }
      return;
    }

    if (btnRegister) {
      btnRegister.disabled = true;
      btnRegister.textContent = "Consultando autorización en Firebase...";
    }

    try {
      // Consultar configuración de seguridad almacenada en Firestore
      const secDocRef = doc(db, "configuracion", "seguridad");
      const secSnap = await getDoc(secDocRef);

      if (secSnap.exists()) {
        const secData = secSnap.data();
        const correos = (secData.correos_autorizados || []).map(c => c.trim().toLowerCase());
        const defaultAdmins = ["stratumgroupsas@gmail.com", "jhonmariog102015@gmail.com"];

        // 1. Verificación en la Lista Blanca de Firebase
        if (correos.length > 0 && !correos.includes(email) && !defaultAdmins.includes(email)) {
          if (loginAlert) {
            loginAlert.style.display = "block";
            loginAlert.className = "alert-box alert-error";
            loginAlert.textContent = "Acceso denegado: El correo '" + email + "' no figura en la lista blanca de administradores autorizados.";
          }
          if (btnRegister) {
            btnRegister.disabled = false;
            btnRegister.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg> Registrar y Acceder`;
          }
          return;
        }

        // 2. Verificación de Clave Maestra contra el Hash SHA-256 de Firebase
        if (secData.codigo_hash) {
          const inputHash = await sha256(inputCode);
          if (inputHash !== secData.codigo_hash) {
            if (loginAlert) {
              loginAlert.style.display = "block";
              loginAlert.className = "alert-box alert-error";
              loginAlert.textContent = "Código de Invitación / Clave Maestra incorrecto. No tienes autorización para crear una cuenta.";
            }
            if (btnRegister) {
              btnRegister.disabled = false;
              btnRegister.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg> Registrar y Acceder`;
            }
            return;
          }
        }
      }

      // Si pasó las validaciones de Firebase, se crea el usuario
      if (btnRegister) btnRegister.textContent = "Creando cuenta en Firebase...";
      await createUserWithEmailAndPassword(auth, email, password);
      if (loginAlert) {
        loginAlert.style.display = "block";
        loginAlert.className = "alert-box alert-success";
        loginAlert.textContent = "¡Administrador creado con éxito! Conectando al panel...";
      }
      registerForm.reset();
    } catch (error) {
      console.error("Error creando administrador:", error);
      if (loginAlert) {
        loginAlert.style.display = "block";
        loginAlert.className = "alert-box alert-error";

        if (error.code === "auth/email-already-in-use") {
          loginAlert.textContent = "Este correo ya está registrado. Por favor ingresa desde la pestaña 'Iniciar Sesión'.";
        } else if (error.code === "auth/weak-password") {
          loginAlert.textContent = "La contraseña debe tener un mínimo de 6 caracteres.";
        } else if (error.code === "auth/invalid-email") {
          loginAlert.textContent = "El formato de correo no es válido.";
        } else if (error.code === "auth/operation-not-allowed" || error.code === "auth/configuration-not-found") {
          loginAlert.innerHTML = "<strong>Falta activar la Autenticación en Firebase:</strong><br>Abre este enlace: <a href='https://console.firebase.google.com/project/stratum-group/authentication' target='_blank' style='color:#991B1B; text-decoration:underline; font-weight:700;'>Consola de Stratum Group</a>, haz clic en <strong>Comenzar</strong> (o <em>Get Started</em>) y activa <strong>Correo electrónico/Contraseña</strong>.";
        } else {
          loginAlert.textContent = "Error al crear cuenta: " + error.message;
        }
      }
    } finally {
      if (btnRegister) {
        btnRegister.disabled = false;
        btnRegister.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg> Registrar y Acceder`;
      }
    }
  });
}

// 5. CERRAR SESIÓN
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error cerrando sesión:", err);
    }
  });
}

// 6. GESTIÓN DE SEGURIDAD EN EL DASHBOARD (LISTA BLANCA Y CLAVE MAESTRA EN FIREBASE)
let currentSecurityData = { correos_autorizados: [], codigo_hash: "" };

async function loadSecurityConfig(userEmail) {
  if (!authorizedEmailsList) return;
  authorizedEmailsList.innerHTML = "<p style='font-size:0.8rem; color:var(--text-muted);'>Cargando lista desde Firebase...</p>";

  try {
    const secDocRef = doc(db, "configuracion", "seguridad");
    const secSnap = await getDoc(secDocRef);

    if (secSnap.exists()) {
      currentSecurityData = secSnap.data();
      if (!currentSecurityData.correos_autorizados) currentSecurityData.correos_autorizados = [];
    } else {
      // Inicializar documento por primera vez en Firestore con el correo del administrador activo
      currentSecurityData = {
        correos_autorizados: [userEmail.toLowerCase()],
        codigo_hash: ""
      };
      await setDoc(secDocRef, currentSecurityData);
    }

    renderAuthorizedEmails(userEmail);
  } catch (err) {
    console.error("Error al cargar configuración de seguridad:", err);
    authorizedEmailsList.innerHTML = "<p style='font-size:0.8rem; color:#EF4444;'>No se pudo cargar la configuración de seguridad desde Firebase.</p>";
  }
}

function renderAuthorizedEmails(currentUserEmailStr) {
  if (!authorizedEmailsList) return;
  const list = currentSecurityData.correos_autorizados || [];

  if (list.length === 0) {
    authorizedEmailsList.innerHTML = "<p style='font-size:0.8rem; color:var(--text-muted);'>No hay correos en la lista blanca.</p>";
    return;
  }

  authorizedEmailsList.innerHTML = "";
  list.forEach((email) => {
    const isSelf = email.toLowerCase() === (currentUserEmailStr || "").toLowerCase();
    const row = document.createElement("div");
    row.className = "dash-email-item";
    const emailSeguro = escapeHTML(email);
    row.innerHTML = `
      <span class="dash-email-name">${emailSeguro} ${isSelf ? '<span class="dash-email-tag">(Tú)</span>' : ''}</span>
      ${isSelf ? '' : `<button type="button" class="btn-remove-email dash-email-del" data-email="${emailSeguro}" title="Eliminar de la lista blanca">&times;</button>`}
    `;

    if (!isSelf) {
      const delBtn = row.querySelector(".btn-remove-email");
      delBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        delBtn.disabled = true;
        delBtn.textContent = "...";

        currentSecurityData.correos_autorizados = (currentSecurityData.correos_autorizados || []).filter(
          item => item.toLowerCase().trim() !== email.toLowerCase().trim()
        );

        try {
          await setDoc(doc(db, "configuracion", "seguridad"), currentSecurityData);
          renderAuthorizedEmails(currentUserEmailStr);
        } catch (err) {
          console.error("Error al revocar correo:", err);
          alert("Error al actualizar en Firebase: " + err.message);
          delBtn.disabled = false;
          delBtn.innerHTML = "&times;";
        }
      });
    }

    authorizedEmailsList.appendChild(row);
  });
}

// Agregar correo a la lista blanca en Firestore
if (addEmailForm) {
  addEmailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailToAdd = newAuthEmail.value.trim().toLowerCase();
    if (!emailToAdd) return;

    if (currentSecurityData.correos_autorizados.map(c => c.toLowerCase()).includes(emailToAdd)) {
      alert("El correo '" + emailToAdd + "' ya se encuentra en la lista blanca.");
      return;
    }

    currentSecurityData.correos_autorizados.push(emailToAdd);
    try {
      await setDoc(doc(db, "configuracion", "seguridad"), currentSecurityData);
      newAuthEmail.value = "";
      renderAuthorizedEmails(currentUserEmail.textContent);
    } catch (err) {
      alert("Error guardando correo en Firebase: " + err.message);
    }
  });
}

// Actualizar clave maestra en Firestore (Cálculo y guardado de Hash SHA-256)
if (updateMasterKeyForm) {
  updateMasterKeyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawKey = newMasterKey.value.trim();
    if (rawKey.length < 6) {
      alert("La clave maestra debe tener al menos 6 caracteres.");
      return;
    }

    try {
      const hashed = await sha256(rawKey);
      currentSecurityData.codigo_hash = hashed;

      await setDoc(doc(db, "configuracion", "seguridad"), currentSecurityData);
      newMasterKey.value = "";
      if (securityAlert) {
        securityAlert.style.display = "block";
        securityAlert.className = "alert-box alert-success";
        securityAlert.innerHTML = "<strong>¡Clave Maestra actualizada y encriptada en Firebase con éxito!</strong><br>Solo quienes conozcan esta clave podrán registrarse.";
        setTimeout(() => { securityAlert.style.display = "none"; }, 6000);
      }
    } catch (err) {
      if (securityAlert) {
        securityAlert.style.display = "block";
        securityAlert.className = "alert-box alert-error";
        securityAlert.textContent = "Error al actualizar clave en Firebase: " + err.message;
      }
    }
  });
}

// 7. GESTIÓN DE EDICIÓN Y PUBLICACIÓN DE NOTICIAS
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

    try {
      if (isEditing) {
        // ACTUALIZACIÓN DE NOTICIA EXISTENTE (EDITAR)
        await updateDoc(doc(db, "noticias", currentEditId), {
          titulo: titulo,
          categoria: categoria,
          resumen: resumen,
          imagen: imagen || "assets/drone_landscape.png",
          enlace: enlace || "",
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
          imagen: imagen || "assets/drone_landscape.png",
          enlace: enlace || "",
          fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
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
        publishAlert.textContent = "Error al guardar: " + error.message;
      }
    } finally {
      if (btnPublish) {
        btnPublish.disabled = false;
        btnPublish.textContent = isEditing ? "Guardar Cambios" : "Publicar Noticia en la Web";
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

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const rawImg = data.imagen && data.imagen.trim() !== "" ? data.imagen.trim() : "assets/drone_landscape.png";
      const imgUrl = escapeHTML(rawImg);
      const tituloSeguro = escapeHTML(data.titulo || '');
      const fechaSegura = escapeHTML(data.fecha || 'Reciente');
      const catSegura = escapeHTML(data.categoria || 'General');

      const itemEl = document.createElement("div");
      itemEl.className = "news-item-card";
      itemEl.innerHTML = `
        <img src="${imgUrl}" alt="${tituloSeguro}" class="news-item-thumb" onerror="this.src='assets/drone_landscape.png'">
        <div class="news-item-info">
          <h4>${tituloSeguro}</h4>
          <p>${fechaSegura} &bull; <strong style="color: var(--brand-purple);">${catSegura}</strong></p>
        </div>
        <div class="news-item-actions">
          <button class="btn-edit" title="Editar noticia" data-id="${docId}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-delete" title="Eliminar noticia" data-id="${docId}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      // Evento de editar
      itemEl.querySelector(".btn-edit").addEventListener("click", () => {
        document.getElementById("newsTitle").value = data.titulo || "";
        document.getElementById("newsCategory").value = data.categoria || "Corporativo";
        document.getElementById("newsSummary").value = data.resumen || "";
        document.getElementById("newsImage").value = data.imagen && data.imagen !== "assets/drone_landscape.png" ? data.imagen : "";
        document.getElementById("newsLink").value = data.enlace || "";

        if (editingNewsId) editingNewsId.value = docId;
        if (formTitleText) formTitleText.textContent = "Editar Noticia";
        if (btnPublish) btnPublish.textContent = "Guardar Cambios";
        if (btnCancelEdit) btnCancelEdit.style.display = "inline-flex";
        if (publishAlert) publishAlert.style.display = "none";

        publishNewsForm.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("newsTitle").focus();
      });

      // Evento de eliminar
      itemEl.querySelector(".btn-delete").addEventListener("click", async () => {
        if (confirm(`¿Estás seguro de que deseas eliminar la noticia: "${data.titulo}"?`)) {
          try {
            await deleteDoc(doc(db, "noticias", docId));
            if (editingNewsId && editingNewsId.value === docId) {
              resetNewsForm();
            }
            loadAdminNews();
          } catch (delErr) {
            alert("Error al eliminar la noticia: " + delErr.message);
          }
        }
      });

      adminNewsList.appendChild(itemEl);
    });

  } catch (err) {
    console.error("Error listando noticias:", err);
    adminNewsList.innerHTML = "<p style='text-align:center; color: #EF4444;'>Error cargando noticias.</p>";
  }
}
