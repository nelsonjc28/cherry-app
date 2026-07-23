/**
 * CACHÉ EN MEMORIA PARA PRODUCTOS
 * 
 * Problema: La API externa devuelve miles de productos, descargar todo en cada página es lento
 * Solución: Cargar UNA VEZ y mantener en memoria durante la sesión
 * 
 * Características:
 * - Singleton: Solo una instancia en toda la app
 * - Carga diferida: Solo carga cuando se necesita
 * - TTL (Time To Live): Refresca automáticamente después de X minutos
 * - Thread-safe: Evita múltiples cargas simultáneas
 */

import axios from 'axios';
import { getCherryCatalogBaseUrl, unwrapCatalogProductList } from '../config/cherryCatalogBaseUrl';
import { fetchFechaAgotadoMetaMap } from '../api/fechaAgotadoMeta';
import { filterProductsByFechaAgotadoMeta } from './productUtils';
import {
  evaluateProductStatus,
  filterProducts,
  matchesFilter,
  FILTER,
  isNewArrival,
} from './productStatusEvaluator';

const CHERRY_API_URL = getCherryCatalogBaseUrl();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

class ProductCacheManager {
  constructor() {
    this.products = null;          // Array de productos crudos
    this.lastFetch = null;         // Timestamp de última carga
    this.isLoading = false;        // Flag para evitar cargas duplicadas
    this.loadPromise = null;       // Promise compartida para cargas simultáneas
  }

  /**
   * Verifica si el caché está vigente
   */
  isCacheValid() {
    if (!this.products || !this.lastFetch) {
      return false;
    }

    const now = Date.now();
    const elapsed = now - this.lastFetch;
    return elapsed < CACHE_TTL_MS;
  }

  /**
   * Obtiene todos los productos (con caché automático)
   */
  async getAllProducts() {
    // Si el caché es válido, retornar inmediatamente
    if (this.isCacheValid()) {

      return this.products;
    }

    // Si ya hay una carga en progreso, esperar a que termine
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Iniciar nueva carga
    this.isLoading = true;
    this.loadPromise = this._fetchFromAPI();

    try {
      const products = await this.loadPromise;
      return products;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Carga productos desde la API externa (uso interno)
   */
  async _fetchFromAPI() {
    const startTime = Date.now();

    try {
      const response = await axios.get(CHERRY_API_URL, {
        timeout: 30000 // 30 segundos timeout
      });

      let products = unwrapCatalogProductList(response.data);
      if (products.length === 0) {
        return [];
      }

      try {
        const ids = products.map((p) => p.id_articulo ?? p.id).filter(Boolean);
        const meta = await fetchFechaAgotadoMetaMap(ids);
        products = filterProductsByFechaAgotadoMeta(products, meta);
      } catch (e) {
        console.warn('[productCacheInMemory] fecha_agotado meta omitido', e);
      }

      // Guardar en caché
      this.products = products;
      this.lastFetch = Date.now();

      const duration = Date.now() - startTime;

      return products;
    } catch (error) {

      // Si hay caché antiguo, usarlo como fallback
      if (this.products) {
        return this.products;
      }

      return [];
    }
  }

  /**
   * Filtra productos por catálogo
   */
  filterByCatalog(products, catalogCode) {
    if (!catalogCode) return products;
    return products.filter(p => p.catalogoId == catalogCode);
  }

  /**
   * Filtra productos por categoría (línea)
   * @param {Array} products - Array de productos
   * @param {string} categoryCode - Código de la categoría (corresponde a linea.id_linea)
   */
  filterByCategory(products, categoryCode) {
    if (!categoryCode) return products;
    // Normalizar id_linea y categoryCode a números para comparación (ignorar ceros a la izquierda)
    const normalizedCategoryCode = parseInt(String(categoryCode), 10);
    return products.filter(p => {
      const productLineaId = p.linea?.id_linea;
      const normalizedProductLineaId = productLineaId ? parseInt(String(productLineaId), 10) : null;
      return normalizedProductLineaId !== null && normalizedCategoryCode === normalizedProductLineaId;
    });
  }

  /**
   * Filtra solo productos con promoción
   */
  filterOnlyPromos(products) {
    return products.filter(p =>
      p.opc_promo === 'S' || (p.desc_promo && p.desc_promo > 0)
    );
  }

  /**
   * Filtra solo productos nuevos (filtro principal unificado).
   */
  filterOnlyNew(products) {
    return products.filter((p) => evaluateProductStatus(p).is_new === true);
  }

  /**
   * Filtra solo productos "Próximamente" (filtro principal unificado).
   */
  filterOnlyComingSoon(products) {
    return products.filter((p) => evaluateProductStatus(p).is_coming_soon === true);
  }

  /**
   * Filtra solo productos en rebaja (en oferta desc_promo).
   */
  filterOnlyOnSale(products) {
    return products.filter((p) => evaluateProductStatus(p).is_on_sale === true);
  }

  /**
   * Filtra solo productos agotados.
   */
  filterOnlyOutOfStock(products) {
    return products.filter((p) => evaluateProductStatus(p).is_out_of_stock === true);
  }

  /**
   * Pasa el filtro solicitado por nombre o por FILTER.*
   */
  filterByStatus(products, filterKey) {
    return products.filter((p) => matchesFilter(p, filterKey));
  }

  /**
   * Filtra productos por búsqueda de texto con soporte para plurales/singulares
   */
  async filterBySearch(products, searchTerm) {
    if (!searchTerm) return products;

    // Importar utilidades de búsqueda flexible
    const { flexibleMatch } = await import('./searchNormalizer');

    const term = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      const codigo = p.codigo || '';
      const descripcion = p.descripcion || '';
      const linea = p.linea?.nombre || '';

      // Búsqueda exacta en código (no aplicar plurales)
      if (codigo.toLowerCase().includes(term)) {
        return true;
      }

      // Búsqueda flexible en descripción y línea (soporta plurales/singulares)
      return flexibleMatch(term, descripcion) ||
        flexibleMatch(term, linea);
    });
  }

  /**
   * Mezcla productos aleatoriamente (Fisher-Yates)
   */
  shuffle(products) {
    const shuffled = [...products];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Fuerza una recarga desde la API
   */
  async forceRefresh() {
    this.products = null;
    this.lastFetch = null;
    return this.getAllProducts();
  }

  /**
   * Limpia el caché
   */
  clear() {
    this.products = null;
    this.lastFetch = null;
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Obtiene información del caché
   */
  getCacheInfo() {
    return {
      hasCache: !!this.products,
      productsCount: this.products?.length || 0,
      lastFetch: this.lastFetch,
      isValid: this.isCacheValid(),
      ttlRemaining: this.lastFetch
        ? Math.max(0, CACHE_TTL_MS - (Date.now() - this.lastFetch))
        : 0
    };
  }
}

// SINGLETON: Una sola instancia compartida en toda la app
const productCache = new ProductCacheManager();

// Exportar singleton
export default productCache;

// También exportar la clase por si se necesita crear instancias custom
export { ProductCacheManager };




