# Stratum Group S.A.S.

Portal corporativo estático con un panel de noticias. Las páginas públicas usan HTML, CSS y JavaScript; Firebase Hosting sirve el sitio, Firebase Authentication identifica a los editores y Cloud Firestore almacena las noticias.

- `css/main.css` y `js/app.js`: estilos, navegación y componentes del sitio público.
- `js/noticias-publicas.js`: lectura de las noticias activas mediante la API REST de Firestore. La copia local consulta el emulador.
- `js/firebase_noticias.js`: conexión del panel de administración con Firebase.
- `admin_noticias.html` y `js/admin.js`: publicación, edición, retiro y respaldos.
- `firestore.rules` y `firestore.indexes.json`: permisos y el índice de la consulta pública.
- `scripts/build-hosting.mjs`: lista de archivos que se pueden publicar. Agregar aquí los recursos públicos nuevos y ejecutar `npm run build`.

## Vista local

Con Node.js 22 o superior y Java 21:

```sh
npm ci
npm run dev
```

Abre `http://127.0.0.1:5500/`. La vista previa usa el proyecto ficticio `demo-stratum`, Authentication en el puerto 19099 y Firestore en el 18080. El formulario valida los campos localmente y la analítica se desactiva. Al cerrar los emuladores se descartan sus datos. Reinicia `npm run dev` para incorporar cambios en los archivos.

## Publicación en GitHub Pages

El flujo `.github/workflows/pages.yml` publica la compilación de `main`. GitHub Pages no envía las cabeceras de `firebase.json`, por eso:

- La compilación inserta la política de seguridad de contenido (CSP) como `<meta>` en cada página (`scripts/politica-csp.mjs`). Una `<meta>` no admite `frame-ancestors`, así que `js/anti-marco.js` oculta el panel si otra página lo carga en un marco.
- El panel no recibe `Cache-Control: no-store` ni `X-Robots-Tag`; conserva su `<meta name="robots" content="noindex, nofollow">`.
- En un sitio de proyecto (`usuario.github.io/proyecto-stratum`) los buscadores ignoran `robots.txt`, porque solo lo leen en la raíz del dominio. Las páginas privadas dependen de su `noindex`.

Firebase Hosting aplica todas las cabeceras y es la opción recomendada para el dominio oficial.

En Git Bash para Windows, una ruta como `SITE_BASE_PATH=/proyecto-stratum` se convierte en una ruta de Windows. Antepón `MSYS_NO_PATHCONV=1` o usa PowerShell para compilar con ese valor.

## Preparar el primer despliegue con estas reglas

Cuando se defina el dominio oficial, configura `SITE_ORIGIN` con su origen HTTPS en el entorno que ejecute la compilación. Este valor genera las direcciones canónicas y el mapa del sitio. Mientras esté vacío, la compilación usa referencias locales y pide a los buscadores que omitan el sitio.

Las reglas cierran el acceso por defecto. Completar este orden con una cuenta de operación autorizada:

1. Hacer un respaldo de Firestore y revisar las cuentas existentes de Authentication. Identificar los **UID** de los editores legítimos comprobando quién controla cada cuenta. No importar automáticamente la antigua lista de correos.
2. En Firestore, crear un documento en `administradores/<UID>` para cada editor. Basta un campo descriptivo como `rol: "editor"`; el permiso depende de la existencia del documento. Las altas y bajas se hacen desde la consola o con Admin SDK y acceso IAM. Para revocar a un editor, eliminar su documento; si la cuenta está comprometida, deshabilitarla también en Authentication.
3. Revisar las noticias antiguas. Para cada una, establecer `activo` como booleano según su estado real y `fecha_creacion` como Timestamp, conservando la fecha original. No marcar como activa una noticia retirada. Revisar también los campos y tipos permitidos en `firestore.rules`, porque se validarán al editar o retirar una noticia, y convertir a HTTPS los enlaces externos todavía válidos.
4. Crear el índice con `npx firebase deploy --only firestore:indexes --project <proyecto>` y esperar a que esté listo. Revisar cualquier propuesta de eliminar índices que ya existan en el proyecto.
5. Publicar Hosting y desplegar las reglas en la misma ventana de mantenimiento, en ese orden. Verificar con una sesión nueva que un editor conocido pueda acceder, que un usuario ordinario no pueda modificar noticias y que el público solo pueda consultar las activas.
6. Retirar los documentos obsoletos `configuracion/registro` y `configuracion/seguridad` tras verificar el despliegue. El código anterior podía aceptar cuentas sin permiso cuando faltaba la configuración: revisar usuarios y publicaciones si esas reglas llegaron a producción. Rotar la antigua clave maestra si se reutilizó en otro servicio.
7. Confirmar que FormSubmit esté activado para el correo oficial `stratumgroupsas@gmail.com` y hacer un envío autorizado de prueba. El proveedor procesa la información y realiza la verificación antispam. No se requiere introducir un CAPTCHA adicional en la página. El correo de activación de FormSubmit incluye un alias aleatorio: usarlo en `data-destino` de `contacto.html` (y en la prueba `tests/flujos-locales.test.mjs`) evita publicar la dirección en el HTML.

El panel tiene un menú lateral (Resumen, Noticias, Nueva noticia y Respaldos) con los colores y tipografías del sitio. Muestra cuántas noticias hay publicadas y en borrador, busca por texto, filtra por estado y categoría, cuenta los caracteres de cada campo y presenta una vista previa con la misma tarjeta de la página de Noticias. Avisa antes de descartar cambios sin guardar, y el botón «Ver en la web» abre `noticias.html#noticia-<id>`, que resalta esa noticia. La fecha del último respaldo se guarda solo en el navegador donde se descargó.

Los borradores se guardan con `activo: false` y `borrador: true`, así que el público no los ve. Al publicar un borrador, su fecha de publicación pasa a ser la de ese día. **Las reglas de Firestore deben estar desplegadas** (`npx firebase deploy --only firestore:rules --project <proyecto>`) antes de usar borradores con esta versión del panel; con las reglas anteriores, guardar un borrador da un error de permisos.

La página de administración es accesible por URL; su autorización se aplica en Firestore. Una cuenta de Authentication por sí sola no otorga acceso. La API key del SDK web identifica el proyecto y no concede permisos de administrador.

La restauración del panel acepta hasta 400 noticias y un archivo de hasta 5 MB. Primero valida el archivo y después guarda sus registros en un único lote; modifica las noticias con el mismo identificador y conserva el estado y la fecha de creación del respaldo. Si un registro no trae fecha de creación, la noticia existente mantiene la suya. Las noticias retiradas aparecen en la pestaña «Retiradas» del panel, desde donde se pueden volver a publicar. Para respaldos grandes, usar la herramienta de exportación/importación de Firestore.

## Pruebas de reglas

Con Java 21 disponible y las dependencias de desarrollo instaladas:

```sh
npm run test:rules
```

Las pruebas comprueban el control por UID, la lectura pública, la validación de publicaciones y la restauración atómica. Ejecuta la suite con la vista previa cerrada para liberar el puerto de Firestore.

Para probar los recorridos completos en Chromium, ejecuta `npx playwright-core install chromium` y `npm run test:ui`. También puedes definir `CHROME_PATH` con la ruta a un Chrome instalado. La prueba crea una cuenta ficticia y noticias de ejemplo en emuladores temporales.
