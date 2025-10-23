/**
 * Utilidad para normalización de búsqueda en español
 * Maneja plurales, singulares, acentos y variaciones comunes
 */

/**
 * Normaliza un texto para búsqueda:
 * - Convierte a minúsculas
 * - Elimina acentos
 * - Elimina caracteres especiales
 */
export const normalizeText = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, '') // Eliminar caracteres especiales
    .trim();
};

/**
 * Convierte una palabra al singular (español)
 * Reglas básicas:
 * - blusas -> blusa
 * - pantalones -> pantalon
 * - zapatos -> zapato
 * - vestidos -> vestido
 */
export const toSingular = (word) => {
  if (!word || word.length < 3) return word;
  
  const normalized = normalizeText(word);
  
  // Reglas de plural a singular en español
  const rules = [
    // Terminaciones comunes
    { regex: /ces$/, replacement: 'z' },     // felices -> feliz
    { regex: /ses$/, replacement: 's' },     // meses -> mes
    { regex: /es$/, replacement: '' },       // pantalones -> pantalon
    { regex: /as$/, replacement: 'a' },      // blusas -> blusa
    { regex: /os$/, replacement: 'o' },      // zapatos -> zapato
    { regex: /is$/, replacement: 'i' },      // bis -> bi (raro pero posible)
    { regex: /s$/, replacement: '' },        // general: cualquier cosa que termine en s
  ];
  
  for (const rule of rules) {
    if (rule.regex.test(normalized)) {
      return normalized.replace(rule.regex, rule.replacement);
    }
  }
  
  return normalized;
};

/**
 * Convierte una palabra al plural (español)
 * Reglas básicas:
 * - blusa -> blusas
 * - pantalon -> pantalones
 * - zapato -> zapatos
 */
export const toPlural = (word) => {
  if (!word || word.length < 2) return word;
  
  const normalized = normalizeText(word);
  const lastChar = normalized.slice(-1);
  const lastTwoChars = normalized.slice(-2);
  
  // Reglas de singular a plural en español
  if (lastChar === 'z') {
    return normalized.slice(0, -1) + 'ces'; // feliz -> felices
  } else if (lastChar === 's' && lastTwoChars !== 'es') {
    return normalized + 'es'; // mes -> meses
  } else if ('aeiou'.includes(lastChar)) {
    return normalized + 's'; // blusa -> blusas, zapato -> zapatos
  } else if ('íóáéú'.includes(lastChar)) {
    return normalized + 's';
  } else {
    return normalized + 'es'; // pantalon -> pantalones
  }
};

/**
 * Genera todas las variaciones de una palabra para búsqueda
 * @param {string} word - Palabra a variar
 * @returns {Array<string>} - Array de variaciones
 */
export const getWordVariations = (word) => {
  if (!word) return [];
  
  const variations = new Set();
  const normalized = normalizeText(word);
  
  // Agregar la palabra normalizada
  variations.add(normalized);
  
  // Agregar versión original normalizada
  variations.add(word.toLowerCase());
  
  // Agregar singular
  const singular = toSingular(normalized);
  variations.add(singular);
  
  // Agregar plural
  const plural = toPlural(singular);
  variations.add(plural);
  
  // También probar plural de la palabra normalizada directamente
  variations.add(toPlural(normalized));
  
  return Array.from(variations).filter(v => v && v.length > 0);
};

/**
 * Busca un término en un texto considerando variaciones de plural/singular
 * @param {string} searchTerm - Término a buscar
 * @param {string} text - Texto donde buscar
 * @returns {boolean} - true si encuentra coincidencia
 */
export const flexibleMatch = (searchTerm, text) => {
  if (!searchTerm || !text) return false;
  
  const normalizedText = normalizeText(text);
  const variations = getWordVariations(searchTerm);
  
  // Buscar si alguna variación está en el texto
  return variations.some(variation => 
    normalizedText.includes(variation)
  );
};

/**
 * Busca múltiples términos en un texto con búsqueda flexible
 * @param {string} searchQuery - Query de búsqueda (puede tener múltiples palabras)
 * @param {string} text - Texto donde buscar
 * @param {boolean} requireAll - Si es true, todos los términos deben coincidir (AND), si es false solo uno (OR)
 * @returns {boolean} - true si encuentra coincidencia
 */
export const flexibleSearch = (searchQuery, text, requireAll = false) => {
  if (!searchQuery || !text) return false;
  
  const terms = searchQuery.split(' ').filter(t => t.length > 0);
  
  if (requireAll) {
    // Todos los términos deben coincidir (AND)
    return terms.every(term => flexibleMatch(term, text));
  } else {
    // Al menos un término debe coincidir (OR)
    return terms.some(term => flexibleMatch(term, text));
  }
};

/**
 * Busca en múltiples campos de un objeto con búsqueda flexible
 * @param {string} searchQuery - Query de búsqueda
 * @param {object} item - Objeto con campos para buscar
 * @param {Array<string>} fields - Campos donde buscar
 * @returns {boolean} - true si encuentra coincidencia en algún campo
 */
export const flexibleSearchInFields = (searchQuery, item, fields = ['descripcion', 'title', 'codigo']) => {
  if (!searchQuery || !item) return false;
  
  return fields.some(field => {
    const value = item[field];
    if (!value) return false;
    
    const textValue = typeof value === 'string' ? value : String(value);
    return flexibleSearch(searchQuery, textValue, false);
  });
};

export default {
  normalizeText,
  toSingular,
  toPlural,
  getWordVariations,
  flexibleMatch,
  flexibleSearch,
  flexibleSearchInFields
};

