const login = document.getElementById("btnLogin");
// anti-marco.js ya ocultó el panel si está dentro de un marco; tampoco se inicia la sesión.
if (window.top === window.self) {
  try {
    await import("./admin.js?v=17");
    login.disabled = false;
  } catch (error) {
    console.error("No se pudo iniciar el módulo de noticias.", error);
    const aviso = document.getElementById("loginAlert");
    aviso.setAttribute("role", "alert");
    aviso.style.display = "block";
    aviso.textContent = "No se pudo iniciar el panel. Recarga la página para volver a intentarlo.";
  }
}
