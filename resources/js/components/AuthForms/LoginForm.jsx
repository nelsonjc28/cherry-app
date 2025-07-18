import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CherryButton from '../CherryButton/CherryButton';
import './LoginForm.css';
import useUserStore from '../../store/userStore';

const LoginForm = ({ onSuccess }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, loading, error, clearError, getRedirectPath } = useUserStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return;
    }
    
    const user = await login(form.email, form.password);
    if (user) {
      // Redirigir según el rol del usuario
      const redirectPath = getRedirectPath();
      navigate(redirectPath);
      
      if (onSuccess) onSuccess(user);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label htmlFor="email" className="login-label">Correo Electrónico</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        value={form.email}
        onChange={handleChange}
        className="login-input"
        required
      />
      <label htmlFor="password" className="login-label">Contraseña</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={form.password}
        onChange={handleChange}
        className="login-input"
        required
      />
      {error && <div className="login-error">{error}</div>}
      <CherryButton type="submit" variant="red" fullWidth disabled={loading}>
        {loading ? 'Iniciando...' : 'Login'}
      </CherryButton>
    </form>
  );
};

export default LoginForm; 