window.dataLayer = window.dataLayer || [];
window.gtag = function () { window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', 'G-XV8K98LN1V');

// Cuenta un envío al llegar a la página de confirmación, una sola vez por intento.
try {
  const pendingLead = 'stratum_contact_pending';
  document.addEventListener('submit', event => {
    if (event.target.id === 'contactForm') {
      try {
        sessionStorage.setItem(pendingLead, String(Date.now()));
      } catch { /* El formulario puede enviarse sin almacenamiento. */ }
    }
  });
  if (/^\/gracias(?:\.html)?$/.test(location.pathname)) {
    const submittedAt = Number(sessionStorage.getItem(pendingLead));
    sessionStorage.removeItem(pendingLead);
    if (submittedAt > 0 && Date.now() - submittedAt < 30 * 60 * 1000) {
      window.gtag('event', 'generate_lead', { event_category: 'contacto', event_label: 'formulario_web' });
    }
  }
} catch { /* Las restricciones del navegador no deben afectar al sitio. */ }

const tag = document.createElement('script');
tag.async = true;
tag.src = 'https://www.googletagmanager.com/gtag/js?id=G-XV8K98LN1V';
document.head.append(tag);
