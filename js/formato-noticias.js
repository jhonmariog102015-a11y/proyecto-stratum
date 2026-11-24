"use strict";
const formatoNoticias = (() => {
  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeNewsLink(value) {
    if (typeof value !== "string" || !/^https:\/\//i.test(value.trim())) return "";
    try {
      const url = new URL(value.trim());
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeImageUrl(value) {
    const external = safeNewsLink(value);
    if (external) return external;
    if (typeof value !== "string") return "";
    const path = value.trim();
    return /^(?:assets|img)\/(?:[A-Za-z0-9_() -]+\/)*[A-Za-z0-9_() -]+\.(?:png|jpe?g|webp|gif|svg|avif)$/i.test(path)
      ? path
      : "";
  }

  // Fecha visible de una noticia: el texto guardado al publicar o, si falta, la fecha de creación
  // en la hora de Colombia (la misma que usa el panel), sin depender de la zona del visitante.
  function fechaVisible(data) {
    if (data.fecha) return data.fecha;
    const valor = data.fecha_creacion;
    const fecha = valor?.toDate ? valor.toDate() : valor ? new Date(valor) : null;
    if (!fecha || !Number.isFinite(fecha.getTime())) return "Reciente";
    return fecha.toLocaleDateString("es-CO", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota"
    });
  }

  // Identificador de ancla de una noticia en noticias.html (el panel enlaza a él).
  function anclaNoticia(id) {
    return "noticia-" + id;
  }

  // Tarjeta de la cuadrícula de Noticias. El panel la usa también para la vista previa.
  function htmlPost(data, { id, categoria = "Minería Estratégica", imagen = "assets/drone_landscape.png" } = {}) {
    const enlace = escapeHTML(safeNewsLink(data.enlace));
    const tag = enlace ? "a" : "article";
    const atributos = (id ? ` id="${escapeHTML(anclaNoticia(id))}"` : "")
      + (enlace ? ` href="${enlace}" target="_blank" rel="noopener noreferrer"` : "");
    return `
      <${tag} class="post"${atributos}>
        <div class="post__img"><img src="${escapeHTML(safeImageUrl(data.imagen) || imagen)}" alt="" loading="lazy"></div>
        <div class="post__body">
          <div class="post__meta"><time>${escapeHTML(fechaVisible(data))}</time> &bull; <span class="cat">${escapeHTML(data.categoria || categoria)}</span></div>
          <h3>${escapeHTML(data.titulo || "")}</h3>
          <p class="post__desc">${escapeHTML(data.resumen || "")}</p>
          ${enlace ? '<span class="post__link">Leer artículo completo &rarr;</span>' : ""}
        </div>
      </${tag}>
    `;
  }

  return { escapeHTML, safeNewsLink, safeImageUrl, fechaVisible, anclaNoticia, htmlPost };
})();
