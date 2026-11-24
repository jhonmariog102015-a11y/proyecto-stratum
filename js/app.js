document.addEventListener('DOMContentLoaded', () => {
  // 1. ANIMACIÓN DEL HEADER AL HACER SCROLL (Optimized with requestAnimationFrame)
  const header = document.getElementById('mainHeader');
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (header) {
          if (window.scrollY > 50) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  });

  // 2. MENÚ MÓVIL Y TABLET (HAMBURGUESA CON BACKDROP Y ACCESIBILIDAD)
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.querySelector('.nav-menu-d6');

  if (menuToggle && navMenu) {
    let navBackdrop = document.getElementById('mobileNavBackdrop');
    if (!navBackdrop) {
      navBackdrop = document.createElement('div');
      navBackdrop.id = 'mobileNavBackdrop';
      navBackdrop.className = 'mobile-nav-backdrop';
      navBackdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(navBackdrop);
    }

    const setMenuOpen = (open, restoreFocus = false) => {
      navMenu.classList.toggle('active', open);
      menuToggle.classList.toggle('active', open);
      navBackdrop.classList.toggle('active', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menuToggle.textContent = open ? '✕' : '☰';
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) navMenu.querySelector('a')?.focus();
      else if (restoreFocus) menuToggle.focus();
    };

    menuToggle.setAttribute('aria-expanded', 'false');

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.contains('active');
      setMenuOpen(!isOpen);
    });

    navBackdrop.addEventListener('click', () => setMenuOpen(false, true));

    // Cerrar el menú al hacer clic en un enlace
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => setMenuOpen(false));
    });

    // Cerrar con tecla Escape o al redimensionar a escritorio
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        setMenuOpen(false, true);
      }
    });

    document.addEventListener('focusin', event => {
      if (navMenu.classList.contains('active') && event.target !== menuToggle && !navMenu.contains(event.target)) {
        setMenuOpen(false);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && navMenu.classList.contains('active')) {
        setMenuOpen(false);
      }
    });
  }

  // 3. CONTADOR ANIMADO (COUNT-UP) CON INTERSECTION OBSERVER
  const statElements = document.querySelectorAll('.stat-number-d6');

  function animateStats() {
    statElements.forEach(el => {
      const targetStr = el.getAttribute('data-target');
      const prefix = el.getAttribute('data-prefix') || '';
      const isDecimal = el.getAttribute('data-decimal');
      const isFormat = el.getAttribute('data-format');

      let target = parseFloat(targetStr);
      let current = 0;
      const duration = 1800; // ms
      const steps = 60;
      const stepTime = duration / steps;
      const increment = target / steps;

      let timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }

        let displayVal = current;
        if (isDecimal) {
          displayVal = current.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        } else if (isFormat === 'comma') {
          displayVal = Math.floor(current).toLocaleString('es-CO');
        } else {
          displayVal = Math.floor(current);
        }

        el.textContent = prefix + displayVal;
      }, stepTime);
    });
  }

  const statsBanner = document.getElementById('statsBanner');
  if (statsBanner && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        animateStats();
      }
    }, { threshold: 0.4 });
    observer.observe(statsBanner);
  }

  // 4b. TARJETAS DESPLEGABLES DE SECTORES (index.html)
  const sectorCards = document.querySelectorAll('.sector-card-interactive');
  sectorCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't toggle if clicking the inner link
      if (e.target.closest('.sector-more-link')) return;
      
      const isAlreadyActive = card.classList.contains('active');
      
      // Close all other sector cards so only the selected one opens
      sectorCards.forEach(otherCard => {
        if (otherCard !== card) {
          otherCard.classList.remove('active');
        }
      });
      
      // Toggle current card
      card.classList.toggle('active', !isAlreadyActive);
    });
  });

  // 1b. DETECCIÓN AUTOMÁTICA DE PÁGINA ACTIVA EN EL MENÚ
  const pageName = path => path.split('/').filter(Boolean).at(-1)?.replace(/\.html$/, '') || 'index';
  const currentPath = pageName(window.location.pathname);
  navMenu?.querySelectorAll('a').forEach(link => {
    const current = pageName(new URL(link.href).pathname) === currentPath;
    link.classList.toggle('active', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // 5. MÓDULO DE ACCESIBILIDAD Y PANEL LATERAL (DRAWER)
  // Requisito: Excluir estrictamente de la interfaz administrativa
  const isAdminView = window.location.pathname.toLowerCase().includes('admin_noticias') ||
                      document.getElementById('loginSection') ||
                      document.getElementById('dashboardSection') ||
                      document.getElementById('adminNewsList') ||
                      document.querySelector('.dashboard-wrapper') ||
                      document.querySelector('.dash-header') ||
                      document.getElementById('newsListAdmin');

  if (!isAdminView) {
    // 5.1 Asegurar que el botón flotante exista y sea hijo DIRECTO de document.body.
    // Esto es crucial: Si está dentro del footer o un contenedor con filter: grayscale(100%),
    // el filtro CSS crea un contexto de apilamiento y bloque de contención que atrapa
    // position: fixed y hace que el botón se quede quieto abajo en lugar de seguir la pantalla.
    let accessBtn = document.querySelector('.btn-accessibility');
    if (!accessBtn) {
      accessBtn = document.createElement('button');
      accessBtn.className = 'btn-accessibility';
      accessBtn.id = 'btnAccessibility';
      accessBtn.setAttribute('aria-label', 'Abrir panel de accesibilidad');
      accessBtn.setAttribute('title', 'Opciones de Accesibilidad');
    }
    
    // Asegurar SIEMPRE que esté como hijo directo de body
    if (accessBtn.parentElement !== document.body) {
      document.body.appendChild(accessBtn);
    }
    
    // Inyectar el icono stickman con brazos abiertos y piernas abiertas
    accessBtn.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="4" r="2.2" />
        <path d="M19 7.5h-14c-.55 0-1 .45-1 1s.45 1 1 1h4v11c0 .55.45 1 1 1s1-.45 1-1v-5h2v5c0 .55.45 1 1 1s1-.45 1-1v-11h4c.55 0 1-.45 1-1s-.45-1-1-1z" />
      </svg>
    `;
    accessBtn.setAttribute('aria-expanded', 'false');
    accessBtn.setAttribute('aria-controls', 'accessDrawer');

    // 5.1.2 Botón Flotante de WhatsApp para atención y conversión inmediata
    let waFloatBtn = document.querySelector('.btn-whatsapp-float');
    if (!waFloatBtn) {
      waFloatBtn = document.createElement('a');
      waFloatBtn.className = 'btn-whatsapp-float';
      waFloatBtn.id = 'btnWhatsAppFloat';
      waFloatBtn.href = 'https://wa.me/573124117482?text=Hola%2C%20quisiera%20solicitar%20asesor%C3%ADa%20profesional%20con%20Stratum%20Group.';
      waFloatBtn.target = '_blank';
      waFloatBtn.rel = 'noopener noreferrer';
      waFloatBtn.setAttribute('aria-label', 'Contactar a Stratum Group por WhatsApp');
      waFloatBtn.setAttribute('title', 'Chatea con nosotros por WhatsApp');
      waFloatBtn.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.02C8.94 7.02 8.67 7.08 8.44 7.34C8.21 7.59 7.56 8.2 7.56 9.45C7.56 10.7 8.47 11.91 8.6 12.08C8.73 12.25 10.38 14.88 12.95 15.96C15.09 16.86 15.53 16.68 16 16.64C16.47 16.59 17.53 16 17.75 15.38C17.97 14.75 17.97 14.21 17.91 14.1C17.84 14 17.68 13.93 17.44 13.82C17.2 13.7 16.02 13.12 15.8 13.04C15.58 12.96 15.42 12.92 15.26 13.17C15.1 13.41 14.64 13.96 14.5 14.12C14.36 14.29 14.22 14.31 13.98 14.19C13.74 14.07 12.97 13.82 12.05 13C11.33 12.36 10.84 11.57 10.7 11.33C10.56 11.09 10.69 10.96 10.81 10.84C10.92 10.73 11.05 10.56 11.17 10.42C11.29 10.28 11.33 10.18 11.41 10.02C11.49 9.85 11.45 9.71 11.39 9.59C11.33 9.47 10.84 8.26 10.64 7.76C10.44 7.27 10.24 7.34 10.08 7.33C9.93 7.33 9.77 7.33 9.6 7.33L9.11 7.02Z"/>
        </svg>
      `;
      document.body.appendChild(waFloatBtn);
    }

    // 5.2 Inyectar el Telón de Fondo (Backdrop) y el Panel Lateral (Drawer) si no existen
    if (!document.getElementById('accessBackdrop')) {
      const backdropHtml = `<div class="access-backdrop" id="accessBackdrop" aria-hidden="true"></div>`;
      document.body.insertAdjacentHTML('beforeend', backdropHtml);
    }

    if (!document.getElementById('accessDrawer')) {
      const drawerHtml = `
        <aside class="access-drawer" id="accessDrawer" role="dialog" aria-modal="true" inert aria-label="Panel de opciones de accesibilidad">
          <!-- Encabezado del Panel -->
          <div class="access-drawer-header">
            <div class="access-drawer-title-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="4" r="2.2" />
                <path d="M19 7.5h-14c-.55 0-1 .45-1 1s.45 1 1 1h4v11c0 .55.45 1 1 1s1-.45 1-1v-5h2v5c0 .55.45 1 1 1s1-.45 1-1v-11h4c.55 0 1-.45 1-1s-.45-1-1-1z" />
              </svg>
              <h3 class="access-drawer-title">Accesibilidad Stratum</h3>
            </div>
            <button type="button" class="access-close-btn" id="accessCloseBtn" aria-label="Cerrar panel de accesibilidad">&times;</button>
          </div>

          <!-- Cuerpo con las 3 tarjetas requeridas -->
          <div class="access-drawer-body">
            
            <!-- TARJETA 1: TAMAÑO DE TEXTO -->
            <div class="access-card">
              <h4 class="access-card-title">TAMAÑO DE TEXTO</h4>
              <div class="access-btn-group" role="group" aria-label="Opciones de tamaño de fuente">
                <button type="button" class="access-group-btn" id="btnFontDec" aria-label="Disminuir tamaño de texto">A -</button>
                <button type="button" class="access-group-btn active" id="btnFontNorm" aria-label="Tamaño de texto normal">Normal</button>
                <button type="button" class="access-group-btn" id="btnFontInc" aria-label="Aumentar tamaño de texto">A +</button>
              </div>
            </div>

            <!-- TARJETA 2: OPCIONES DE CONTRASTE Y COLOR -->
            <div class="access-card">
              <h4 class="access-card-title">OPCIONES DE CONTRASTE Y COLOR</h4>
              <label class="access-toggle-row" for="chkHighContrast" style="margin-bottom: 0.85rem;">
                <div class="access-switch">
                  <input type="checkbox" id="chkHighContrast" aria-label="Activar alto contraste">
                  <span class="access-switch-slider"></span>
                </div>
                <span class="access-toggle-label">Alto Contraste</span>
              </label>
              <label class="access-toggle-row" for="chkGrayscale">
                <div class="access-switch">
                  <input type="checkbox" id="chkGrayscale" aria-label="Activar escala de grises">
                  <span class="access-switch-slider"></span>
                </div>
                <span class="access-toggle-label">Escala de Grises</span>
              </label>
            </div>

            <!-- TARJETA 3: TEMAS VISUALES -->
            <div class="access-card">
              <h4 class="access-card-title">TEMAS VISUALES</h4>
              <div class="access-radio-group">
                <label class="access-radio-row">
                  <input type="radio" name="accessThemeRadio" id="radioThemeLight" value="stratum-light" checked>
                  <span class="access-radio-label">Stratum Oficial (Claro)</span>
                </label>
                <label class="access-radio-row">
                  <input type="radio" name="accessThemeRadio" id="radioThemeDark" value="dark">
                  <span class="access-radio-label">Modo Oscuro</span>
                </label>
              </div>
            </div>

            <!-- BOTÓN RESTABLECER -->
            <button type="button" class="access-reset-btn" id="btnAccessReset" title="Volver a la configuración predeterminada">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Restablecer valores iniciales
            </button>

          </div>
        </aside>
      `;
      document.body.insertAdjacentHTML('beforeend', drawerHtml);
    }

    const drawer = document.getElementById('accessDrawer');
    const backdrop = document.getElementById('accessBackdrop');
    const closeBtn = document.getElementById('accessCloseBtn');
    const btnFontDec = document.getElementById('btnFontDec');
    const btnFontNorm = document.getElementById('btnFontNorm');
    const btnFontInc = document.getElementById('btnFontInc');
    const chkHighContrast = document.getElementById('chkHighContrast');
    const chkGrayscale = document.getElementById('chkGrayscale');
    const radioThemeLight = document.getElementById('radioThemeLight');
    const radioThemeDark = document.getElementById('radioThemeDark');
    const btnReset = document.getElementById('btnAccessReset');

    // 5.3 Apertura y Cierre del Panel Lateral
    let fondo = [];
    const openDrawer = () => {
      drawer.inert = false;
      fondo = [...document.body.children].filter(el => el !== drawer && el !== backdrop && !el.inert);
      fondo.forEach(el => { el.inert = true; });
      drawer.classList.add('active');
      backdrop.classList.add('active');
      accessBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    };

    const closeDrawer = () => {
      drawer.classList.remove('active');
      backdrop.classList.remove('active');
      accessBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      fondo.forEach(el => { el.inert = false; });
      fondo = [];
      drawer.inert = true;
      accessBtn.focus();
    };

    accessBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (drawer.classList.contains('active')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (!drawer.classList.contains('active')) return;
      if (e.key === 'Escape') {
        closeDrawer();
      } else if (e.key === 'Tab' && e.shiftKey && document.activeElement === closeBtn) {
        e.preventDefault();
        btnReset.focus();
      } else if (e.key === 'Tab' && !e.shiftKey && document.activeElement === btnReset) {
        e.preventDefault();
        closeBtn.focus();
      }
    });

    // 5.4 Persistencia y sincronización de preferencias (localStorage)
    const saveAccessPrefs = (prefs) => {
      try {
        localStorage.setItem('stratum_access_prefs', JSON.stringify(prefs));
      } catch (err) {
        console.warn('Error guardando accesibilidad:', err);
      }
    };

    const getCurrentPrefs = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem('stratum_access_prefs'));
        return prefs && typeof prefs === 'object' && !Array.isArray(prefs) ? prefs : {};
      } catch (e) {
        return {};
      }
    };

    const updateFontButtons = (size) => {
      if (btnFontDec) btnFontDec.classList.toggle('active', size === 'small');
      if (btnFontNorm) btnFontNorm.classList.toggle('active', size === 'normal');
      if (btnFontInc) btnFontInc.classList.toggle('active', size === 'large');
    };

    const applyFontSize = (size) => {
      document.documentElement.classList.remove('font-size-small', 'font-size-large');
      if (size === 'small') {
        document.documentElement.classList.add('font-size-small');
      } else if (size === 'large') {
        document.documentElement.classList.add('font-size-large');
      }
      updateFontButtons(size);
      const current = getCurrentPrefs();
      current.fontSize = size;
      saveAccessPrefs(current);
    };

    const applyContrast = (isHigh) => {
      document.documentElement.classList.toggle('high-contrast', isHigh);
      document.body.classList.toggle('high-contrast', isHigh);
      if (chkHighContrast) chkHighContrast.checked = isHigh;
      const current = getCurrentPrefs();
      current.highContrast = isHigh;
      saveAccessPrefs(current);
    };

    const applyGrayscale = (isGray) => {
      document.documentElement.classList.toggle('grayscale', isGray);
      if (chkGrayscale) chkGrayscale.checked = isGray;
      const current = getCurrentPrefs();
      current.grayscale = isGray;
      saveAccessPrefs(current);
    };

    const applyTheme = (theme) => {
      const isDark = (theme === 'dark');
      document.documentElement.classList.toggle('dark-mode', isDark);
      document.body.classList.toggle('dark-mode', isDark);
      if (radioThemeLight) radioThemeLight.checked = !isDark;
      if (radioThemeDark) radioThemeDark.checked = isDark;
      const current = getCurrentPrefs();
      current.theme = isDark ? 'dark' : 'stratum-light';
      saveAccessPrefs(current);
    };

    // 5.5 Event Listeners de los Controles
    if (btnFontDec) btnFontDec.addEventListener('click', () => applyFontSize('small'));
    if (btnFontNorm) btnFontNorm.addEventListener('click', () => applyFontSize('normal'));
    if (btnFontInc) btnFontInc.addEventListener('click', () => applyFontSize('large'));

    if (chkHighContrast) {
      chkHighContrast.addEventListener('change', (e) => {
        applyContrast(e.target.checked);
      });
    }

    if (chkGrayscale) {
      chkGrayscale.addEventListener('change', (e) => {
        applyGrayscale(e.target.checked);
      });
    }

    if (radioThemeLight) {
      radioThemeLight.addEventListener('change', () => {
        if (radioThemeLight.checked) applyTheme('stratum-light');
      });
    }

    if (radioThemeDark) {
      radioThemeDark.addEventListener('change', () => {
        if (radioThemeDark.checked) applyTheme('dark');
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        applyFontSize('normal');
        applyContrast(false);
        applyGrayscale(false);
        applyTheme('stratum-light');
        try {
          localStorage.removeItem('stratum_access_prefs');
        } catch (e) {}
      });
    }

    // 5.6 Cargar y aplicar preferencias al iniciar
    const saved = getCurrentPrefs();
    applyFontSize(saved.fontSize || 'normal');
    applyContrast(!!saved.highContrast);
    applyGrayscale(!!saved.grayscale);
    applyTheme(saved.theme || 'stratum-light');
  }

  // 6. ANIMACIONES AL HACER SCROLL (INTERSECTION OBSERVER CON FALLBACK SEGURO)
  const revealTargets = document.querySelectorAll('.reveal-on-scroll, .service-card-d6, .why-card, .value-card, .pillar-card, .method-card, .news-card-d6');
  if (revealTargets.length > 0) {
    const revealAll = () => {
      revealTargets.forEach(el => el.classList.add('is-revealed'));
    };

    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const scrollObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        threshold: 0.05,
        rootMargin: '0px 0px 40px 0px'
      });

      revealTargets.forEach(el => {
        if (!el.classList.contains('reveal-on-scroll')) {
          el.classList.add('reveal-on-scroll');
        }
        scrollObserver.observe(el);
      });

      // Fallback de seguridad para garantizar que ninguna sección quede invisible en móviles/tablets
      setTimeout(revealAll, 1200);
    } else {
      revealAll();
    }
  }

  // 9. MEDICIÓN AUTOMÁTICA DE CONVERSIONES Y EVENTOS CLAVE EN GA4
  initConversionTracking();

  // 10. MÓDULOS DE INTERACCIÓN EDITORIAL STRATUM (PESTAÑAS, CURVAS, ÍNDICE)
  initStratumUI();
});

