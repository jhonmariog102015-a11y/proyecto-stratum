import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = "http://127.0.0.1:5500";
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:19099");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:18080");
const email = "editor@example.test";
const password = "Clave-local-de-prueba";
let browser;
let context;
let page;
const errors = [];
const unintended = [];

before(async () => {
  const auth = "http://" + process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const db = "http://" + process.env.FIRESTORE_EMULATOR_HOST + "/v1/projects/demo-stratum/databases/(default)/documents";
  const signup = await fetch(auth + "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-stratum", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  assert.equal(signup.status, 200);
  const { localId } = await signup.json();
  const grant = await fetch(db + "/administradores/" + localId, {
    method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { rol: { stringValue: "editor" } } })
  });
  assert.equal(grant.status, 200);
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if ([base, auth, "http://" + process.env.FIRESTORE_EMULATOR_HOST].includes(url.origin)) return route.continue();
    if (!["fonts.googleapis.com", "fonts.gstatic.com", "www.google.com"].includes(url.hostname)) {
      unintended.push(url.origin);
    }
    return route.abort();
  });
  context.on("page", tab => tab.on("pageerror", error => errors.push(error.message)));
  page = await context.newPage();
  page.setDefaultTimeout(12000);
});

after(async () => {
  await browser?.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(unintended, []);
});

test("rutas públicas, vista móvil y escritorio, contacto local y teclado", async () => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/servicios", "/nosotros", "/noticias", "/contacto", "/politica-privacidad", "/aviso-legal", "/gracias", "/admin_noticias", "/ruta-inexistente"]) {
      const response = await page.goto(base + path);
      assert.equal(response.status(), path === "/ruta-inexistente" ? 404 : 200, path);
      assert.equal(await page.locator("h1:visible").count(), 1, path);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path + " " + width);
      if (path === "/admin_noticias") assert.match(response.headers()["cache-control"], /no-store/);
    }
  }
  await page.goto(base + "/contacto");
  await page.evaluate(() => localStorage.setItem("stratum_access_prefs", "null"));
  await page.reload();
  await page.locator(".btn-accessibility").click();
  const focused = () => page.evaluate(() => document.activeElement.id);
  assert.equal(await focused(), "accessCloseBtn");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await focused(), "btnAccessReset");
  await page.keyboard.press("Tab");
  assert.equal(await focused(), "accessCloseBtn");
  await page.keyboard.press("Escape");
  assert.ok(await page.locator(".btn-accessibility").evaluate(el => document.activeElement === el));
  await page.locator("#btnSubmitContact").click();
  assert.equal(await page.locator("#contactForm").evaluate(form => form.checkValidity()), false);
  for (const [id, value] of Object.entries({ formNombre: "Demo", formTelefono: "1234567890",
    formEmail: "demo@example.test", formMotivo: "Prueba", formMensaje: "Mensaje de prueba" })) {
    await page.locator("#" + id).fill(value);
  }
  await page.locator("#formConsent").check();
  await page.locator("#btnSubmitContact").click();
  await page.getByText(/Prueba completada/).waitFor();
});

