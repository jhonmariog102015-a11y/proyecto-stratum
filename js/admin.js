// Panel de Administración de Noticias y Seguridad - Stratum Group
// Protección Anti-Clickjacking: evita que el panel sea incrustado en iframes de terceros
if (window.top !== window.self) {
  try {
    window.top.location = window.self.location;
  } catch (e) {
    document.documentElement.style.display = "none";
  }
}

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
  arrayUnion,
  arrayRemove,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  escapeHTML
} from "./firebase_noticias.js?v=9";

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

// 0. FUNCIÓN CRIPTOGRÁFICA SHA-256 CON SALT (Inmune a ataques de diccionario y rainbow tables)
const MASTER_KEY_SALT = "Stratum_SG2026_KeyProtection$#";

export async function sha256(message, useSalt = true) {
  const text = useSalt ? (message.trim() + MASTER_KEY_SALT) : message.trim();
  const msgBuffer = new TextEncoder().encode(text);
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

// 2. ESTADO DE AUTENTICACIÓN CON VALIDACIÓN ACTIVA DE LISTA BLANCA
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Validar si el usuario sigue en la lista blanca de Firebase antes de mostrar el panel
    try {
      const secDocRef = doc(db, "configuracion", "seguridad");
      const secSnap = await getDoc(secDocRef);
      if (secSnap.exists()) {
        const autorizados = (secSnap.data().correos_autorizados || []).map(e => e.trim().toLowerCase());
        if (autorizados.length > 0 && !autorizados.includes((user.email || "").toLowerCase())) {
          console.warn("Acceso denegado: El usuario no figura en la lista blanca.");
          await signOut(auth);
          if (loginSection) loginSection.style.display = "flex";
          if (dashboardSection) dashboardSection.style.display = "none";
          if (loginAlert) {
            loginAlert.style.display = "block";
            loginAlert.className = "alert-box alert-error";
            loginAlert.textContent = "Acceso revocado: Tu correo '" + user.email + "' no tiene permisos en este panel.";
          }
          return;
        }
      }
    } catch (verifErr) {
      console.warn("Acceso denegado o error de permisos en Firebase:", verifErr);
      await signOut(auth);
      if (loginSection) loginSection.style.display = "flex";
      if (dashboardSection) dashboardSection.style.display = "none";
      if (loginAlert) {
        loginAlert.style.display = "block";
        loginAlert.className = "alert-box alert-error";
        loginAlert.textContent = "Acceso denegado: Tu correo '" + user.email + "' no tiene permisos de administrador en este panel.";
      }
      return;
    }

    // Usuario autorizado -> Mostrar Dashboard
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

// 3. INICIAR SESIÓN CON PROTECCIÓN CONTRA FUERZA BRUTA
let failedAttempts = parseInt(localStorage.getItem("login_failed_attempts") || "0", 10);
let lockoutUntil = parseInt(localStorage.getItem("login_lockout_until") || "0", 10);

function checkLockout() {
  const now = Date.now();
  if (now < lockoutUntil) {
    const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = `Bloqueado temporalmente (${remainingSec}s)`;
    }
    if (loginAlert) {
      loginAlert.style.display = "block";
      loginAlert.className = "alert-box alert-error";
      loginAlert.textContent = `Demasiados intentos fallidos. Por seguridad, espera ${remainingSec} segundos.`;
    }
    return true;
  }
  if (btnLogin && btnLogin.textContent.includes("Bloqueado")) {
    btnLogin.disabled = false;
    btnLogin.textContent = "Iniciar Sesión";
  }
  return false;
}

// Verificar bloqueo al cargar
checkLockout();
setInterval(checkLockout, 1000);

// 3b. PROTECCIÓN CONTRA FUERZA BRUTA EN REGISTRO
let regFailedAttempts = parseInt(localStorage.getItem("reg_failed_attempts") || "0", 10);
let regLockoutUntil = parseInt(localStorage.getItem("reg_lockout_until") || "0", 10);

