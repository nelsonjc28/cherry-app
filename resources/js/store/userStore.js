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
  
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        let errorMessage = 'Error al iniciar sesión.';
        if (data.errors) {
          errorMessage = Object.values(data.errors).flat().join(' ');
        } else if (data.error) {
          errorMessage = data.error;
        }
        set({ error: errorMessage, loading: false });
        return null;
      }
      setToken(data.token);
      set({ user: data.user, token: data.token, loading: false, error: null });
      
      // Inicializar carrito después del login
      const cartStore = useCartStore.getState();
      await cartStore.initCart();
      
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
      console.log('Backend response:', { status: res.status, data });
      
      if (!res.ok) {
        let errorMessage = 'Error en el registro.';
        if (data.errors) {
          console.log('Validation errors:', data.errors);
          // Mostrar todos los errores concatenados
          const allErrors = [];
          Object.keys(data.errors).forEach(key => {
            const fieldErrors = data.errors[key];
            if (Array.isArray(fieldErrors)) {
              allErrors.push(...fieldErrors);
            } else {
              allErrors.push(fieldErrors);
            }
          });
          errorMessage = allErrors.join('. ');
        } else if (data.error) {
          errorMessage = data.error;
        }
        console.log('Final error message:', errorMessage);
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
