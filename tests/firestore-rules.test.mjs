import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(emulator || "", /^127\.0\.0\.1:\d+$/, "Usa un emulador local (npm run test:rules).");
const project = "demo-stratum";
const database = "projects/" + project + "/databases/(default)";
const api = "http://" + emulator + "/v1/" + database + "/documents";
const cleanup = "http://" + emulator + "/emulator/v1/" + database + "/documents";
const news = {
  titulo: { stringValue: "Una noticia" }, resumen: { stringValue: "Cuerpo de prueba" },
  categoria: { stringValue: "Corporativo" }, activo: { booleanValue: true },
  fecha_creacion: { timestampValue: "2026-01-01T00:00:00Z" }
};

function token(uid) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  // Tokens de prueba sin firma, admitidos exclusivamente por el emulador.
  return encode({ alg: "none", typ: "JWT" }) + "." + encode({
    iss: "https://securetoken.google.com/" + project, aud: project,
    iat: now, exp: now + 3600, auth_time: now, sub: uid, user_id: uid,
    email: "admin@example.test", email_verified: true,
    firebase: { sign_in_provider: "password", identities: {} }
  }) + ".";
}

const admin = token("editor-aprobado");
const stranger = token("cuenta-ajena");

async function request(path, { method, body, auth, status = 200 } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = "Bearer " + auth;
  const response = await fetch(api + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json();
  assert.equal(response.status, status, method + " " + path + " " + JSON.stringify(data));
  return data;
}

function write(path, fields, auth, status) {
  return request("/" + path, { method: "PATCH", body: { fields }, auth, status });
}

function read(path, auth, status) {
  return request("/" + path, { method: "GET", auth, status });
}

async function reset() {
  const response = await fetch(cleanup, { method: "DELETE" });
  assert.equal(response.ok, true, await response.text());
}

before(async () => {
  await reset();
  await write("administradores/editor-aprobado", { rol: { stringValue: "editor" } }, "owner");
  await write("configuracion/registro", { codigo_hash: { stringValue: "hash ficticio" } }, "owner");
  await write("noticias/activa", news, "owner");
  await write("noticias/retirada", { ...news, activo: { booleanValue: false } }, "owner");
});

after(reset);

test("un correo coincidente no habilita a un UID ajeno ni permite inicializar permisos", async () => {
  for (const auth of [undefined, stranger]) {
    await write("administradores/cuenta-ajena", {}, auth, 403);
    await write("configuracion/seguridad", {}, auth, 403);
    await write("noticias/ajena", news, auth, 403);
    await read("configuracion/registro", auth, 403);
  }
});

test("el público solo puede leer noticias activas y con un límite en la consulta", async () => {
  const published = {
    fieldFilter: { field: { fieldPath: "activo" }, op: "EQUAL", value: { booleanValue: true } }
  };
  const list = (constraints, status) => request(":runQuery", {
    method: "POST", body: { structuredQuery: { from: [{ collectionId: "noticias" }], ...constraints } }, status
  });
  const result = await list({ where: published, limit: 20,
    orderBy: [{ field: { fieldPath: "fecha_creacion" }, direction: "DESCENDING" }] });
  assert.deepEqual(result.map(item => item.document?.name.split("/").at(-1)), ["activa"]);
  await read("noticias/activa");
  await read("noticias/retirada", undefined, 403);
  await list({ limit: 20 }, 403);
  await list({ where: published }, 403);
  await list({ where: published, limit: 21 }, 403);
});

test("un UID autorizado puede publicar y retirar pero no delegar permisos", async () => {
  await read("administradores/editor-aprobado", admin);
  await read("administradores/cuenta-ajena", admin, 403);
  await read("administradores", admin, 403);
  await read("noticias/retirada", admin);
  await write("administradores/cuenta-ajena", {}, admin, 403);
  await request("/administradores/editor-aprobado", { method: "DELETE", auth: admin, status: 403 });

  const path = "noticias/creada-por-admin";
  await write(path, news, admin);
  await write(path, { ...news, activo: { stringValue: "sí" } }, admin, 403);
  await write(path, { ...news, fecha_creacion: { stringValue: "fecha inválida" } }, admin, 403);
  await write(path, { ...news, categoria: { stringValue: "" } }, admin, 403);
  await write(path, { ...news, createdAt: { mapValue: { fields: {} } } }, admin, 403);
  await write(path, { ...news, createdAt: { timestampValue: "2025-01-01T00:00:00Z" },
    updatedAt: { stringValue: "2025-01-02T00:00:00Z" } }, admin);
  await write(path, news, admin);
  await write(path, { ...news, activo: { booleanValue: false } }, admin);
  await read(path, undefined, 403);
  await request("/" + path, { method: "DELETE", auth: admin, status: 403 });
});

test("un respaldo inválido no deja una restauración parcial", async () => {
  const valid = "noticias/respaldo-valido";
  const update = (path, fields) => ({ update: { name: database + "/documents/" + path, fields } });
  await request(":commit", {
    method: "POST", auth: admin, status: 403,
    body: { writes: [update(valid, news), update("noticias/respaldo-invalido", { ...news, activo: { stringValue: "error" } })] }
  });
  await read(valid, admin, 404);
});
