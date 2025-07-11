import { useState } from 'react';
import CherryButton from '../CherryButton/CherryButton';
import './LoginForm.css';

const LoginForm = ({ onSuccess }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    // Here would go the real authentication logic
    if (onSuccess) onSuccess(form);
    else alert('Simulated login');
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label htmlFor="email" className="login-label">Email</label>
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
      <label htmlFor="password" className="login-label">Password</label>
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
      <CherryButton type="submit" variant="red" fullWidth>Login</CherryButton>
    </form>
  );
};

export default LoginForm; 