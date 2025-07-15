import { create } from 'zustand';
import useCartStore from './cartStore';

const getToken = () => localStorage.getItem('token');
const setToken = (token) => token ? localStorage.setItem('token', token) : localStorage.removeItem('token');

const useUserStore = create((set) => ({
  user: null,
  token: getToken(),
  loading: false,
  error: null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    set({ token });
    setToken(token);
  },
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
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
      if (!res.ok) {
        let errorMessage = 'Error en el registro.';
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
      return data.user;
    } catch (err) {
      set({ error: 'Error de red o del servidor.', loading: false });
      return null;
    }
  },
  fetchUser: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          // Token expirado o inválido, hacer logout automático
          await get().logout();
          return null;
        }
        throw new Error('No autenticado');
      }
      const user = await res.json();
      set({ user, loading: false });
      return user;
    } catch (err) {
      set({ user: null, error: err.message, loading: false });
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
}));

export default useUserStore; 