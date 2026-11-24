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

  return { escapeHTML, safeNewsLink, safeImageUrl };
})();