// Medición de eventos de conversión y contacto para Google Analytics 4 (GA4)
function initConversionTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    if (href.includes('wa.me') || href.includes('whatsapp.com')) {
      if (typeof gtag === 'function') {
        gtag('event', 'contact', {
          method: 'WhatsApp',
          event_category: 'conversiones',
          event_label: href
        });
      }
    } else if (href.startsWith('tel:')) {
      if (typeof gtag === 'function') {
        gtag('event', 'contact', {
          method: 'Phone',
          event_category: 'conversiones',
          event_label: href.replace('tel:', '')
        });
      }
    } else if (href.startsWith('mailto:')) {
      if (typeof gtag === 'function') {
        gtag('event', 'contact', {
          method: 'Email',
          event_category: 'conversiones',
          event_label: href.replace('mailto:', '')
        });
      }
    }
  });
}

// Control de interactividad editorial Stratum (Pestañas metodología, curvas topográficas, espía de índice legal)
function initStratumUI() {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Revelado por visibilidad: curvas de nivel (.contours) y franjas (.reveal)
  const targets = Array.from(document.querySelectorAll('.contours, .reveal'));
  const show = (el) => el.classList.add('is-in');

  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          show(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 40px 0px' });

    targets.forEach((t) => io.observe(t));
    setTimeout(() => { targets.forEach(show); }, 1200);
  } else {
    targets.forEach(show);
  }

  // 2. Pestañas interactivas de metodología (¿Cómo trabajamos?)
  const tabs = Array.from(document.querySelectorAll('.step-btn'));
  if (tabs.length) {
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const select = (i) => {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (panels[k]) {
          panels[k].hidden = !on;
          if (on) {
            const img = panels[k].querySelector('img[loading="lazy"]');
            if (img) img.setAttribute('loading', 'eager');
            panels[k].classList.remove('is-swap');
            void panels[k].offsetWidth;
            panels[k].classList.add('is-swap');
          }
        }
      });
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (n !== null) {
          e.preventDefault();
          select(n);
          tabs[n].focus();
        }
      });
    });

    select(0);
  }

  // 3. Índice lateral para páginas legales
  const links = Array.from(document.querySelectorAll('.index a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    const map = {};
    links.forEach((a) => {
      const targetId = a.getAttribute('href').slice(1);
      if (targetId) map[targetId] = a;
    });

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((a) => a.removeAttribute('aria-current'));
          const a = map[en.target.id];
          if (a) a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    Object.keys(map).forEach((id) => {
      const s = document.getElementById(id);
      if (s) spy.observe(s);
    });

    if (links[0]) links[0].setAttribute('aria-current', 'true');
  }
}