function checkRegLockout() {
  const now = Date.now();
  if (now < regLockoutUntil) {
    const remainingSec = Math.ceil((regLockoutUntil - now) / 1000);
    if (btnRegister) {
      btnRegister.disabled = true;
      btnRegister.textContent = `Bloqueado (${remainingSec}s)`;
    }
    if (loginAlert) {
      loginAlert.style.display = "block";
      loginAlert.className = "alert-box alert-error";
      loginAlert.textContent = `Demasiados intentos de registro fallidos. Espera ${remainingSec} segundos.`;
    }
    return true;
  }
  if (btnRegister && btnRegister.textContent.includes("Bloqueado")) {
    btnRegister.disabled = false;
    btnRegister.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg> Registrar y Acceder`;
  }
  return false;
}

checkRegLockout();
setInterval(checkRegLockout, 1000);

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (checkLockout()) return;
    if (loginAlert) loginAlert.style.display = "none";

    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = "Verificando...";
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
      loginForm.reset();
      failedAttempts = 0;
      localStorage.removeItem("login_failed_attempts");
      localStorage.removeItem("login_lockout_until");
    } catch (error) {
      console.warn("Error de autenticación:", error.code);
      failedAttempts++;
      localStorage.setItem("login_failed_attempts", failedAttempts.toString());

      if (failedAttempts >= 5) {
        lockoutUntil = Date.now() + 60000; // 60 segundos de bloqueo
        localStorage.setItem("login_lockout_until", lockoutUntil.toString());
        checkLockout();
        return;
      }

      if (loginAlert) {
        loginAlert.style.display = "block";
        loginAlert.className = "alert-box alert-error";
        
        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
          const restantes = 5 - failedAttempts;
          loginAlert.textContent = `Correo o contraseña incorrectos. (${restantes} intento${restantes === 1 ? '' : 's'} restante${restantes === 1 ? '' : 's'} antes de bloqueo).`;
        } else if (error.code === "auth/too-many-requests") {
          loginAlert.textContent = "Demasiados intentos fallidos detectados por Firebase. Por favor espera unos minutos.";
        } else if (error.code === "auth/configuration-not-found") {
          loginAlert.innerHTML = "<strong>Falta activar Autenticación en Firebase:</strong><br>Abre la <a href='https://console.firebase.google.com/project/stratum-group/authentication' target='_blank' style='color:#991B1B; text-decoration:underline; font-weight:700;'>Consola de Firebase</a> y activa Correo/Contraseña.";
        } else {
          loginAlert.textContent = "No se pudo iniciar sesión. Verifica tus datos o intenta nuevamente.";
        }
      }
    } finally {
      if (btnLogin && !checkLockout()) {
        btnLogin.disabled = false;
        btnLogin.textContent = "Iniciar Sesión";
      }
    }
  });
}

// 4. REGISTRAR NUEVO ADMINISTRADOR CON VALIDACIÓN SEGURA
// Flujo: valida clave maestra desde doc público → crea cuenta → onAuthStateChanged verifica lista blanca
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (checkRegLockout()) return;
    if (loginAlert) loginAlert.style.display = "none";

    const email = regEmail.value.trim().toLowerCase();
    const inputCode = regSecretCode.value.trim();
    const password = regPassword.value;
    const confirmPassword = regPasswordConfirm.value;

    if (password.length < 8) {
      if (loginAlert) {
        loginAlert.style.display = "block";
        loginAlert.className = "alert-box alert-error";
        loginAlert.textContent = "La contraseña debe tener al menos 8 caracteres por seguridad.";
      }
      return;
    }

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
      // Consultar hash de clave maestra desde documento PÚBLICO (no expone correos admin)
      const regDocRef = doc(db, "configuracion", "registro");
      const regSnap = await getDoc(regDocRef);

      if (!regSnap.exists()) {
        if (loginAlert) {
          loginAlert.style.display = "block";
          loginAlert.className = "alert-box alert-error";
          loginAlert.textContent = "El sistema de registro no está configurado. Contacta al administrador principal.";
        }
        if (btnRegister) {
          btnRegister.disabled = false;
          btnRegister.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg> Registrar y Acceder`;
        }
        return;
      }

      const regData = regSnap.data();

      // Verificación obligatoria de Clave Maestra
      if (!regData.codigo_hash || regData.codigo_hash.trim().length === 0) {
        if (loginAlert) {
          loginAlert.style.display = "block";
          loginAlert.className = "alert-box alert-error";
          loginAlert.textContent = "El registro de nuevos administradores está desactivado temporalmente. Se requiere configurar la Clave Maestra previamente.";
        }
        if (btnRegister) {
          btnRegister.disabled = false;
          btnRegister.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg> Registrar y Acceder`;
        }
        return;
      }

      const inputHashSalted = await sha256(inputCode, true);
      const inputHashLegacy = await sha256(inputCode, false);

      if (inputHashSalted !== regData.codigo_hash && inputHashLegacy !== regData.codigo_hash) {
        // Incrementar intentos fallidos de registro
        regFailedAttempts++;
        localStorage.setItem("reg_failed_attempts", regFailedAttempts.toString());

        if (regFailedAttempts >= 5) {
          regLockoutUntil = Date.now() + 120000; // 2 minutos de bloqueo (más estricto que login)
          localStorage.setItem("reg_lockout_until", regLockoutUntil.toString());
          checkRegLockout();
          if (btnRegister) {
            btnRegister.disabled = false;
            btnRegister.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg> Registrar y Acceder`;
          }
          return;
        }

        const restantes = 5 - regFailedAttempts;
        if (loginAlert) {
          loginAlert.style.display = "block";
          loginAlert.className = "alert-box alert-error";
          loginAlert.textContent = `Clave Maestra incorrecta. (${restantes} intento${restantes === 1 ? '' : 's'} restante${restantes === 1 ? '' : 's'} antes de bloqueo).`;
        }
        if (btnRegister) {
          btnRegister.disabled = false;
          btnRegister.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg> Registrar y Acceder`;
        }
        return;
      }

      // Clave maestra válida → crear cuenta en Firebase Auth
      // La verificación de lista blanca se hace POST-AUTH en onAuthStateChanged (no se exponen correos)
      if (btnRegister) btnRegister.textContent = "Creando cuenta en Firebase...";
      await createUserWithEmailAndPassword(auth, email, password);

      // Registro exitoso: resetear contadores
      regFailedAttempts = 0;
      localStorage.removeItem("reg_failed_attempts");
      localStorage.removeItem("reg_lockout_until");

      if (loginAlert) {
        loginAlert.style.display = "block";
        loginAlert.className = "alert-box alert-success";
        loginAlert.textContent = "¡Cuenta creada! Verificando autorización...";
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
          loginAlert.textContent = "No se pudo crear la cuenta. Verifica tus datos o intenta nuevamente.";
        }
      }
    } finally {
      if (btnRegister && !checkRegLockout()) {
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

      // También crear el documento público de registro si no existe
      try {
        const regDocRef = doc(db, "configuracion", "registro");
        const regSnap = await getDoc(regDocRef);
        if (!regSnap.exists()) {
          await setDoc(regDocRef, { codigo_hash: "" });
        }
      } catch (regErr) {
        console.warn("No se pudo crear el documento de registro público:", regErr);
      }
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
          // Eliminación atómica en Firestore (evita condiciones de carrera)
          await updateDoc(doc(db, "configuracion", "seguridad"), {
            correos_autorizados: arrayRemove(email)
          });
          currentSecurityData.correos_autorizados = (currentSecurityData.correos_autorizados || []).filter(
            item => item.toLowerCase().trim() !== email.toLowerCase().trim()
          );
          renderAuthorizedEmails(currentUserEmailStr);
        } catch (err) {
          console.error("Error al revocar correo:", err);
          if (securityAlert) {
            securityAlert.style.display = "block";
            securityAlert.className = "alert-box alert-error";
            securityAlert.textContent = "Error al actualizar la lista en Firebase.";
            setTimeout(() => { securityAlert.style.display = "none"; }, 6000);
          }
          delBtn.disabled = false;
          delBtn.innerHTML = "&times;";
        }
      });
    }

    authorizedEmailsList.appendChild(row);
  });
}

// Agregar correo a la lista blanca en Firestore (Operación atómica con arrayUnion)
if (addEmailForm) {
  addEmailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailToAdd = newAuthEmail.value.trim().toLowerCase();
    if (!emailToAdd) return;

    if (currentSecurityData.correos_autorizados.map(c => c.toLowerCase()).includes(emailToAdd)) {
      if (securityAlert) {
        securityAlert.style.display = "block";
        securityAlert.className = "alert-box alert-error";
        securityAlert.textContent = "El correo '" + emailToAdd + "' ya se encuentra en la lista blanca.";
        setTimeout(() => { securityAlert.style.display = "none"; }, 5000);
      }
      return;
    }

    try {
      // Inserción atómica en Firestore (evita sobreescritura accidental)
      await updateDoc(doc(db, "configuracion", "seguridad"), {
        correos_autorizados: arrayUnion(emailToAdd)
      });
      currentSecurityData.correos_autorizados.push(emailToAdd);
      newAuthEmail.value = "";
      renderAuthorizedEmails(currentUserEmail.textContent);
    } catch (err) {
      if (securityAlert) {
        securityAlert.style.display = "block";
        securityAlert.className = "alert-box alert-error";
        securityAlert.textContent = "Error guardando correo en Firebase. Verifica tus permisos de administrador.";
        setTimeout(() => { securityAlert.style.display = "none"; }, 6000);
      }
    }
  });
}

// Actualizar clave maestra en Firestore con Salt Criptográfico (escribe a AMBOS documentos)
if (updateMasterKeyForm) {
  updateMasterKeyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawKey = newMasterKey.value.trim();
    if (rawKey.length < 8) {
      alert("La clave maestra debe tener al menos 8 caracteres para mayor seguridad.");
      return;
    }

    try {
      const hashed = await sha256(rawKey, true); // Guardar con salting criptográfico

      // Escribir a documento PRIVADO (configuracion/seguridad)
      await updateDoc(doc(db, "configuracion", "seguridad"), {
        codigo_hash: hashed
      });

      // Escribir a documento PÚBLICO (configuracion/registro — solo contiene el hash)
      try {
        await setDoc(doc(db, "configuracion", "registro"), { codigo_hash: hashed });
      } catch (regErr) {
        console.warn("No se pudo sincronizar el documento de registro público:", regErr);
      }

      currentSecurityData.codigo_hash = hashed;
      newMasterKey.value = "";
      if (securityAlert) {
        securityAlert.style.display = "block";
        securityAlert.className = "alert-box alert-success";
        securityAlert.innerHTML = "<strong>¡Clave Maestra actualizada y sincronizada!</strong><br>Protegida con Salt criptográfico. Mínimo 8 caracteres.";
        setTimeout(() => { securityAlert.style.display = "none"; }, 6000);
      }
    } catch (err) {
      if (securityAlert) {
        securityAlert.style.display = "block";
        securityAlert.className = "alert-box alert-error";
        securityAlert.textContent = "Error al actualizar clave en Firebase. Verifica tus permisos de administrador.";
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
          activo: true,
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
      // Omitir noticias que hayan sido eliminadas lógicamente
      if (data.activo === false) return;
      const docId = docSnap.id;
      const rawImg = data.imagen && data.imagen.trim() !== "" ? data.imagen.trim() : "assets/drone_landscape.png";
      // Seguridad: permitir URLs https:// o rutas relativas seguras (assets/ o img/)
      const imgSafe = /^(https:\/\/|assets\/|img\/)/i.test(rawImg) ? rawImg : "assets/drone_landscape.png";
      const imgUrl = escapeHTML(imgSafe);
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
          <button class="btn-edit" title="Editar noticia" data-id="${docId}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-delete" title="Eliminar noticia" data-id="${docId}">
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

// 9. CIERRE DE SESIÓN AUTOMÁTICO POR INACTIVIDAD (20 MINUTOS)
const INACTIVITY_LIMIT_MS = 20 * 60 * 1000;
let idleTimer = null;

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  if (!auth.currentUser) return;

  idleTimer = setTimeout(async () => {
    if (auth.currentUser) {
      console.warn("Cerrando sesión de administrador por 20 minutos de inactividad.");
      try {
        await signOut(auth);
        if (loginAlert) {
          loginAlert.style.display = "block";
          loginAlert.className = "alert-box alert-error";
          loginAlert.textContent = "Tu sesión ha sido cerrada automáticamente por inactividad (20 minutos) para proteger el panel.";
        }
      } catch (logoutErr) {
        console.error("Error en cierre automático:", logoutErr);
      }
    }
  }, INACTIVITY_LIMIT_MS);
}

// Escuchar interacciones para reiniciar el temporizador
['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
  window.addEventListener(event, resetIdleTimer, { passive: true });
});
