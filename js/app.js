// PROTECCIÓN UNIVERSAL ANTI-CLICKJACKING (Aplica a todas las páginas públicas del sitio)
if (window.top !== window.self) {
  try {
    window.top.location = window.self.location;
  } catch (e) {
    document.documentElement.style.display = 'none';
  }
}

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

  // 2. MENÚ MÓVIL (HAMBURGUESA)
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.querySelector('.nav-menu-d6');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      menuToggle.classList.toggle('active'); // Para animar el botón si es necesario
    });
    
    // Cerrar el menú al hacer clic en un enlace
    const navLinks = navMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.classList.remove('active');
      });
    });
  }

  // 3. CONTADOR ANIMADO (COUNT-UP) CON INTERSECTION OBSERVER
  const statElements = document.querySelectorAll('.stat-number-d6');
  let animated = false;

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
          displayVal = current.toFixed(1);
        } else if (isFormat === 'comma') {
          displayVal = Math.floor(current).toLocaleString('es-CO');
        } else {
          displayVal = Math.floor(current);
        }

        el.textContent = prefix + displayVal;
      }, stepTime);
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateStats();
      }
    });
  }, { threshold: 0.4 });

  const statsBanner = document.getElementById('statsBanner');
  if (statsBanner) {
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
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const menuLinks = document.querySelectorAll('.nav-menu-d6 a');
  menuLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
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
        <aside class="access-drawer" id="accessDrawer" role="dialog" aria-modal="true" aria-label="Panel de opciones de accesibilidad">
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
    const openDrawer = () => {
      drawer.classList.add('active');
      backdrop.classList.add('active');
      accessBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      drawer.classList.remove('active');
      backdrop.classList.remove('active');
      accessBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
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
      if (e.key === 'Escape' && drawer.classList.contains('active')) {
        closeDrawer();
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
        return JSON.parse(localStorage.getItem('stratum_access_prefs') || '{}');
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

  // 6. ANIMACIONES AL HACER SCROLL (INTERSECTION OBSERVER)
  const revealTargets = document.querySelectorAll('.reveal-on-scroll, .service-card-d6, .why-card, .value-card, .pillar-card, .method-card, .news-card-d6');
  if ('IntersectionObserver' in window && revealTargets.length > 0) {
    const scrollObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealTargets.forEach(el => {
      if (!el.classList.contains('reveal-on-scroll')) {
        el.classList.add('reveal-on-scroll');
      }
      scrollObserver.observe(el);
    });
  }

  // 7. ENVÍO ASÍNCRONO DEL FORMULARIO DE CONTACTO (AJAX / FORMSUBMIT) Y CAPTCHA (REQ. 45)
  const contactForm = document.getElementById('contactForm');
  
  // Generador de CAPTCHA matemático interactivo con garantía de cambio y animación (Req. 45)
  let lastCaptchaEquation = '';
  function initCaptcha(animate = false) {
    const textEl = document.getElementById('captchaText');
    const expectedEl = document.getElementById('captchaExpected');
    const answerEl = document.getElementById('formCaptchaAnswer');
    const refreshBtn = document.getElementById('btnRefreshCaptcha');
    if (!textEl || !expectedEl) return;

    let num1, num2, equation, sum;
    do {
      num1 = Math.floor(Math.random() * 8) + 2;
      num2 = Math.floor(Math.random() * 8) + 1;
      equation = `${num1} + ${num2} = ?`;
      sum = num1 + num2;
    } while (equation === lastCaptchaEquation);

    lastCaptchaEquation = equation;
    textEl.textContent = equation;
    expectedEl.value = sum.toString();
    if (answerEl) answerEl.value = '';

    if (animate && refreshBtn) {
      refreshBtn.classList.remove('spin');
      void refreshBtn.offsetWidth; // Forzar reflow para reiniciar giro
      refreshBtn.classList.add('spin');
      setTimeout(() => refreshBtn.classList.remove('spin'), 500);
    }
  }

  const btnRefreshCaptcha = document.getElementById('btnRefreshCaptcha');
  if (btnRefreshCaptcha) {
    btnRefreshCaptcha.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      initCaptcha(true);
      const answerEl = document.getElementById('formCaptchaAnswer');
      if (answerEl) answerEl.focus();
    });
  }
  initCaptcha();

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitContact');
      const alertBox = document.getElementById('contactAlert');
      if (alertBox) alertBox.style.display = 'none';

      // Detección de honeypot para neutralizar bots
      const honey = document.getElementById('formHoney')?.value;
      if (honey) return;

      // Validación de CAPTCHA (Req. 45)
      const answerVal = document.getElementById('formCaptchaAnswer')?.value.trim();
      const expectedVal = document.getElementById('captchaExpected')?.value;
      if (!answerVal || answerVal !== expectedVal) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.className = 'alert-box alert-error';
          alertBox.textContent = 'La respuesta de seguridad anti-spam es incorrecta. Por favor resuélvela de nuevo.';
        }
        initCaptcha();
        document.getElementById('formCaptchaAnswer')?.focus();
        return;
      }

      // Rate limit antispam: mínimo 30 segundos entre envíos sucesivos
      const lastSubmit = parseInt(localStorage.getItem('stratum_last_contact_ts') || '0', 10);
      const now = Date.now();
      if (now - lastSubmit < 30000) {
        const waitSec = Math.ceil((30000 - (now - lastSubmit)) / 1000);
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.className = 'alert-box alert-error';
          alertBox.textContent = `Por seguridad, espera ${waitSec} segundos antes de enviar otro mensaje.`;
        }
        return;
      }

      // Validación obligatoria de Habeas Data (Ley 1581 de 2012)
      const consent = document.getElementById('formConsent');
      if (consent && !consent.checked) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.className = 'alert-box alert-error';
          alertBox.textContent = 'Debes autorizar el tratamiento de datos personales para poder enviar el formulario.';
        }
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Enviando mensaje...';
        btn.style.opacity = '0.75';
      }

      const payload = {
        nombre: document.getElementById('formNombre')?.value.trim(),
        empresa: document.getElementById('formEmpresa')?.value.trim() || 'No especificada',
        telefono: document.getElementById('formTelefono')?.value.trim(),
        email: document.getElementById('formEmail')?.value.trim(),
        motivo: document.getElementById('formMotivo')?.value.trim(),
        mensaje: document.getElementById('formMensaje')?.value.trim(),
        _subject: 'Nuevo contacto desde la página web de Stratum Group',
        _captcha: 'false'
      };

      try {
        const target = atob('amhvbm1hcmlvZzEwMjAxNUBnbWFpbC5jb20=');
        const response = await fetch(`https://formsubmit.co/ajax/${target}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok || data.success === 'true' || data.success === true) {
          if (typeof gtag === 'function') {
            gtag('event', 'generate_lead', {
              event_category: 'contacto',
              event_label: 'formulario_web'
            });
          }
          localStorage.setItem('stratum_last_contact_ts', Date.now().toString());
          initCaptcha();
          window.location.href = 'gracias.html';
        } else {
          throw new Error(data.message || 'Error al procesar el mensaje');
        }
      } catch (err) {
        console.error('Error enviando formulario:', err);
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.className = 'alert-box alert-error';
          alertBox.textContent = 'Hubo un inconveniente al enviar tu mensaje. Por favor intenta nuevamente o escríbenos directamente a WhatsApp (+57 312 411 7482).';
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'ENVIAR';
          btn.style.opacity = '1';
        }
      }
    });
  }

  // 8. MODAL UNIVERSAL DE POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES (LEY 1581 DE 2012)
  initPrivacyModal();

  // 9. MEDICIÓN AUTOMÁTICA DE CONVERSIONES Y EVENTOS CLAVE EN GA4
  initConversionTracking();
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

// Función creadora y controladora del Modal Legal
function initPrivacyModal() {
  // Solo inyectar si aún no existe en el DOM
  if (!document.getElementById('legalPrivacyModal')) {
    const modalHTML = `
      <div id="legalPrivacyModal" class="legal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacyModalTitle">
        <div class="legal-modal-window">
          <div class="legal-modal-header">
            <h3 id="privacyModalTitle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Política de Tratamiento de Datos Personales
            </h3>
            <button type="button" class="legal-modal-close" id="btnClosePrivacyModal" aria-label="Cerrar política">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="legal-modal-body">
            <h4>1. Responsable del Tratamiento</h4>
            <p><strong>Stratum Group S.A.S.</strong>, sociedad comercial legalmente constituida en la República de Colombia, con domicilio principal en Ubaté, Cundinamarca, y correo de atención y notificaciones: <a href="mailto:stratumgroupsas@gmail.com" style="color:var(--accent-gold);">stratumgroupsas@gmail.com</a>.</p>

            <h4>2. Marco Legal y Cumplimiento</h4>
            <p>Dando estricto cumplimiento a lo preceptuado en la <strong>Ley Estatutaria 1581 de 2012</strong>, el <strong>Decreto 1377 de 2013</strong> y la Circular Externa de la Superintendencia de Industria y Comercio (SIC), se adopta la presente Política para garantizar la debida recolección, almacenamiento, uso y protección de los datos suministrados por visitantes y clientes.</p>

            <h4>3. Finalidad de la Recolección de Datos</h4>
            <p>Los datos solicitados a través del formulario de contacto (Nombre, Correo, Teléfono, Empresa y Motivo de Consulta) serán tratados exclusivamente con los siguientes fines:</p>
            <ul>
              <li>Atender, tramitar y responder formalmente a solicitudes de contacto, cotizaciones e inquietudes sobre servicios de consultoría e ingeniería.</li>
              <li>Presentar propuestas técnico-económicas para proyectos mineros, geológicos, ambientales o de software e inteligencia artificial solicitados expresamente por el titular.</li>
              <li>Establecer canales directos de comunicación comercial e institucional entre el solicitante y nuestro equipo de ingenieros y especialistas.</li>
            </ul>
            <p><strong>Garantía de Confidencialidad:</strong> Stratum Group S.A.S. <u>no vende, cede ni transfiere</u> datos personales a terceros comerciales bajo ninguna circunstancia.</p>

            <h4>4. Derechos del Titular (Habeas Data)</h4>
            <p>En concordancia con el artículo 8 de la Ley 1581 de 2012, usted como titular de la información tiene derecho en cualquier momento a:</p>
            <ul>
              <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales frente al Responsable.</li>
              <li><strong>Solicitar prueba</strong> de la autorización otorgada para su tratamiento.</li>
              <li><strong>Ser informado</strong> respecto del uso que se le ha dado a sus datos personales.</li>
              <li><strong>Revocar la autorización</strong> o solicitar la supresión de sus datos mediante comunicación formal dirigida al correo <em>stratumgroupsas@gmail.com</em>.</li>
            </ul>

            <h4>5. Seguridad de la Información</h4>
            <p>Contamos con protocolos técnicos, criptográficos y de seguridad informática (cabeceras seguras HSTS, sanitización de datos y canales cifrados HTTPS) para salvaguardar la integridad de la información contra pérdida, consulta o acceso no autorizado.</p>
            <p style="margin-top: 1rem;"><a href="politica-privacidad.html" style="color:var(--accent-gold); text-decoration: underline; font-weight: 600;">Consultar documento completo de Política de Tratamiento &rarr;</a></p>
          </div>
          <div class="legal-modal-footer">
            <span>Stratum Group S.A.S. • Ubaté, Colombia</span>
            <button type="button" class="legal-modal-btn-accept" id="btnAcceptPrivacyModal">Entendido y Aceptar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  const modal = document.getElementById('legalPrivacyModal');
  const btnClose = document.getElementById('btnClosePrivacyModal');
  const btnAccept = document.getElementById('btnAcceptPrivacyModal');

  function openModal(e) {
    if (e) e.preventDefault();
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Vincular a todos los botones o enlaces con la clase .js-open-privacy
  document.querySelectorAll('.js-open-privacy').forEach(trigger => {
    trigger.addEventListener('click', openModal);
  });

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnAccept) btnAccept.addEventListener('click', closeModal);

  // Cerrar al hacer clic en el fondo oscuro
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Cerrar con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

