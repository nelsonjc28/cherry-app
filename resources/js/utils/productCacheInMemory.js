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

const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';
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

      const products = response.data || [];

      if (!Array.isArray(products)) {
        return [];
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
    return products.filter(p => p.linea?.id_linea == categoryCode);
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
   * Filtra solo productos nuevos
   * Un producto es considerado nuevo si alguno de sus detalles
   * tiene una fechaMovimiento menor a 60 días desde hoy
   */
  filterOnlyNew(products) {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    return products.filter(p => {
      // Si no tiene detalles, verificar el campo tradicional
      if (!p.detalles || !Array.isArray(p.detalles) || p.detalles.length === 0) {
        return p.opc_nuevo === 'S';
      }

      // Revisar cada detalle del producto
      return p.detalles.some(detalle => {
        if (!detalle.fechaMovimiento) return false;

        try {
          // Parsear la fecha (formato: "YYYY-MM-DD")
          const [year, month, day] = detalle.fechaMovimiento.split('-').map(Number);
          const fechaMovimiento = new Date(year, month - 1, day);

          // Si la fecha es válida y es menor a 60 días, el producto es nuevo
          return !isNaN(fechaMovimiento.getTime()) && fechaMovimiento >= sixtyDaysAgo;
        } catch (error) {
          return false;
        }
      });
    });
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
    console.log('🔄 ProductCache: Forzando actualización...');
    this.products = null;
    this.lastFetch = null;
    return this.getAllProducts();
  }

  /**
   * Limpia el caché
   */
  clear() {
    console.log('🗑️ ProductCache: Limpiando caché');
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




