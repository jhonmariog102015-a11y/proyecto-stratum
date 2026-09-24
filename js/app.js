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

  // 5. ACCESSIBILITY MENU (CON PERSISTENCIA EN LOCALSTORAGE)
  const accessBtn = document.querySelector('.btn-accessibility');
  if (accessBtn) {
    // Restaurar preferencias guardadas
    try {
      const savedPrefs = JSON.parse(localStorage.getItem('stratum_access_prefs') || '{}');
      if (savedPrefs.largeText) document.body.classList.add('large-text');
      if (savedPrefs.highContrast) document.body.classList.add('high-contrast');
      if (savedPrefs.grayscale) document.body.classList.add('grayscale');
    } catch (e) {
      console.warn('Error leyendo accesibilidad:', e);
    }

    const saveAccessPrefs = () => {
      try {
        const prefs = {
          largeText: document.body.classList.contains('large-text'),
          highContrast: document.body.classList.contains('high-contrast'),
          grayscale: document.body.classList.contains('grayscale')
        };
        localStorage.setItem('stratum_access_prefs', JSON.stringify(prefs));
      } catch (e) {}
    };

    const menuHtml = `
      <div class="access-menu" id="accessMenu">
        <button class="access-btn" id="btnTextInc">Aumentar Texto</button>
        <button class="access-btn" id="btnTextDec">Disminuir Texto</button>
        <button class="access-btn" id="btnContrast">Alto Contraste</button>
        <button class="access-btn" id="btnGrayscale">Escala de Grises</button>
        <button class="access-btn" id="btnReset">Restablecer</button>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', menuHtml);

    const accessMenu = document.getElementById('accessMenu');
    accessBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      accessMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!accessMenu.contains(e.target) && !accessBtn.contains(e.target)) {
        accessMenu.classList.remove('active');
      }
    });

    document.getElementById('btnTextInc').addEventListener('click', () => {
      document.body.classList.add('large-text');
      saveAccessPrefs();
    });
    
    document.getElementById('btnTextDec').addEventListener('click', () => {
      document.body.classList.remove('large-text');
      saveAccessPrefs();
    });
    
    document.getElementById('btnContrast').addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
      saveAccessPrefs();
    });
    
    document.getElementById('btnGrayscale').addEventListener('click', () => {
      document.body.classList.toggle('grayscale');
      saveAccessPrefs();
    });
    
    document.getElementById('btnReset').addEventListener('click', () => {
      document.body.classList.remove('large-text', 'high-contrast', 'grayscale');
      localStorage.removeItem('stratum_access_prefs');
    });
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

  // 7. ENVÍO ASÍNCRONO DEL FORMULARIO DE CONTACTO (AJAX / FORMSUBMIT)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSubmitContact');
      const alertBox = document.getElementById('contactAlert');
      if (alertBox) alertBox.style.display = 'none';

      // Detección de honeypot para neutralizar bots
      const honey = document.getElementById('formHoney')?.value;
      if (honey) return;

      // Rate limit antispam: mínimo 45 segundos entre envíos sucesivos
      const lastSubmit = parseInt(localStorage.getItem('stratum_last_contact_ts') || '0', 10);
      const now = Date.now();
      if (now - lastSubmit < 45000) {
        const waitSec = Math.ceil((45000 - (now - lastSubmit)) / 1000);
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
          localStorage.setItem('stratum_last_contact_ts', Date.now().toString());
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
});

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

