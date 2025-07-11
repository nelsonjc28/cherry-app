import { useState } from 'react';
import CherryButton from '../CherryButton/CherryButton';
import './RegisterForm.css';

const RegisterForm = ({ onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    // Here would go the real registration logic
    if (onSuccess) onSuccess(form);
    else alert('Simulated registration');
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <label htmlFor="name" className="register-label">Full Name</label>
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
      <label htmlFor="email" className="register-label">Email</label>
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
      <label htmlFor="password" className="register-label">Password</label>
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
      {error && <div className="register-error">{error}</div>}
      <CherryButton type="submit" variant="red" fullWidth>Registro</CherryButton>
    </form>
  );
};

export default RegisterForm; 