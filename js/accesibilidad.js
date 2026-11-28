"use strict";
// Botón flotante y panel de herramientas de accesibilidad del sitio público.
// Las preferencias se leen, guardan y aplican con window.stratumAccesibilidad (js/preferencias.js).
(() => {
  const nucleo = window.stratumAccesibilidad;
  if (!nucleo || document.getElementById("a11yPanel")) return;

  const html = document.documentElement;
  let prefs = nucleo.leer();

  const SVG = (d, extra = "") => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"${extra}>${d}</svg>`;
  const ACTIVADO = { no: "Desactivado", si: "Activado" };

  // Herramientas en el orden del panel: nombre, etiqueta de cada valor e icono.
  const TARJETAS = [
    { id: "texto", nombre: "Tamaño de texto", estados: { normal: "Normal", 115: "115 %", 130: "130 %", 150: "150 %" },
      icono: '<path d="M3 7V5h10v2M8 5v14M6 19h4M14 12v-1h7v1M17.5 11v8M16 19h3"/>' },
    { id: "contraste", nombre: "Contraste", estados: { normal: "Normal", aumentado: "Aumentado", alto: "Alto", invertido: "Invertido" },
      icono: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>' },
    { id: "tema", nombre: "Modo oscuro", estados: { claro: "Desactivado", oscuro: "Activado" },
      icono: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>' },
    { id: "alinear", nombre: "Alineación de texto", estados: { normal: "Original", izquierda: "Izquierda", centro: "Centro", derecha: "Derecha" },
      icono: '<path d="M4 6h16M4 10h11M4 14h16M4 18h11"/>' },
    { id: "filtro", nombre: "Filtro de color", estados: { normal: "Ninguno", protanopia: "Protanopía", deuteranopia: "Deuteranopía", tritanopia: "Tritanopía", grises: "Escala de grises" },
      icono: '<circle cx="9" cy="9" r="5"/><circle cx="15" cy="9" r="5"/><circle cx="12" cy="15" r="5"/>' },
    { id: "saturacion", nombre: "Saturación", estados: { normal: "Normal", baja: "Baja", alta: "Alta", "muy-alta": "Muy alta" },
      icono: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>' },
    { id: "espaciado", nombre: "Espaciado de texto", estados: { normal: "Normal", 1: "Amplio", 2: "Más amplio", 3: "Máximo" },
      icono: '<path d="M4 13 7.5 4l3.5 9M5.3 10h4.4M13 4l3.5 9L20 4M4 18h16M6.5 15.5 4 18l2.5 2.5M17.5 15.5 20 18l-2.5 2.5"/>' },
    { id: "altura", nombre: "Altura de línea", estados: { normal: "Normal", 1: "Amplia", 2: "Más amplia", 3: "Máxima" },
      icono: '<path d="M9 6h11M9 12h11M9 18h11M4.5 4v16M3 5.5 4.5 4 6 5.5M3 18.5 4.5 20 6 18.5"/>' },
    { id: "fuente", nombre: "Tipo de letra", estados: { normal: "Original", arial: "Arial", verdana: "Verdana", georgia: "Georgia" },
      icono: '<path d="M3 18 8 6l5 12M4.8 14h6.4M20 13v5M17.6 18a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8z"/>' },
    { id: "dislexia", nombre: "Lectura para dislexia", estados: ACTIVADO,
      icono: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>' },
    { id: "cursor", nombre: "Cursor grande", estados: ACTIVADO,
      icono: '<path d="M5 3l13 7-5.5 1.8L10 18z"/>' },
    { id: "imagenes", nombre: "Ocultar imágenes", estados: { visibles: "Desactivado", ocultas: "Activado" },
      icono: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3 3.6M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 4.1-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>' },
    { id: "pausa", nombre: "Pausar animaciones", estados: ACTIVADO,
      icono: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>' },
    { id: "lector", nombre: "Lector de pantalla", estados: ACTIVADO,
      icono: '<path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' },
    { id: "voz", nombre: "Comandos de voz", estados: ACTIVADO,
      icono: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>' }
  ];

  const ICONO_BOTON = SVG('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="7" r="1.4" fill="currentColor" stroke="none"/><path d="M7 9.6l5 1.1 5-1.1M12 10.7v3.6M12 14.3l-2.6 4.4M12 14.3l2.6 4.4"/>');
  const COMANDOS = [
    ["«Inicio», «Nosotros», «Servicios», «Noticias», «Contacto»", "abrir esa sección"],
    ["«Bajar» / «Subir»", "desplazar la página"],
    ["«Al principio» / «Al final»", "ir al comienzo o al final"],
    ["«Atrás»", "volver a la página anterior"],
    ["«Aumentar texto» / «Reducir texto»", "cambiar el tamaño de la letra"],
    ["«Contraste» / «Modo oscuro»", "cambiar los colores"],
    ["«Leer página» / «Detener»", "leer en voz alta o callar"],
    ["«Abrir accesibilidad» / «Cerrar»", "mostrar u ocultar este panel"],
    ["«Restablecer»", "volver a la configuración normal"],
    ["«Desactivar voz»", "dejar de escuchar"]
  ];

  // ----- Marcado -----
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "a11y-ui a11y-boton";
  boton.id = "a11yBoton";
  boton.setAttribute("aria-controls", "a11yPanel");
  boton.setAttribute("aria-expanded", "false");
  boton.setAttribute("aria-label", "Herramientas de accesibilidad");
  boton.innerHTML = ICONO_BOTON + '<span class="a11y-boton-texto" aria-hidden="true">Accesibilidad</span>';

  const fondo = document.createElement("div");
  fondo.className = "a11y-ui a11y-fondo";

  const panel = document.createElement("div");
  panel.className = "a11y-ui a11y-panel";
  panel.id = "a11yPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "a11yTitulo");
  panel.setAttribute("aria-describedby", "a11yAyuda");
  panel.inert = true;
  panel.innerHTML = `
    <div class="a11y-cabecera">
      <h2 class="a11y-titulo" id="a11yTitulo">Herramientas de accesibilidad</h2>
      <button type="button" class="a11y-icono-btn" id="a11yRestablecer" aria-label="Restablecer todos los ajustes" title="Restablecer">
        ${SVG('<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>')}
      </button>
      <button type="button" class="a11y-icono-btn" id="a11yCerrar" aria-label="Cerrar herramientas de accesibilidad" title="Cerrar">
        ${SVG('<path d="M6 6l12 12M18 6 6 18"/>')}
      </button>
    </div>
    <div class="a11y-cuerpo">
      <p class="a11y-ayuda" id="a11yAyuda">Cada botón cambia entre sus opciones. Los ajustes se aplican en todas las páginas y se recuerdan en este navegador.</p>
      <div class="a11y-rejilla">
        ${TARJETAS.map(t => {
          const total = t.id === "voz" ? 1 : nucleo.HERRAMIENTAS[t.id].length - 1;
          return `<button type="button" class="a11y-tarjeta" data-herramienta="${t.id}" aria-pressed="false">
            ${SVG(t.icono, ' class="a11y-tarjeta-icono"')}
            <span class="a11y-nombre">${t.nombre}</span>
            <span class="a11y-estado"></span>
            <span class="a11y-niveles" aria-hidden="true">${"<i></i>".repeat(total)}</span>
          </button>`;
        }).join("")}
      </div>
      <p class="a11y-voz-estado" id="a11yVozEstado" role="status" hidden></p>
      <details class="a11y-comandos" id="a11yComandos" hidden>
        <summary>Qué puedes decir</summary>
        <ul>${COMANDOS.map(([dicho, efecto]) => `<li><strong>${dicho}</strong>: ${efecto}.</li>`).join("")}</ul>
      </details>
    </div>
    <p class="visually-hidden" id="a11yAnuncio" aria-live="polite"></p>`;

  document.body.append(boton, fondo, panel);

  const tarjetas = new Map([...panel.querySelectorAll(".a11y-tarjeta")].map(b => [b.dataset.herramienta, b]));
  const cerrarBtn = panel.querySelector("#a11yCerrar");
  const anuncio = panel.querySelector("#a11yAnuncio");
  const vozEstado = panel.querySelector("#a11yVozEstado");
  const comandos = panel.querySelector("#a11yComandos");

  function anunciar(texto) {
    // Vaciar primero hace que los lectores repitan un mensaje igual al anterior.
    anuncio.textContent = "";
    setTimeout(() => { anuncio.textContent = texto; }, 60);
  }

  // ----- Filtros SVG para daltonismo (compensan la pérdida de un tipo de cono) -----
  const filtrosSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  filtrosSvg.setAttribute("class", "a11y-ui a11y-defs");
  filtrosSvg.setAttribute("aria-hidden", "true");
  filtrosSvg.setAttribute("focusable", "false");
  filtrosSvg.innerHTML = `
    <filter id="a11y-protanopia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0.7 0.3 0 0 0  0.7 0 0.3 0 0  0 0 0 1 0"/></filter>
    <filter id="a11y-deuteranopia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="0.3 0.7 0 0 0  0 1 0 0 0  0 0.7 0.3 0 0  0 0 0 1 0"/></filter>
    <filter id="a11y-tritanopia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0.3 0.7 0 0 0  0 0 0 1 0"/></filter>`;
  document.body.append(filtrosSvg);

  // ----- Abrir y cerrar (diálogo modal) -----
  let bloqueados = [];
  const abierto = () => panel.classList.contains("is-abierto");

  function abrir() {
    if (abierto()) return;
    panel.inert = false;
    bloqueados = [...document.body.children].filter(el => el !== panel && el !== fondo && !el.inert);
    bloqueados.forEach(el => { el.inert = true; });
    panel.classList.add("is-abierto");
    fondo.classList.add("is-abierto");
    boton.setAttribute("aria-expanded", "true");
    html.classList.add("a11y-sin-scroll");
    cerrarBtn.focus();
  }

  function cerrar() {
    if (!abierto()) return;
    panel.classList.remove("is-abierto");
    fondo.classList.remove("is-abierto");
    bloqueados.forEach(el => { el.inert = false; });
    bloqueados = [];
    panel.inert = true;
    boton.setAttribute("aria-expanded", "false");
    html.classList.remove("a11y-sin-scroll");
    boton.focus();
  }

  boton.addEventListener("click", abrir);
  cerrarBtn.addEventListener("click", cerrar);
  fondo.addEventListener("click", cerrar);

  panel.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      cerrar();
      return;
    }
    if (event.key !== "Tab") return;
    // El foco recorre solo el panel mientras está abierto.
    const enfocables = [...panel.querySelectorAll("button, summary, [href], [tabindex]:not([tabindex='-1'])")]
      .filter(el => !el.disabled && el.offsetParent !== null);
    const primero = enfocables[0];
    const ultimo = enfocables.at(-1);
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  });

  // ----- Estado de las tarjetas -----
  const soportaLector = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  let vozActiva = false;

  function pintar() {
    for (const t of TARJETAS) {
      const tarjeta = tarjetas.get(t.id);
      const valor = t.id === "voz" ? (vozActiva ? "si" : "no") : prefs[t.id];
      const valores = t.id === "voz" ? ["no", "si"] : nucleo.HERRAMIENTAS[t.id];
      const indice = valores.indexOf(valor);
      const noDisponible = (t.id === "lector" && !soportaLector) || (t.id === "voz" && !Reconocimiento);
      tarjeta.setAttribute("aria-pressed", String(indice > 0));
      tarjeta.querySelector(".a11y-estado").textContent = noDisponible ? "No disponible en este navegador" : t.estados[valor];
      if (noDisponible) tarjeta.setAttribute("aria-disabled", "true");
      tarjeta.querySelectorAll(".a11y-niveles i").forEach((punto, i) => punto.classList.toggle("is-on", i < indice));
    }
  }

  function cambiar(id, valor) {
    prefs[id] = valor;
    nucleo.guardar(prefs);
    nucleo.aplicar(prefs);
    efectos(id);
    pintar();
  }

  // Ajustes que necesitan algo más que CSS.
  function efectos(id) {
    if (id === "pausa" && prefs.pausa === "si") {
      document.querySelectorAll(".reveal-on-scroll").forEach(el => el.classList.add("is-revealed"));
      document.querySelectorAll(".reveal, .contours").forEach(el => el.classList.add("is-in"));
    }
    if (id === "lector") {
      if (prefs.lector === "si") lector.activar(true);
      else lector.desactivar();
    }
  }

  tarjetas.forEach((tarjeta, id) => tarjeta.addEventListener("click", () => {
    const t = TARJETAS.find(x => x.id === id);
    if (tarjeta.getAttribute("aria-disabled") === "true") {
      anunciar(t.nombre + ": " + (id === "voz"
        ? "tu navegador no permite comandos de voz. Prueba con Chrome o Edge."
        : "tu navegador no permite leer en voz alta."));
      return;
    }
    if (id === "voz") {
      voz.alternar();
      return;
    }
    const valores = nucleo.HERRAMIENTAS[id];
    const siguiente = valores[(valores.indexOf(prefs[id]) + 1) % valores.length];
    cambiar(id, siguiente);
    anunciar(t.nombre + ": " + t.estados[siguiente]);
  }));

  function restablecer() {
    lector.desactivar();
    voz.detener();
    prefs = nucleo.normales();
    nucleo.guardar(prefs);
    nucleo.aplicar(prefs);
    pintar();
    anunciar("Se restablecieron todos los ajustes de accesibilidad.");
  }
  panel.querySelector("#a11yRestablecer").addEventListener("click", restablecer);

  // ----- Lector de pantalla: lee en voz alta lo que señalas con el puntero o el teclado -----
  const LEIBLE = "h1, h2, h3, h4, h5, h6, p, li, a, button, label, summary, td, th, dt, dd, figcaption, blockquote, img[alt]:not([alt=''])";
  const lector = (() => {
    let espera = 0;
    let marcado = null;
    const textoDe = el => (el.getAttribute("aria-label") || (el.tagName === "IMG" ? el.alt : el.innerText) || "")
      .replace(/\s+/g, " ").trim();
    const vozEs = () => {
      const voces = speechSynthesis.getVoices();
      return voces.find(v => /^es[-_]CO/i.test(v.lang)) || voces.find(v => /^es/i.test(v.lang)) || null;
    };
    function desmarcar() {
      marcado?.classList.remove("a11y-leyendo");
      marcado = null;
    }
    function decir(texto, el) {
      if (!soportaLector || !texto) return;
      speechSynthesis.cancel();
      desmarcar();
      const frase = new SpeechSynthesisUtterance(texto.slice(0, 1500));
      frase.lang = "es-CO";
      const v = vozEs();
      if (v) frase.voice = v;
      if (el) {
        marcado = el;
        el.classList.add("a11y-leyendo");
      }
      frase.onend = desmarcar;
      frase.onerror = desmarcar;
      speechSynthesis.speak(frase);
    }
    const objetivo = target => target instanceof Element ? target.closest(LEIBLE) : null;
    function alPasar(event) {
      clearTimeout(espera);
      const el = objetivo(event.target);
      if (!el || el === marcado) return;
      espera = setTimeout(() => decir(textoDe(el), el), 450);
    }
    function alEnfocar(event) {
      const el = objetivo(event.target);
      if (el) decir(textoDe(el), el);
    }
    return {
      decir,
      activar(avisar) {
        if (!soportaLector) return;
        document.addEventListener("mouseover", alPasar);
        document.addEventListener("focusin", alEnfocar);
        if (avisar) decir("Lector activado. Pasa el puntero o el foco del teclado por un texto para escucharlo.");
      },
      desactivar() {
        clearTimeout(espera);
        document.removeEventListener("mouseover", alPasar);
        document.removeEventListener("focusin", alEnfocar);
        if (soportaLector) speechSynthesis.cancel();
        desmarcar();
      },
      leerPagina() {
        const principal = document.querySelector("main") || document.body;
        decir(textoDe(principal));
      }
    };
  })();

  // ----- Comandos de voz -----
  const SESION_VOZ = "stratum_voz_activa";
  const voz = (() => {
    let rec = null;
    let reintentos = 0;
    const normalizar = t => t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
    const PAGINAS = [
      ["inicio", "index.html"], ["nosotros", "nosotros.html"], ["servicios", "servicios.html"],
      ["noticias", "noticias.html"], ["contacto", "contacto.html"],
      ["aviso legal", "aviso-legal.html"], ["privacidad", "politica-privacidad.html"]
    ];
    function irA(archivo) {
      // Se reutiliza el enlace del menú o del pie para respetar la ruta del sitio publicado.
      const enlace = [...document.querySelectorAll("a[href]")].find(a => a.getAttribute("href").split(/[?#]/)[0].endsWith(archivo));
      location.href = enlace ? enlace.href : new URL(archivo, location.href).href;
    }
    function paso(id, delta) {
      const valores = nucleo.HERRAMIENTAS[id];
      const i = Math.min(valores.length - 1, Math.max(0, valores.indexOf(prefs[id]) + delta));
      cambiar(id, valores[i]);
      return TARJETAS.find(t => t.id === id).estados[valores[i]];
    }
    function mostrar(texto) {
      vozEstado.hidden = false;
      vozEstado.textContent = texto;
    }
    function ejecutar(dicho) {
      const t = normalizar(dicho);
      const pagina = PAGINAS.find(([clave]) => t.includes(clave));
      let hecho;
      if (/desactivar voz|apagar voz|dejar de escuchar/.test(t)) { detener(); hecho = "Comandos de voz desactivados"; }
      else if (/^(cerrar|cerrar panel)$/.test(t)) { cerrar(); hecho = "Panel cerrado"; }
      else if (/abrir (accesibilidad|panel)/.test(t)) { abrir(); hecho = "Panel abierto"; }
      else if (/restablecer/.test(t)) { restablecer(); hecho = "Ajustes restablecidos"; }
      else if (/aumentar texto|agrandar texto|texto mas grande/.test(t)) hecho = "Tamaño de texto: " + paso("texto", 1);
      else if (/reducir texto|achicar texto|texto mas pequeno/.test(t)) hecho = "Tamaño de texto: " + paso("texto", -1);
      else if (/modo oscuro/.test(t)) hecho = "Modo oscuro: " + paso("tema", prefs.tema === "oscuro" ? -1 : 1);
      else if (/contraste/.test(t)) {
        const valores = nucleo.HERRAMIENTAS.contraste;
        const siguiente = valores[(valores.indexOf(prefs.contraste) + 1) % valores.length];
        cambiar("contraste", siguiente);
        hecho = "Contraste: " + TARJETAS[1].estados[siguiente];
      }
      else if (/leer (la )?pagina/.test(t)) { lector.leerPagina(); hecho = "Leyendo la página"; }
      else if (/detener|parar|silencio|callar/.test(t)) { if (soportaLector) speechSynthesis.cancel(); hecho = "Lectura detenida"; }
      else if (/al principio|ir arriba del todo/.test(t)) { scrollTo({ top: 0 }); hecho = "Al principio de la página"; }
      else if (/al final/.test(t)) { scrollTo({ top: document.documentElement.scrollHeight }); hecho = "Al final de la página"; }
      else if (/bajar|abajo/.test(t)) { scrollBy({ top: innerHeight * 0.8 }); hecho = "Bajando"; }
      else if (/subir|arriba/.test(t)) { scrollBy({ top: -innerHeight * 0.8 }); hecho = "Subiendo"; }
      else if (/atras|volver/.test(t)) { history.back(); hecho = "Volviendo"; }
      else if (pagina) { hecho = "Abriendo " + pagina[0]; irA(pagina[1]); }
      mostrar(hecho ? "«" + dicho + "» → " + hecho : "No entendí «" + dicho + "». Revisa la lista de comandos.");
      anunciar(hecho || "Comando no reconocido");
    }
    function iniciar(avisar) {
      if (!Reconocimiento || vozActiva) return;
      rec = new Reconocimiento();
      rec.lang = "es-CO";
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = event => {
        reintentos = 0;
        const resultado = event.results[event.results.length - 1];
        if (resultado.isFinal) ejecutar(resultado[0].transcript);
      };
      rec.onerror = event => {
        if (event.error === "no-speech" || event.error === "aborted") return;
        const motivo = event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Permite el uso del micrófono para usar comandos de voz."
          : "El reconocimiento de voz no está disponible en este navegador. Prueba con Chrome o Edge.";
        detener();
        mostrar(motivo);
        anunciar(motivo);
      };
      // El navegador corta la escucha tras un silencio largo; se reanuda mientras siga activa.
      rec.onend = () => {
        if (vozActiva && reintentos++ < 20) {
          try { rec.start(); } catch { /* Ya estaba escuchando. */ }
        }
      };
      try {
        rec.start();
      } catch {
        return;
      }
      vozActiva = true;
      comandos.hidden = false;
      try { sessionStorage.setItem(SESION_VOZ, "si"); } catch { /* Solo para esta página. */ }
      if (avisar) {
        mostrar("Escuchando… di un comando, por ejemplo «Servicios».");
        anunciar("Comandos de voz activados");
      }
      pintar();
    }
    function detener() {
      vozActiva = false;
      try { sessionStorage.removeItem(SESION_VOZ); } catch { /* Sin almacenamiento. */ }
      if (rec) {
        rec.onend = null;
        try { rec.abort(); } catch { /* Ya se había detenido. */ }
        rec = null;
      }
      comandos.hidden = true;
      vozEstado.hidden = true;
      pintar();
    }
    return {
      detener,
      alternar() {
        if (vozActiva) {
          detener();
          anunciar("Comandos de voz desactivados");
        } else {
          iniciar(true);
        }
      },
      // Sigue escuchando al cambiar de página si se activó en esta sesión del navegador.
      reanudar() {
        let activa = false;
        try { activa = sessionStorage.getItem(SESION_VOZ) === "si"; } catch { /* Sin almacenamiento. */ }
        if (activa) iniciar(false);
      }
    };
  })();

  pintar();
  if (prefs.lector === "si") lector.activar(false);
  if (prefs.pausa === "si") efectos("pausa");
  voz.reanudar();

  // Otros scripts pueden abrir el panel (por ejemplo, un enlace «Accesibilidad» en el pie).
  window.stratumAccesibilidad.abrirPanel = abrir;
})();
