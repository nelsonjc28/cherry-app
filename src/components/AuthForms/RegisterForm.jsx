import { useState } from 'react';
import CherryButton from '../CherryButton/CherryButton';
import './RegisterForm.css';
import useUserStore from '../../store/userStore';

const RegisterForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const { register, loading, error, clearError } = useUserStore();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.middle_name || !form.email || !form.password || !form.password_confirmation) {
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
      <label htmlFor="last_name" className="register-label">Apellido Paterno</label>
      <input
        id="last_name"
        name="last_name"
        type="text"
        value={form.last_name}
        onChange={handleChange}
        className="register-input"
        required
      />
      <label htmlFor="middle_name" className="register-label">Apellido Materno</label>
      <input
        id="middle_name"
        name="middle_name"
        type="text"
        value={form.middle_name}
        onChange={handleChange}
        className="register-input"
        required
      />
      <label htmlFor="first_name" className="register-label">Nombre(s)</label>
      <input
        id="first_name"
        name="first_name"
        type="text"
        value={form.first_name}
        onChange={handleChange}
        className="register-input"
        required
      />
      <label htmlFor="phone" className="register-label">Teléfono (opcional)</label>
      <input
        id="phone"
        name="phone"
        type="text"
        value={form.phone}
        onChange={handleChange}
        className="register-input"
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
        {loading ? 'Registrando...' : 'Registro'}
      </CherryButton>
    </form>
  );
};

export default RegisterForm; 