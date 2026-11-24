// La política de firebase.json también se inserta como <meta> para los servidores que no envían
// cabeceras propias, como GitHub Pages. Una <meta> no admite frame-ancestors; el panel usa
// js/anti-marco.js para no mostrarse dentro de un marco.
export function politicaMeta(cabecera) {
  return cabecera.split(";").map(directiva => directiva.trim())
    .filter(directiva => directiva && !/^(frame-ancestors|report-uri|report-to|sandbox)\b/.test(directiva))
    .join("; ") + ";";
}

export function insertarPoliticaMeta(html, cabecera) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${politicaMeta(cabecera)}">`;
  const conMeta = html.replace(/(<meta charset="UTF-8"\s*\/?>)/i, `$1\n  ${meta}`);
  if (conMeta === html) throw new Error("Falta <meta charset=\"UTF-8\"> para insertar la política.");
  return conMeta;
}

export function reemplazarPoliticaMeta(html, cabecera) {
  return html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/,
    `<meta http-equiv="Content-Security-Policy" content="${politicaMeta(cabecera)}">`);
}
