"use strict";
// Aplica las preferencias de accesibilidad antes de pintar la página para evitar el destello
// del tema claro. app.js mantiene el panel y guarda los cambios.
try {
  const prefs = JSON.parse(localStorage.getItem("stratum_access_prefs"));
  if (prefs && typeof prefs === "object") {
    const html = document.documentElement.classList;
    if (prefs.theme === "dark") html.add("dark-mode");
    if (prefs.highContrast === true) html.add("high-contrast");
    if (prefs.grayscale === true) html.add("grayscale");
    if (prefs.fontSize === "small" || prefs.fontSize === "large") html.add("font-size-" + prefs.fontSize);
  }
} catch { /* Sin almacenamiento se usa la apariencia predeterminada. */ }
