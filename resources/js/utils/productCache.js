import { openDB } from 'idb';

const DB_NAME = 'cherry-products-db';
const DB_VERSION = 2;
const PRODUCTS_STORE = 'products';
const METADATA_STORE = 'metadata';
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutos

/**
 * Clase para manejar el caché de productos con IndexedDB
 */
class ProductCacheManager {
  constructor() {
    this.dbPromise = null;
  }

  /**
   * Inicializar la base de datos
   */
  async initDB() {
    if (this.dbPromise) return this.dbPromise;

    try {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          if (oldVersion < 2) {
            if (db.objectStoreNames.contains(PRODUCTS_STORE)) {
              db.deleteObjectStore(PRODUCTS_STORE);
            }
            if (db.objectStoreNames.contains(METADATA_STORE)) {
              db.deleteObjectStore(METADATA_STORE);
            }
          }

          if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
            const productsStore = db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' });
            productsStore.createIndex('timestamp', 'timestamp');
            productsStore.createIndex('catalog', 'catalog');
            productsStore.createIndex('category', 'category');
          }

          if (!db.objectStoreNames.contains(METADATA_STORE)) {
            db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
          }
        },
      });

      return this.dbPromise;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener metadata del caché
   */
  async getMetadata(key) {
    try {
      const db = await this.initDB();
      if (!db) return null;

      const metadata = await db.get(METADATA_STORE, key);
      return metadata;
    } catch (error) {
      return null;
    }
  }

  /**
   * Guardar metadata del caché
   */
  async setMetadata(key, value) {
    try {
      const db = await this.initDB();
      if (!db) return false;

      await db.put(METADATA_STORE, { key, value, timestamp: Date.now() });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verificar si el caché está expirado
   */
  async isCacheExpired(key) {
    const metadata = await this.getMetadata(key);
    
    if (!metadata) return true;
    
    const now = Date.now();
    const cacheAge = now - metadata.timestamp;
    
    return cacheAge > CACHE_DURATION;
  }

  /**
   * Obtener productos del caché
   */
  async getCachedProducts(cacheKey = 'all-products') {
    try {
      // Verificar si el caché está expirado
      const isExpired = await this.isCacheExpired(cacheKey);
      
      if (isExpired) {
        return null;
      }

      const db = await this.initDB();
      if (!db) return null;

      // Obtener todos los productos
      const products = await db.getAll(PRODUCTS_STORE);
      
      if (!products || products.length === 0) {
        return null;
      }

      return products;
    } catch (error) {
      return null;
    }
  }

  /**
   * Guardar productos en el caché
   */
  async saveProducts(products, cacheKey = 'all-products') {
    try {
      const db = await this.initDB();
      if (!db) return false;

      // Limpiar productos antiguos primero
      await this.clearProducts();

      // Guardar productos en lote
      const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
      const store = tx.objectStore(PRODUCTS_STORE);

      const savePromises = products.map(product => {
        // Agregar timestamp a cada producto
        const productWithTimestamp = {
          ...product,
          cachedAt: Date.now()
        };
        return store.put(productWithTimestamp);
      });

      await Promise.all(savePromises);
      await tx.done;

      // Actualizar metadata
      await this.setMetadata(cacheKey, {
        count: products.length,
        lastUpdate: new Date().toISOString()
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Limpiar productos del caché
   */
  async clearProducts() {
    try {
      const db = await this.initDB();
      if (!db) return false;

      await db.clear(PRODUCTS_STORE);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Limpiar toda la base de datos
   */
  async clearAll() {
    try {
      const db = await this.initDB();
      if (!db) return false;

      await Promise.all([
        db.clear(PRODUCTS_STORE),
        db.clear(METADATA_STORE)
      ]);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener información del caché
   */
  async getCacheInfo() {
    try {
      const db = await this.initDB();
      if (!db) return null;

      const [products, metadata] = await Promise.all([
        db.getAll(PRODUCTS_STORE),
        this.getMetadata('all-products')
      ]);

      return {
        productsCount: products.length,
        metadata,
        isExpired: await this.isCacheExpired('all-products'),
        cacheSize: new Blob([JSON.stringify(products)]).size
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Forzar actualización del caché
   */
  async forceUpdate(products) {
    await this.clearAll();
    return await this.saveProducts(products);
  }
}

// Crear instancia singleton
const productCache = new ProductCacheManager();

// Exportar funciones de utilidad
export const getCachedProducts = () => productCache.getCachedProducts();
export const saveProductsToCache = (products) => productCache.saveProducts(products);
export const clearProductCache = () => productCache.clearProducts();
export const clearAllCache = () => productCache.clearAll();
export const getCacheInfo = () => productCache.getCacheInfo();
export const isCacheExpired = () => productCache.isCacheExpired('all-products');

export default productCache;

