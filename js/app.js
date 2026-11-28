// Sin movimiento si el sistema lo pide o si se activó «Pausar animaciones» en el panel de accesibilidad.
const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  || document.documentElement.getAttribute('data-a11y-pausa') === 'si';

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
      if (targetStr === null) return; // Cifras fijas, como un año, no se animan.
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
  if (statsBanner && 'IntersectionObserver' in window && !sinMovimiento()) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        animateStats();
      }
    }, { threshold: 0.4 });
    observer.observe(statsBanner);
  }

  // 1b. DETECCIÓN AUTOMÁTICA DE PÁGINA ACTIVA EN EL MENÚ
  const pageName = path => path.split('/').filter(Boolean).at(-1)?.replace(/\.html$/, '') || 'index';
  const currentPath = pageName(window.location.pathname);
  navMenu?.querySelectorAll('a').forEach(link => {
    const current = pageName(new URL(link.href).pathname) === currentPath;
    link.classList.toggle('active', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // 5. El botón y el panel de accesibilidad están en js/accesibilidad.js.

  // 6. ANIMACIONES AL HACER SCROLL (INTERSECTION OBSERVER CON FALLBACK SEGURO)
  const revealTargets = document.querySelectorAll('.reveal-on-scroll, .value-card');
  if (revealTargets.length > 0) {
    const revealAll = () => {
      revealTargets.forEach(el => el.classList.add('is-revealed'));
    };

    if ('IntersectionObserver' in window && !sinMovimiento()) {
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
  const reduce = sinMovimiento();

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


