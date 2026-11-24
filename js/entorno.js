// El proyecto de prueba se usa también al abrir una copia por HTTP o desde disco.
export const esVistaLocal = location.protocol !== "https:" ||
  ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) ||
  location.hostname.endsWith(".localhost");
