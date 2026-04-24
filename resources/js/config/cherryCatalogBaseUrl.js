// Debe coincidir con el proxy en routes/web.php y, aguas arriba, con el sync (789/articulos). La raíz /cherryApi/ remota responde 404.
const DEFAULT_CATALOG_PATH = '/cherry-api/789/articulos';

/**
 * Base URL pública del catálogo, vista desde el navegador (mismo origen → evita CORS).
 * VITE_CHERRY_CATALOG_BASE_URL: opcional, ej. /otro-prefijo/789/articulos
 */
export function getCherryCatalogBaseUrl() {
  const v = import.meta.env.VITE_CHERRY_CATALOG_BASE_URL;
  if (typeof v === 'string' && v.trim() !== '') {
    return v.trim();
  }
  return DEFAULT_CATALOG_PATH;
}

/**
 * La API devuelve { code, data: Product[] } en /789/articulos; el front antiguo esperaba un array suelto.
 */
export function unwrapCatalogProductList(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object' && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}
