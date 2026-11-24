"use strict";
// GitHub Pages no permite enviar X-Frame-Options ni frame-ancestors. El panel se oculta si otra
// página lo carga dentro de un marco, para que nadie pueda inducir clics sobre él.
if (window.top !== window.self) {
  document.documentElement.hidden = true;
  try {
    window.top.location.replace(window.self.location.href);
  } catch { /* Un marco aislado no puede navegar la página superior; el panel sigue oculto. */ }
}
