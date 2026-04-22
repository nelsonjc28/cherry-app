/**
 * Consulta Código Postal en SEPOMEX (mismo endpoint que perfil y checkout).
 * @param {string} postalCode 5 dígitos
 * @returns {Promise<{
 *   ok: boolean,
 *   settlements: string[],
 *   state: string,
 *   municipality: string,
 *   firstSettlement: string
 * }>}
 */
export async function fetchSepomexPostalCode(postalCode) {
  const code = String(postalCode || '').replace(/\D/g, '').slice(0, 5);
  if (code.length !== 5) {
    return {
      ok: false,
      settlements: [],
      state: '',
      municipality: '',
      firstSettlement: '',
    };
  }

  const response = await fetch(`https://sepomex.789.com.mx/${code}`);
  const data = await response.json();

  if (data && data.asentamientos && data.asentamientos.length > 0) {
    return {
      ok: true,
      settlements: data.asentamientos,
      state: (data.estados && data.estados[0]) || '',
      municipality: (data.municipios && data.municipios[0]) || '',
      firstSettlement: data.asentamientos[0] || '',
    };
  }

  return {
    ok: false,
    settlements: [],
    state: '',
    municipality: '',
    firstSettlement: '',
  };
}
