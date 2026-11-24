import { copyFile, cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = createRequire(import.meta.url).resolve("firebase-tools/lib/bin/firebase.js");
const rulesTest = process.argv[2] === "--test-rules";
const tmp = await realpath(tmpdir());
const dir = await mkdtemp(join(tmp, "stratum-emuladores-"));
try {
  const config = JSON.parse(await readFile(join(root, "firebase.json"), "utf8"));
  for (const file of [config.firestore.rules, config.firestore.indexes]) {
    await copyFile(join(root, file), join(dir, file));
  }
  let args;
  if (rulesTest) {
    // El emulador de Java en Windows puede perder acentos en las rutas.
    await copyFile(join(root, "tests/firestore-rules.test.mjs"), join(dir, "rules.test.mjs"));
    args = ["emulators:exec", "--only", "firestore", "node --test rules.test.mjs"];
  } else {
    await cp(join(root, config.hosting.public), join(dir, config.hosting.public), { recursive: true });
    const policy = config.hosting.headers.flatMap(group => group.headers)
      .find(header => header.key === "Content-Security-Policy");
    const { auth, firestore } = config.emulators;
    policy.value = policy.value
      .replace(/connect-src [^;]+/, `connect-src 'self' http://${auth.host}:${auth.port} http://${firestore.host}:${firestore.port}`)
      .replace(/form-action [^;]+/, "form-action 'none'");
    if (process.argv[2] === "--test-ui") {
      const suite = new URL("../tests/flujos-locales.test.mjs", import.meta.url);
      await writeFile(join(dir, "ui.test.mjs"), "import " + JSON.stringify(suite.href) + ";");
      args = ["emulators:exec", "--only", "hosting,auth,firestore", "node --test ui.test.mjs"];
    } else {
      for (const file of ["iniciar-vista.mjs", "noticias-de-muestra.json"]) {
        await copyFile(join(root, "scripts", file), join(dir, file));
      }
      args = ["emulators:exec", "--only", "hosting,auth,firestore", "node iniciar-vista.mjs --servir"];
    }
  }
  await writeFile(join(dir, "firebase.json"), JSON.stringify(config));
  const child = spawn(process.execPath, [cli, ...args, "--project", "demo-stratum"], { cwd: dir, stdio: "inherit" });
  // El CLI recibe Ctrl+C en la misma consola y cierra sus emuladores.
  const waitForChild = () => {};
  process.on("SIGINT", waitForChild);
  try {
    process.exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", code => resolve(code ?? 1));
    });
  } finally {
    process.off("SIGINT", waitForChild);
  }
} finally {
  const absolute = await realpath(dir);
  if (dirname(absolute) === tmp && basename(absolute).startsWith("stratum-emuladores-")) {
    await rm(absolute, { recursive: true, force: true });
  }
}
