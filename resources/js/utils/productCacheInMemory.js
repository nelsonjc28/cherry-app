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
      console.log('✅ ProductCache: Usando caché en memoria', {
        productos: this.products.length,
        edad: Math.round((Date.now() - this.lastFetch) / 1000) + 's'
      });
      return this.products;
    }

    // Si ya hay una carga en progreso, esperar a que termine
    if (this.isLoading && this.loadPromise) {
      console.log('⏳ ProductCache: Carga en progreso, esperando...');
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
    console.log('📡 ProductCache: Descargando productos desde API externa...');

    try {
      const response = await axios.get(CHERRY_API_URL, {
        timeout: 30000 // 30 segundos timeout
      });
      
      const products = response.data || [];
      
      if (!Array.isArray(products)) {
        console.error('❌ ProductCache: Respuesta inválida de API');
        return [];
      }

      // Guardar en caché
      this.products = products;
      this.lastFetch = Date.now();

      const duration = Date.now() - startTime;
      console.log('✅ ProductCache: Productos cargados', {
        total: products.length,
        tiempo: duration + 'ms',
        tamaño: (JSON.stringify(products).length / 1024 / 1024).toFixed(2) + ' MB'
      });

      return products;
    } catch (error) {
      console.error('❌ ProductCache: Error al cargar productos', error);
      
      // Si hay caché antiguo, usarlo como fallback
      if (this.products) {
        console.warn('⚠️ ProductCache: Usando caché antiguo como fallback');
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
   */
  filterByCategory(products, categoryId) {
    if (!categoryId) return products;
    return products.filter(p => p.linea?.id_linea == categoryId);
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
   */
  filterOnlyNew(products) {
    return products.filter(p => p.opc_nuevo === 'S');
  }

  /**
   * Filtra productos por búsqueda de texto
   */
  filterBySearch(products, searchTerm) {
    if (!searchTerm) return products;
    
    const term = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      const codigo = (p.codigo || '').toLowerCase();
      const descripcion = (p.descripcion || '').toLowerCase();
      const linea = (p.linea?.nombre || '').toLowerCase();
      
      return codigo.includes(term) || 
             descripcion.includes(term) || 
             linea.includes(term);
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




