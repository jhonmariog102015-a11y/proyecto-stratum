const login = document.getElementById("btnLogin");
try {
  if (login) {
    await import("./admin.js?v=13");
    login.disabled = false;
  } else {
    await import("./firebase_noticias.js?v=13");
  }
} catch (error) {
  console.error("No se pudo iniciar el módulo de noticias.", error);
  const aviso = document.querySelector("#loginAlert, #home-news-container, #firebase-news-container");
  aviso.setAttribute("role", "alert");
  aviso.style.display = "block";
  aviso.textContent = login
    ? "No se pudo iniciar el panel. Recarga la página para volver a intentarlo."
    : "No se pudieron cargar las noticias. Recarga la página para volver a intentarlo.";
}
