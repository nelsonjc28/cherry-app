import { create } from 'zustand';
import api from '../services/api';
import useUserStore from './userStore';

const useRecentProductsStore = create((set, get) => ({
  recentProductIds: [],
  loading: false,
  error: null,

  /**
   * Registrar un producto visto recientemente
   */
  registerProduct: async (productId) => {
    const { user } = useUserStore.getState();
    
    // Solo registrar si el usuario está autenticado
    if (!user) {
      console.log('[RecentProductsStore] No se registra producto: Usuario no autenticado', productId);
      return;
    }

    console.log('[RecentProductsStore] Registrando producto:', productId, 'para usuario:', user.id);
    try {
      const response = await api.post('/recent-products', {
        product_id: productId
      });
      
      console.log('[RecentProductsStore] Producto registrado exitosamente:', response.data);
      
      // Actualizar la lista local después de registrar
      await get().fetchRecentProducts();
    } catch (error) {
      console.error('[RecentProductsStore] Error al registrar producto reciente:', error);
      // No mostrar error al usuario, solo log
    }
  },

  /**
   * Obtener lista de IDs de productos vistos recientemente
   */
  fetchRecentProducts: async () => {
    const { user } = useUserStore.getState();
    
    // Solo obtener si el usuario está autenticado
    if (!user) {
      console.log('[RecentProductsStore] Usuario no autenticado, no se cargan productos recientes');
      set({ recentProductIds: [], loading: false });
      return;
    }

    console.log('[RecentProductsStore] Cargando productos recientes para usuario:', user.id);
    set({ loading: true, error: null });

    try {
      const response = await api.get('/recent-products');
      
      if (response.data.success) {
        const productIds = response.data.data || [];
        console.log('[RecentProductsStore] Productos recientes obtenidos:', productIds.length);
        set({ 
          recentProductIds: productIds,
          loading: false 
        });
      } else {
        console.error('[RecentProductsStore] Error en respuesta:', response.data.error);
        set({ 
          recentProductIds: [],
          loading: false,
          error: response.data.error || 'Error al obtener productos recientes'
        });
      }
    } catch (error) {
      console.error('[RecentProductsStore] Error al obtener productos recientes:', error);
      set({ 
        recentProductIds: [],
        loading: false,
        error: error.message || 'Error al obtener productos recientes'
      });
    }
  },

  /**
   * Limpiar estado
   */
  clearRecentProducts: () => {
    set({ 
      recentProductIds: [],
      loading: false,
      error: null
    });
  }
}));

export default useRecentProductsStore;
