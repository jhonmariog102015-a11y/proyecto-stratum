"use strict";
// Núcleo de las herramientas de accesibilidad: lee, valida, guarda y aplica las preferencias.
// Se carga en <head>, antes de pintar, para que la página no parpadee al cambiar de sección.
// js/accesibilidad.js dibuja el panel y usa estas mismas funciones.
window.stratumAccesibilidad = (() => {
  const CLAVE = "stratum_access_prefs";

  // Valores posibles de cada herramienta, en el orden en que se recorren; el primero es el normal.
  const HERRAMIENTAS = {
    texto: ["normal", "115", "130", "150"],
    contraste: ["normal", "aumentado", "alto", "invertido"],
    tema: ["claro", "oscuro"],
    alinear: ["normal", "izquierda", "centro", "derecha"],
    filtro: ["normal", "protanopia", "deuteranopia", "tritanopia", "grises"],
    saturacion: ["normal", "baja", "alta", "muy-alta"],
    espaciado: ["normal", "1", "2", "3"],
    altura: ["normal", "1", "2", "3"],
    fuente: ["normal", "arial", "verdana", "georgia"],
    dislexia: ["no", "si"],
    cursor: ["no", "si"],
    imagenes: ["visibles", "ocultas"],
    pausa: ["no", "si"],
    lector: ["no", "si"]
  };

  const normales = () => Object.fromEntries(Object.entries(HERRAMIENTAS).map(([k, v]) => [k, v[0]]));

  function leer() {
    const prefs = normales();
    let guardado = null;
    try {
      guardado = JSON.parse(localStorage.getItem(CLAVE));
    } catch { /* Sin almacenamiento se usa la apariencia normal. */ }
    if (!guardado || typeof guardado !== "object" || Array.isArray(guardado)) return prefs;

    // Preferencias del panel anterior.
    if (guardado.theme === "dark") prefs.tema = "oscuro";
    if (guardado.highContrast === true) prefs.contraste = "alto";
    if (guardado.grayscale === true) prefs.filtro = "grises";
    if (guardado.fontSize === "large") prefs.texto = "115";

    for (const [k, valores] of Object.entries(HERRAMIENTAS)) {
      if (valores.includes(guardado[k])) prefs[k] = guardado[k];
    }
    return prefs;
  }

  function guardar(prefs) {
    const distintos = Object.fromEntries(Object.entries(HERRAMIENTAS)
      .filter(([k, valores]) => valores.includes(prefs[k]) && prefs[k] !== valores[0])
      .map(([k]) => [k, prefs[k]]));
    try {
      if (Object.keys(distintos).length) localStorage.setItem(CLAVE, JSON.stringify(distintos));
      else localStorage.removeItem(CLAVE);
    } catch { /* Los cambios valen solo para esta página. */ }
  }

  // Cada herramienta activa queda como atributo data-a11y-* en <html>; el CSS hace el resto.
  function aplicar(prefs) {
    const html = document.documentElement;
    for (const [k, valores] of Object.entries(HERRAMIENTAS)) {
      const atributo = "data-a11y-" + k;
      if (valores.includes(prefs[k]) && prefs[k] !== valores[0]) html.setAttribute(atributo, prefs[k]);
      else html.removeAttribute(atributo);
    }
    // El alto contraste y el modo oscuro reutilizan los temas que ya tenía el sitio.
    html.classList.toggle("high-contrast", prefs.contraste === "alto");
    html.classList.toggle("dark-mode", prefs.tema === "oscuro");
    // Los filtros de color, saturación y contraste se combinan en una sola propiedad filter.
    const filtros = prefs.filtro !== "normal" || prefs.saturacion !== "normal"
      || prefs.contraste === "aumentado" || prefs.contraste === "invertido";
    html.toggleAttribute("data-a11y-filtros", filtros);
  }

  aplicar(leer());
  return { HERRAMIENTAS, leer, guardar, aplicar, normales };
})();
