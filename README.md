# 🏔️ Stratum Group S.A.S. — Documentación Técnica del Sitio Web

> **Firma especializada en Consultoría, Interventoría e Ingeniería Minera, Geológica, Ambiental y Tecnológica con IA.**  
> Este documento contiene la explicación exhaustiva de la arquitectura del código, estructura de archivos, módulos de JavaScript, estilos CSS y servicios en la nube utilizados en la plataforma web.

---

## 📑 Tabla de Contenidos
1. [Resumen del Proyecto y Arquitectura](#1-resumen-del-proyecto-y-arquitectura)
2. [Estructura del Repositorio](#2-estructura-del-repositorio)
3. [Detalle de Páginas y Funcionalidades](#3-detalle-de-páginas-y-funcionalidades)
4. [Sistema de Diseño y CSS (`css/diseno6.css`)](#4-sistema-de-diseño-y-css)
5. [Lógica JavaScript del Cliente (`js/app.js`)](#5-lógica-javascript-del-cliente)
6. [Backend Serverless y Base de Datos (`js/firebase_noticias.js`)](#6-backend-serverless-y-base-de-datos)
7. [Seguridad Criptográfica y Control de Acceso](#7-seguridad-criptográfica-y-control-de-acceso)
8. [Servicios e Integraciones Externas](#8-servicios-e-integraciones-externas)
9. [Guía de Despliegue y Mantenimiento](#9-guía-de-despliegue-y-mantenimiento)

---

## 1. Resumen del Proyecto y Arquitectura

El sitio web está desarrollado bajo la filosofía **Jamstack (JavaScript, APIs y Markup)**:
* **Cero dependencias pesadas (Vanilla Puro):** No utiliza frameworks con sobrepeso como React, Angular, Vue, WordPress ni librerías como jQuery o Bootstrap. Esto asegura tiempos de carga instantáneos (<1 segundo), máxima compatibilidad con navegadores y nulo consumo de servidor para renderizado.
* **Multi-Page Application (MPA):** Cada sección corresponde a un documento HTML semántico independiente optimizado para SEO técnico y rastreo de motores de búsqueda.
* **Backend as a Service (BaaS):** Se apoya en la infraestructura cloud de **Google Firebase (Firestore y Auth)**, eliminando costos fijos de servidores backend y base de datos.
* **Sin proceso de compilación (Zero-Build):** No requiere `npm install` ni `npm run build` para ponerse en producción. El código puede ser desplegado de inmediato en cualquier servidor o CDN estática.

---

## 2. Estructura del Repositorio

```plaintext
/
├── index.html                   # Página principal (Landing page corporativa)
├── nosotros.html                # Identidad, misión, visión y enfoque tecnológico
├── servicios.html               # Catálogo de 5 pilares técnicos y descarga de portafolio
├── noticias.html                # Feed público con noticias dinámicas desde la nube
├── contacto.html                # Formulario comercial y mapa de ubicación
├── admin_noticias.html          # Panel privado: Autenticación, gestión de noticias y seguridad
│
├── css/
│   └── diseno6.css              # Hoja de estilos centralizada (Sistema de diseño corporativo)
│
├── js/
│   ├── app.js                   # Interactividad visual, scroll, animaciones y accesibilidad
│   └── firebase_noticias.js     # Conexión al SDK modular de Google Firebase
│
├── assets/
│   ├── Portafolio_Stratum_Group.pdf  # Portafolio técnico oficial descargable
│   ├── drone_landscape.png           # Render satelital para héroes visuales
│   └── logos/                        # Logos de entidades (ANM, CAR, Corpoboyacá, etc.)
│
└── img/
    ├── logo_complet_sin_fondo.png    # Logotipo completo oficial
    └── logo stratum solo logo.png    # Isotipo / Favicon para navegadores
```

---

## 3. Detalle de Páginas y Funcionalidades

### 1. `index.html` (Portada Principal)
* **Header Dinámico:** Barra de navegación transparente con efecto de desenfoque al hacer scroll (`backdrop-filter`).
* **Hero Banner:** Llamado a la acción con fondo de alta calidad y enlaces rápidos a contacto y servicios.
* **Banner de Métricas (`#statsBanner`):** Contadores automáticos (*+15 Años*, *100% Cumplimiento*, *+50 Proyectos*, *5 Pilares*) activados al entrar en pantalla.
* **Pilares de Servicio:** Resumen visual de los campos de acción de la compañía.
* **Sectores Interactivos (`.sector-card-interactive`):** Tarjetas desplegables de minería de carbón, metales preciosos, agregados, energía e infraestructura.
* **Slider de Entidades Aliadas:** Logos de ANM, ANLA, CAR, Ministerio de Minas y Fiscalía General.
* **Footer Institucional:** Enlaces directos a WhatsApp, correo corporativo y widget de accesibilidad.

### 2. `nosotros.html` (Historia y Valores)
* **Héroe Angular:** Cabecera con corte poligonal geométrico (`clip-path`).
* **Sección Institucional:** Trayectoria de Stratum Group desde 2018.
* **Misión y Visión:** Tarjetas gemelas con borde superior dorado y vectoriales modernos.
* **Enfoque Diferencial:** Énfasis en la sinergia entre **Ingeniería Minera + Inteligencia Artificial y Software a la Medida**.

### 3. `servicios.html` (Catálogo Técnico)
* **Acordeón Desplegable de 5 Pilares:**
  1. *Ingeniería y Planeamiento Minero:* PTO, diseño de labores subterráneas y a cielo abierto, topografía y cálculo de reservas.
  2. *Geología y Exploración:* Mapeo, perforaciones, muestreo y modelamiento geológico 3D.
  3. *Gestión Ambiental:* Trámites ANLA, CAR, Planes de Manejo Ambiental (PMA) y concesiones de aguas.
  4. *Seguridad y SST en Minería:* SG-SST, ventilación forzada, brigadas de rescate y normatividad MinTrabajo.
  5. *Tecnología, Software e IA Minera:* Algoritmos predictivos, digitalización de operaciones y automatización de reportes.
* **Call to Action (CTA):** Botón dorado *"Contactar a un Asesor"* y descarga directa de `Portafolio_Stratum_Group.pdf`.

### 4. `noticias.html` (Feed Público en Tiempo Real)
* Conexión directa a Cloud Firestore.
* Si no hay publicaciones, muestra un estado visual amigable (*Skeleton Loading*).
* Cuando hay noticias, renderiza tarjetas interactivas con etiqueta de categoría, fecha en español, título, resumen e hipervínculo a la noticia completa con protección `rel="noopener noreferrer"`.

### 5. `contacto.html` (Cotizaciones y Ubicación)
* **Panel de Información Directa:** Canales de WhatsApp (`wa.me`), teléfonos de atención y redes sociales.
* **Formulario Integrado:** Captura nombre, empresa, teléfono, correo, motivo y mensaje. Se procesa mediante **FormSubmit** hacia `stratumgroupsas@gmail.com`.
* **Google Maps Embed:** Mapa satelital centrado en Ubaté, Cundinamarca con carga diferida (`loading="lazy"`).

### 6. `admin_noticias.html` (Panel de Administración y Seguridad)
* **Pantalla de Autenticación:** Pestañas para iniciar sesión o registrar nuevo administrador con validación de clave maestra criptográfica.
* **Publicador de Noticias:** Carga instantánea de publicaciones con formulario validado.
* **Gestor de Contenidos:** Lista todas las noticias activas en la base de datos con botón para eliminarlas en tiempo real de Firestore.
* **Módulo de Seguridad:**
  * *Lista Blanca:* Agrega o remueve correos con permiso para registrarse.
  * *Clave Maestra:* Permite actualizar la clave secreta de registro, encriptándola en SHA-256 antes de guardarla en Firebase.
* **Protección SEO:** Meta tag `<meta name="robots" content="noindex, nofollow">` para impedir que el panel aparezca en Google.

---

## 4. Sistema de Diseño y CSS (`css/diseno6.css`)

El archivo CSS concentra el 100% de la presentación visual del sitio en más de 2.880 líneas estructuradas:

### Variables Globales de Marca
```css
:root {
  --brand-purple: #3B1E43;          /* Púrpura corporativo principal */
  --brand-purple-dark: #1E0F23;     /* Púrpura oscuro para contrastes y fondos */
  --accent-gold: #D4AF37;           /* Dorado corporativo */
  --brand-accent: #D4AF37;          /* Color de acento para botones y detalles */
  --text-white: #FFFFFF;
  --text-muted: #CCCCCC;
  --text-dark: #1F2937;
  --font-main: 'Montserrat', sans-serif;
}
```

### Grillas Responsivas Inteligentes (CSS Grid)
En lugar de cientos de reglas `media-query`, los elementos usan la técnica matemática de auto-ajuste:
```css
grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
```
Esto garantiza que en pantallas de 4K, laptops, tablets o celulares el contenido se adapte de forma nativa.

### Efectos y Micro-Animaciones
* **Glassmorphism:** `backdrop-filter: blur(10px);` en el header para desenfoque sobre el fondo al scrollear.
* **Elevación de Tarjetas:** `transform: translateY(-6px);` con sombras suaves de 40px al pasar el cursor.
* **Zoom Fotográfico:** `transform: scale(1.06);` con transición suave de `0.5s ease`.

---

## 5. Lógica JavaScript del Cliente (`js/app.js`)

1. **Header Scrolled (`requestAnimationFrame`):**
   Usa la API nativa de cuadros de animación del navegador para sincronizar el cambio de fondo del menú exactamente a 60 FPS, evitando caídas de rendimiento durante el desplazamiento.
2. **Contador Numérico Progresivo (`IntersectionObserver`):**
   Los números de experiencia y cumplimiento no arrancan hasta que el usuario hace scroll y la sección entra en el campo de visión. La animación incrementa el valor en 60 pasos durante 1.8 segundos y formatea las cifras con separadores colombianos (`toLocaleString('es-CO')`).
3. **Menú Hamburguesa Táctil:**
   Abre y cierra el menú lateral en dispositivos móviles y detecta clics en los enlaces para cerrarlo automáticamente al navegar.
4. **Acordeón Inteligente:**
   Controla la apertura y cierre de las secciones de servicios y sectores industriales.
5. **Menú Flotante de Accesibilidad:**
   Inyecta en el DOM los controles para:
   * Aumentar tamaño de fuente (`body.large-text`).
   * Reducir tamaño de fuente.
   * Activar alto contraste blanco/negro (`body.high-contrast`).
   * Activar filtro en escala de grises (`body.grayscale`).
   * Restablecer configuración estándar.

---

## 6. Backend Serverless y Base de Datos (`js/firebase_noticias.js`)

* **Proveedor:** Google Cloud / Firebase Web SDK v10.8.0 Modular.
* **Firebase Authentication:**
  * Administra sesiones de usuario mediante tokens JWT seguros en el navegador.
  * Funciones utilizadas: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `onAuthStateChanged`.
* **Cloud Firestore (Base de Datos NoSQL):**
  * **Colección `noticias`:**
    * `titulo`: Cadena de texto.
    * `categoria`: Categoría técnica (Ingeniería Minera, Geología, etc.).
    * `resumen`: Descripción técnica del artículo.
    * `imagen`: URL de la imagen en alta definición.
    * `enlace`: URL externa opcional hacia notas completas o reportes.
    * `fecha_creacion`: Marca de tiempo oficial del servidor (`serverTimestamp()`).
  * **Colección `configuracion`, Documento `seguridad`:**
    * `correos_autorizados`: Array de correos autorizados para registrarse.
    * `codigo_hash`: Hash SHA-256 de la clave maestra.

---

## 7. Seguridad Criptográfica y Control de Acceso

Para garantizar máxima seguridad sin exponer secretos en el código fuente:
1. **Web Crypto API Nativa:**
   ```javascript
   async function sha256(message) {
     const msgBuffer = new TextEncoder().encode(message);
     const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
     const hashArray = Array.from(new Uint8Array(hashBuffer));
     return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
   }
   ```
2. **Flujo de Registro en Dos Factores:**
   * **Factor 1 (Lista Blanca):** El correo del solicitante debe estar previamente aprobado dentro del array `correos_autorizados` en Firestore.
   * **Factor 2 (Clave Maestra Criptográfica):** La clave ingresada se transforma en un hash SHA-256 en la memoria del navegador y se compara contra el hash almacenado. **Ninguna clave viaja ni se guarda en texto plano.**

---

## 8. Servicios e Integraciones Externas

| Servicio / API | Proveedor | Finalidad |
| :--- | :--- | :--- |
| **FormSubmit** | formsubmit.co | Enruta los mensajes del formulario directo a `stratumgroupsas@gmail.com`. |
| **Cloud Firestore** | Google Cloud / Firebase | Base de datos NoSQL global en tiempo real. |
| **Firebase Auth** | Google Cloud / Firebase | Autenticación y gestión de sesiones con cifrado seguro. |
| **Google Maps Embed** | Google Inc. | Mapa interactivo de la oficina en Ubaté con carga optimizada. |
| **Google Fonts** | Google Inc. | Fuentes *Montserrat* y *Plus Jakarta Sans* vía CDN. |
| **WhatsApp Business API**| Meta Platforms | Enlace directo con formato internacional (`https://wa.me/57...`). |
| **Open Graph Protocol** | Estándar Web | Genera tarjetas de previsualización corporativa en WhatsApp y redes sociales. |

---

## 9. Guía de Despliegue y Mantenimiento

Al tratarse de una arquitectura **Jamstack Estática**, el proyecto puede alojarse sin costo alguno o con costo mínimo en:
* **GitHub Pages**
* **Vercel**
* **Netlify**
* **Firebase Hosting**
* **Cualquier servidor Apache / NGINX / cPanel tradicional**

### Procedimiento de Despliegue:
1. Subir la totalidad de los archivos respetando la estructura de carpetas (`css/`, `js/`, `img/`, `assets/`).
2. No se requiere Node.js ni bases de datos MySQL locales en el hosting, ya que la base de datos se ejecuta directamente en la nube de Google Firebase.
3. El sitio web funcionará de inmediato con soporte HTTPS y conexión a la base de datos en vivo.

---
*Documento preparado para el equipo técnico y directivo de Stratum Group S.A.S.*