test("el editor publica, edita, retira, exporta y restaura con los permisos reales del emulador", async () => {
  await page.goto(base + "/admin_noticias");
  await page.locator("#loginEmail").fill(email);
  await page.locator("#loginPassword").fill(password);
  await page.locator("#btnLogin").click();
  const list = page.locator("#adminNewsList");
  await list.getByText(/No hay noticias/).waitFor();
  await page.locator("#newsTitle").fill("Noticia de prueba");
  await page.locator("#newsSummary").fill("Resumen para la vista local.");
  await page.locator("#btnPublish").click();
  await list.getByText("Noticia de prueba").waitFor();
  await list.locator(".btn-edit").click();
  await page.locator("#newsTitle").fill("Noticia editada");
  await page.locator("#btnPublish").click();
  await list.getByText("Noticia editada").waitFor();

  // Resumen, contadores, vista previa y búsqueda.
  await page.locator("#statPublicadas").getByText("1", { exact: true }).waitFor();
  assert.equal(await page.locator("#statRetiradas").textContent(), "0");
  await page.locator("#newsTitle").fill("Borrador sin guardar");
  assert.equal(await page.locator("#newsTitleCount").textContent(), "20/300");
  await page.locator("#newsPreview").getByText("Borrador sin guardar").waitFor();
  // Con cambios sin guardar, editar otra noticia pide confirmación y se puede cancelar.
  let dialogs = 0;
  page.once("dialog", dialog => { dialogs++; dialog.dismiss(); });
  await list.locator(".btn-edit").click();
  assert.equal(dialogs, 1);
  assert.equal(await page.locator("#newsTitle").inputValue(), "Borrador sin guardar");
  await page.locator("#newsTitle").fill("");
  await page.locator("#newsSearch").fill("inexistente");
  await list.getByText(/Ninguna noticia coincide/).waitFor();
  await page.locator("#newsSearch").fill("EDITADA");
  await list.getByText("Noticia editada").waitFor();
  await page.locator("#newsSearch").fill("");
  await page.locator("#newsCategoryFilter").selectOption("Corporativo");
  await list.getByText("Noticia editada").waitFor();
  await page.locator("#newsCategoryFilter").selectOption("");
  const verEnLaWeb = await list.getByRole("link", { name: "Ver en la web" }).getAttribute("href");

  // Una pestaña independiente empieza sin la sesión del editor.
  const visitor = await context.newPage();
  await visitor.goto(base + "/" + verEnLaWeb);
  await visitor.locator("#firebase-news-container").getByText("Noticia editada").waitFor();
  await visitor.locator(".featured.is-target").waitFor();
  await visitor.goto(base);
  await visitor.locator("#home-news-container").getByText("Noticia editada").waitFor();
  await page.bringToFront();
  await list.locator(".btn-delete").click();
  await list.getByRole("button", { name: "Cancelar" }).click();
  await list.getByRole("button", { name: "Retirar noticia" }).click();
  await list.getByRole("button", { name: "Confirmar retiro" }).click();
  try {
    await list.getByText(/No hay noticias/).waitFor();
  } catch (error) {
    const state = await page.locator("#adminNewsList, #publishAlert, #loginAlert").allTextContents();
    throw new Error("Estado del panel tras el retiro: " + state.join(" | "), { cause: error });
  }
  await visitor.reload();
  await visitor.getByText(/No hay publicaciones recientes/).waitFor();
  await visitor.close();

  const downloading = page.waitForEvent("download");
  await page.locator("#btnExportBackup").click();
  const backup = JSON.parse(await readFile(await (await downloading).path(), "utf8"));
  assert.equal(backup.datos.length, 1);
  const record = backup.datos[0];
  assert.equal(record.titulo, "Noticia editada");
  assert.equal(record.activo, false);
  assert.ok(Number.isFinite(Date.parse(record.fecha_eliminacion)));
  assert.ok(Number.isFinite(Date.parse(record.fecha_actualizacion)));
  assert.ok(Number.isFinite(Date.parse(record.fecha_creacion)));
  const creada = record.fecha_creacion;
  record.activo = true;
  record.titulo = "Noticia restaurada";
  record.categoria = "Categoría anterior";
  // Sin fecha en el respaldo, la noticia conserva su fecha de creación.
  delete record.fecha_creacion;
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#backupFileInput").setInputFiles({
    name: "respaldo.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup))
  });
  await list.getByText("Noticia restaurada").waitFor();
  const reexporting = page.waitForEvent("download");
  await page.locator("#btnExportBackup").click();
  const again = JSON.parse(await readFile(await (await reexporting).path(), "utf8"));
  assert.equal(again.datos[0].fecha_creacion, creada);

  // Una categoría que no está en la lista se conserva al editar.
  await list.locator(".btn-edit").click();
  assert.equal(await page.locator("#newsCategory").inputValue(), "Categoría anterior");
  await page.locator("#btnPublish").click();
  await page.locator("#publishAlert").getByText(/actualizada/).waitFor();
  assert.equal(await page.locator("#newsCategory").inputValue(), "Corporativo");
  await list.getByText("Categoría anterior").waitFor();

  // Una noticia retirada se puede volver a publicar desde la pestaña Retiradas.
  await list.getByRole("button", { name: "Retirar noticia" }).click();
  await list.getByRole("button", { name: "Confirmar retiro" }).click();
  await list.getByText(/No hay noticias publicadas/).waitFor();
  await page.getByRole("button", { name: "Retiradas" }).click();
  await list.getByRole("button", { name: "Reactivar" }).click();
  await list.getByText(/No hay noticias retiradas/).waitFor();
  await page.getByRole("button", { name: "Publicadas" }).click();
  await list.getByText("Noticia restaurada").waitFor();
  await page.locator("#btnLogout").click();
  await page.locator("#loginEmail").waitFor();
  assert.equal(await list.locator(".news-item-card").count(), 0);
});

