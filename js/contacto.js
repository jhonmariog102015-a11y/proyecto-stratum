import { esVistaLocal } from "./entorno.js";

const form = document.getElementById("contactForm");
const boton = document.getElementById("btnSubmitContact");
if (esVistaLocal) {
  const aviso = document.getElementById("contact-delivery");
  aviso.setAttribute("role", "status");
  aviso.textContent = "Vista local. Puedes probar el formulario con datos ficticios.";
  boton.textContent = "Probar formulario";
  form.addEventListener("submit", event => {
    event.preventDefault();
    aviso.textContent = "Prueba completada. Los datos se validaron y permanecen en este navegador.";
  });
} else {
  form.action = form.dataset.destino;
  form.method = "post";
  form.elements.namedItem("_next").value = new URL("/gracias", location.origin).href;
}
boton.disabled = false;
