const login = document.getElementById("btnLogin");
try {
  await import("./admin.js?v=13");
  login.disabled = false;
} catch (error) {
  console.error("No se pudo iniciar el módulo de noticias.", error);
  const aviso = document.getElementById("loginAlert");
  aviso.setAttribute("role", "alert");
  aviso.style.display = "block";
  aviso.textContent = "No se pudo iniciar el panel. Recarga la página para volver a intentarlo.";
}
