import { useState } from 'react';
import CherryButton from '../CherryButton/CherryButton';
import './RegisterForm.css';
import useUserStore from '../../store/userStore';

const RegisterForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: ''
  });
  const { register, loading, error, clearError } = useUserStore();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.password_confirmation) {
      return;
    }
    
    if (form.password !== form.password_confirmation) {
      return;
    }
    
    const user = await register(form);
    if (user) {
      if (onSuccess) onSuccess(user);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <label htmlFor="name" className="register-label">Nombre completo</label>
      <input
        id="name"
        name="name"
        type="text"
        autoComplete="name"
        value={form.name}
        onChange={handleChange}
        className="register-input"
        required
      />
      
      <label htmlFor="email" className="register-label">Correo Electrónico</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        value={form.email}
        onChange={handleChange}
        className="register-input"
        required
      />
      
      <label htmlFor="phone" className="register-label">Teléfono (opcional)</label>
      <input
        id="phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        value={form.phone}
        onChange={handleChange}
        className="register-input"
      />
      
      <label htmlFor="password" className="register-label">Contraseña</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={form.password}
        onChange={handleChange}
        className="register-input"
        required
      />
      
      <label htmlFor="password_confirmation" className="register-label">Confirmar Contraseña</label>
      <input
        id="password_confirmation"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        value={form.password_confirmation}
        onChange={handleChange}
        className="register-input"
        required
      />
      
      {error && <div className="register-error">{error}</div>}
      
      <CherryButton type="submit" variant="red" fullWidth disabled={loading}>
        {loading ? 'Registrando...' : 'Registrarse'}
      </CherryButton>
    </form>
  );
};

export default RegisterForm; 