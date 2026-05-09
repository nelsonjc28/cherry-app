import api from '../config/axios';

const MAX_IDS = 800;

/**
 * Consulta Laravel por fecha_agotado almacenada en BD (sync externo).
 * @param {string[]} productIds
 * @returns {Promise<Record<string, string|null>>}
 */
export async function fetchFechaAgotadoMetaMap(productIds) {
  const unique = [...new Set(productIds.map(String).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }

  const out = {};
  for (let i = 0; i < unique.length; i += MAX_IDS) {
    const chunk = unique.slice(i, i + MAX_IDS);
    const { data } = await api.post(
      '/products/fecha-agotado-meta',
      { ids: chunk },
      { timeout: 120000 }
    );
    if (data?.success && data?.data && typeof data.data === 'object') {
      Object.assign(out, data.data);
    }
  }
  return out;
}