test("las páginas declaran su CSP y el panel no se muestra dentro de un marco", async () => {
  for (const path of ["/", "/noticias", "/admin_noticias"]) {
    await page.goto(base + path);
    assert.match(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content"),
      /object-src 'none'/, path);
  }
  // Como en GitHub Pages, sin X-Frame-Options ni frame-ancestors, una página ajena intenta
  // mostrar el panel en un marco aislado.
  const ajena = await context.newPage();
  try {
    await ajena.route(base + "/admin_noticias", async route => {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers["x-frame-options"];
      delete headers["content-security-policy"];
      return route.fulfill({ response, headers });
    });
    await ajena.setContent(`<iframe sandbox="allow-scripts allow-same-origin" src="${base}/admin_noticias"></iframe>`);
    await ajena.frameLocator("iframe").locator("#loginForm").waitFor({ state: "attached" });
    const marco = ajena.frames().find(frame => frame.url().startsWith(base));
    await marco.waitForFunction(() => document.readyState === "complete");
    assert.equal(await marco.evaluate(() => document.documentElement.hidden), true);
    assert.equal(await marco.locator("#btnLogin").isDisabled(), true);
    assert.equal(ajena.url(), "about:blank");
  } finally {
    await ajena.close();
  }
});

test("las noticias y el panel explican los fallos de conexión", async () => {
  await page.route("**/documents:runQuery", route => route.abort());
  await page.route("**/js/firebase_noticias.js*", route => route.abort());
  try {
    for (const path of ["/", "/noticias", "/admin_noticias"]) {
      await page.goto(base + path);
      await page.getByText(/recarga (la|esta) página/i).waitFor();
    }
    assert.ok(await page.locator("#btnLogin").isDisabled());
  } finally {
    await page.unroute("**/documents:runQuery");
    await page.unroute("**/js/firebase_noticias.js*");
  }
});

test("el formulario HTTPS envía los campos y vuelve a Gracias en su propio dominio", async () => {
  const origin = "https://stratum.example.test";
  const isolated = await browser.newContext();
  try {
    const config = JSON.parse(await readFile(new URL("../firebase.json", import.meta.url), "utf8"));
    const csp = config.hosting.headers[0].headers.find(header => header.key === "Content-Security-Policy").value;
    let submitted;
    await isolated.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) {
        const response = await route.fetch({ url: base + url.pathname + url.search });
        return route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": csp } });
      }
      if (url.origin === "https://formsubmit.co") {
        assert.equal(route.request().method(), "POST");
        assert.equal(url.pathname, "/stratumgroupsas@gmail.com");
        submitted = new URLSearchParams(route.request().postData());
        return route.fulfill({ status: 303, headers: { location: origin + "/gracias" } });
      }
      return route.abort();
    });
    const tab = await isolated.newPage();
    await tab.goto(origin + "/contacto");
    const fields = { formNombre: "Demo", formTelefono: "1234567890", formEmail: "demo@example.test",
      formMotivo: "Recorrido HTTPS", formMensaje: "Prueba sin entrega externa" };
    for (const [id, value] of Object.entries(fields)) await tab.locator("#" + id).fill(value);
    await tab.locator("#formConsent").check();
    await tab.locator("#btnSubmitContact").click();
    await tab.waitForURL(origin + "/gracias");
    assert.equal(submitted.get("_next"), origin + "/gracias");
    assert.equal(submitted.get("email"), fields.formEmail);
    assert.equal(submitted.get("mensaje"), fields.formMensaje);
    assert.equal(submitted.get("consentimiento_datos"), "autorizado");
    assert.equal(await tab.evaluate(() => window.dataLayer.filter(args => args[1] === "generate_lead").length), 1);
    await tab.reload();
    assert.equal(await tab.evaluate(() => window.dataLayer.filter(args => args[1] === "generate_lead").length), 0);
  } finally {
    await isolated.close();
  }
});
