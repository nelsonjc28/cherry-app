import { create } from 'zustand';
import useCartStore from './cartStore';

const getToken = () => localStorage.getItem('token');
const setToken = (token) => token ? localStorage.setItem('token', token) : localStorage.removeItem('token');

const useUserStore = create((set, get) => ({
  user: null,
  token: getToken(),
  loading: false,
  error: null,
  initialized: true, // Cambiar a true por defecto para evitar problemas de inicialización
  setUser: (user) => set({ user }),
  setToken: (token) => {
    set({ token });
    setToken(token);
  },
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Helper function to get user role
  getUserRole: () => {
    const { user } = get();
    return user?.role?.name || null;
  },

  // Helper function to check if user is admin
  isAdmin: () => {
    const { user } = get();
    return user?.role?.name === 'admin';
  },

  /** Admin u operador: personal de panel (no cliente). */
  isAdminOrOperator: () => {
    const n = get().user?.role?.name;
    return n === 'admin' || n === 'operador';
  },

  // Helper function to check if user is cliente
  isCliente: () => {
    const { user } = get();
    return user?.role?.name === 'cliente';
  },

  // Function to get redirect path based on user role
  getRedirectPath: () => {
    const { user } = get();
    if (!user) return '/';
    return user.role?.name === 'admin' ? '/admin' : '/';
  },

  login: async (identifier, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMessage = 'Error al iniciar sesión.';
        if (data.errors) {
          // Mostrar cada error individualmente con toast
          Object.keys(data.errors).forEach(key => {
            const fieldErrors = data.errors[key];
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach(error => {
                if (window.showToast) {
                  window.showToast(error, 'error', 4000);
                }
              });
            } else {
              if (window.showToast) {
                window.showToast(fieldErrors, 'error', 4000);
              }
            }
          });
          // También guardar el primer error en el estado
          const firstError = Object.values(data.errors)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        } else if (data.error) {
          // Usar el mensaje exacto del backend
          errorMessage = data.error;
          if (window.showToast) {
            window.showToast(errorMessage, 'error', 4000);
          }
        }
        set({ error: errorMessage, loading: false });
        return null;
      }
      // CRÍTICO: Leer y guardar localStorage ANTES de establecer el token
      // porque el persist middleware limpiará localStorage cuando detecta sesión
      const cartStore = useCartStore.getState();
      
      // PASO 1: Leer localStorage ANTES de cualquier operación
      const localStorageCartBeforeLogin = localStorage.getItem('cherry-central-cart');
      
      // PASO 2: Guardar una copia completa en memoria para restaurar si se limpia
      let savedCartString = null;
      let savedCartData = null;
      if (localStorageCartBeforeLogin) {
        savedCartString = localStorageCartBeforeLogin; // Guardar string completo
        try {
          savedCartData = JSON.parse(localStorageCartBeforeLogin);
        } catch (e) {
        }
      }
      
      // PASO 3: Establecer el token (esto puede activar el persist middleware que limpia localStorage)
      setToken(data.token);
      set({ user: data.user, token: data.token, loading: false, error: null });

      // PASO 4: Verificar si localStorage se limpió DESPUÉS de establecer token
      const localStorageCartAfterLogin = localStorage.getItem('cherry-central-cart');

      // PASO 5: Si localStorage se limpió, restaurarlo INMEDIATAMENTE
      if (savedCartString && !localStorageCartAfterLogin) {
        localStorage.setItem('cherry-central-cart', savedCartString);
        
        // Verificar que se restauró
        const verifyRestored = localStorage.getItem('cherry-central-cart');
      }

      // PASO 6: Inicializar carrito después del login y sincronizar localStorage a BD
      cartStore.resetInitialization(); // Resetear para forzar recarga
      await cartStore.syncCartFromLocalStorage(); // Sincronizar (esto ya carga el carrito combinado)
      // NO llamar a initCart aquí porque syncCartFromLocalStorage ya actualiza el estado

      return data.user;
    } catch (err) {
      set({ error: 'Error de red o del servidor.', loading: false });
      return null;
    }
  },
  logout: async () => {
    set({ loading: true, error: null });
    try {
      // Attempt to logout from server
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${get().token}`
        }
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }
    } catch (err) {
      // Even if server logout fails, clear local state
    } finally {
      // Limpiar carrito en BD antes de cerrar sesión
      try {
        const cartStore = useCartStore.getState();
        await cartStore.clearCart();
      } catch (error) {
        // Error clearing cart on logout
      }

      // Clear local state regardless of server response
      set({
        user: null,
        token: null,
        loading: false,
        error: null
      });
    }
  },
  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();

      if (!res.ok) {
        let errorMessage = 'Error en el registro.';
        if (data.errors) {
          // Mostrar cada error individualmente con toast
          Object.keys(data.errors).forEach(key => {
            const fieldErrors = data.errors[key];
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach(error => {
                if (window.showToast) {
                  window.showToast(error, 'error', 4000);
                }
              });
            } else {
              if (window.showToast) {
                window.showToast(fieldErrors, 'error', 4000);
              }
            }
          });
          // También guardar el primer error en el estado
          const firstError = Object.values(data.errors)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        } else if (data.error) {
          errorMessage = data.error;
          if (window.showToast) {
            window.showToast(errorMessage, 'error', 4000);
          }
        }
        set({ error: errorMessage, loading: false });
        return null;
      }
      setToken(data.token);
      set({ user: data.user, token: data.token, loading: false, error: null });
      return data.user;
    } catch (err) {
      set({ error: 'Error de red o del servidor.', loading: false });
      return null;
    }
  },
  fetchUser: async () => {
    const token = getToken();

    if (!token) {
      set({ loading: false, initialized: true });
      return null;
    }

    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expirado o inválido, limpiar estado local
          set({ user: null, token: null, loading: false, initialized: true });
          setToken(null);
          return null;
        }
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const user = await res.json();

      if (!user) {
        set({ user: null, token: null, loading: false, initialized: true });
        setToken(null);
        return null;
      }

      set({ user, loading: false, initialized: true });
      
      // Si hay usuario autenticado, sincronizar carrito de localStorage a BD si existe
      if (user) {
        const cartStore = useCartStore.getState();
        const localStorageCart = localStorage.getItem('cherry-central-cart');
        if (localStorageCart) {
          try {
            const parsed = JSON.parse(localStorageCart);
            const hasLocalItems = parsed.state?.items && parsed.state.items.length > 0;
            if (hasLocalItems) {
              // Hay items en localStorage, sincronizar primero
              cartStore.resetInitialization();
              await cartStore.syncCartFromLocalStorage();
            } else {
              // No hay items en localStorage, solo cargar desde BD
              cartStore.resetInitialization();
              await cartStore.initCart(true);
            }
          } catch (error) {
            // Error parseando localStorage, solo cargar desde BD
            cartStore.resetInitialization();
            await cartStore.initCart(true);
          }
        } else {
          // No hay localStorage, solo cargar desde BD
          cartStore.resetInitialization();
          await cartStore.initCart(true);
        }
      }
      
      return user;
    } catch (err) {
      set({ user: null, error: err.message, loading: false, initialized: true });
      setToken(null);
      return null;
    }
  },

  // Función para logout automático cuando el token expira
  forceLogout: () => {
    const cartStore = useCartStore.getState();
    cartStore.clearCart();
    setToken(null);
    set({ user: null, token: null, loading: false, error: null });
  },

  // Función para actualizar el perfil del usuario
  updateProfile: (updatedUser) => {
    set({ user: updatedUser });
  },
}));

export default useUserStore; 
