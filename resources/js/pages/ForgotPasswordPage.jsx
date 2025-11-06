import { Helmet } from 'react-helmet-async';
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./LoginPage.css"; // Reutilizar los estilos del login
import { getIconPath, getImagePath } from '../utils/assetPaths';
import { Link } from 'react-router-dom';
import CustomButton from '../components/CustomButton';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: código, 3: nueva contraseña
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Paso 1: Enviar código al correo
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/password/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        if (window.showToast) {
          window.showToast(data.message, 'success');
        }
        setStep(2);
      } else {
        setError(data.message || 'Error al enviar el código');
        if (window.showToast) {
          window.showToast(data.message || 'Error al enviar el código', 'error');
        }
      }
    } catch (error) {
      setError('Error de conexión. Por favor, intenta nuevamente.');
      if (window.showToast) {
        window.showToast('Error de conexión. Por favor, intenta nuevamente.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Verificar código
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/password/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (data.success) {
        if (window.showToast) {
          window.showToast(data.message, 'success');
        }
        setStep(3);
      } else {
        setError(data.message || 'El código ingresado no es válido');
        if (window.showToast) {
          window.showToast(data.message || 'El código ingresado no es válido', 'error');
        }
      }
    } catch (error) {
      setError('Error de conexión. Por favor, intenta nuevamente.');
      if (window.showToast) {
        window.showToast('Error de conexión. Por favor, intenta nuevamente.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Paso 3: Resetear contraseña
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
          password,
          password_confirmation: passwordConfirmation
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (window.showToast) {
          window.showToast(data.message, 'success');
        }
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.message || 'Error al restablecer la contraseña');
        if (window.showToast) {
          window.showToast(data.message || 'Error al restablecer la contraseña', 'error');
        }
      }
    } catch (error) {
      setError('Error de conexión. Por favor, intenta nuevamente.');
      if (window.showToast) {
        window.showToast('Error de conexión. Por favor, intenta nuevamente.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Recuperar Contraseña | Cherry Central</title>
      </Helmet>
      <div className="login-page">
        <div className="container login-container">
          {/* Background images */}
          <img src="/images/AuthPages/top-stripe.png" alt="stripe" className="login-stripe-top-img" />
          <img src="/images/AuthPages/bottom-stripe.png" alt="stripe" className="login-stripe-bottom-img" />

          <div className="login-content">
            <div className="login-left">
              <div className="login-image-container">
                <img src={getImagePath('logo.svg')} alt="logo" className="login-logo" />
                <img src="/images/AuthPages/girl-login-bag.png" alt="Cherry Shopping" className="login-image" />
                <img src="/images/AuthPages/round-shape.png" alt="Round Shape" className="login-image-round-shape" />
              </div>
            </div>

            <div className="login-right">
              <div className="login-form-container">
                <div className="login-form-header">
                  <h2 className="login-subtitle">Recuperar Contraseña</h2>
                  
                  {/* Paso 1 */}
                  {step === 1 && (
                    <p style={{ textAlign: 'center', marginTop: '10px', color: '#7B7B7B', fontSize: '14px' }}>
                      Ingresa tu correo electrónico y te enviaremos un código de verificación.
                    </p>
                  )}
                  
                  {/* Paso 2 */}
                  {step === 2 && (
                    <p style={{ textAlign: 'center', marginTop: '10px', color: '#7B7B7B', fontSize: '14px' }}>
                      Ingresa el código de 6 dígitos que enviamos a <strong>{email}</strong>
                    </p>
                  )}
                  
                  {/* Paso 3 */}
                  {step === 3 && (
                    <p style={{ textAlign: 'center', marginTop: '10px', color: '#7B7B7B', fontSize: '14px' }}>
                      Ingresa tu nueva contraseña
                    </p>
                  )}
                </div>

                {/* PASO 1: Solicitar código */}
                {step === 1 && (
                  <form onSubmit={handleSendCode} className="login-form">
                    <div className="login-form-group">
                      <label>Correo Electrónico</label>
                      <div className="login-input-container">
                        <img
                          src={getIconPath('User.svg')}
                          alt="Email"
                          className="login-input-icon"
                        />
                        <input
                          type="email"
                          name="email"
                          placeholder="correo@ejemplo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {error && (
                      <div style={{ 
                        backgroundColor: '#fee', 
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        padding: '10px',
                        marginBottom: '15px',
                        color: '#c33',
                        fontSize: '14px'
                      }}>
                        {error}
                      </div>
                    )}

                    <div className="login-button-container">
                      <CustomButton
                        variant="filled"
                        size={'small'}
                        type="submit"
                        disabled={loading}
                      >
                        <span className="login-submit-button">
                          {loading ? 'Enviando...' : 'Enviar Código'}
                        </span>
                      </CustomButton>
                    </div>

                    <div className="login-register-link">
                      <Link to="/login">Volver al inicio de sesión</Link>
                    </div>
                  </form>
                )}

                {/* PASO 2: Verificar código */}
                {step === 2 && (
                  <form onSubmit={handleVerifyCode} className="login-form">
                    <div className="login-form-group">
                      <label>Código de Verificación</label>
                      <div className="login-input-container">
                        <img
                          src={getIconPath('Unlock.svg')}
                          alt="Código"
                          className="login-input-icon"
                        />
                        <input
                          type="text"
                          name="code"
                          placeholder="000000"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                          disabled={loading}
                          maxLength={6}
                          style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}
                        />
                      </div>
                      <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '8px' }}>
                        El código expira en 15 minutos
                      </small>
                    </div>

                    {error && (
                      <div style={{ 
                        backgroundColor: '#fee', 
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        padding: '10px',
                        marginBottom: '15px',
                        color: '#c33',
                        fontSize: '14px'
                      }}>
                        {error}
                      </div>
                    )}

                    <div className="login-button-container">
                      <CustomButton
                        variant="filled"
                        size={'small'}
                        type="submit"
                        disabled={loading || code.length !== 6}
                      >
                        <span className="login-submit-button">
                          {loading ? 'Verificando...' : 'Verificar Código'}
                        </span>
                      </CustomButton>
                    </div>

                    <div className="login-register-link">
                      <button 
                        type="button"
                        onClick={() => setStep(1)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Volver a enviar código
                      </button>
                    </div>
                  </form>
                )}

                {/* PASO 3: Nueva contraseña */}
                {step === 3 && (
                  <form onSubmit={handleResetPassword} className="login-form">
                    <div className="login-form-group">
                      <label>Nueva Contraseña</label>
                      <div className="login-input-container">
                        <img
                          src={getIconPath('Unlock.svg')}
                          alt="Contraseña"
                          className="login-input-icon"
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Mínimo 8 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          minLength={8}
                        />
                        <button
                          type="button"
                          className="login-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <img
                            src={getIconPath('Eye.svg')}
                            alt={showPassword ? 'Ocultar' : 'Mostrar'}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="login-form-group">
                      <label>Confirmar Contraseña</label>
                      <div className="login-input-container">
                        <img
                          src={getIconPath('Unlock.svg')}
                          alt="Confirmar"
                          className="login-input-icon"
                        />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="password_confirmation"
                          placeholder="Repite tu contraseña"
                          value={passwordConfirmation}
                          onChange={(e) => setPasswordConfirmation(e.target.value)}
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="login-password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <img
                            src={getIconPath('Eye.svg')}
                            alt={showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                          />
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div style={{ 
                        backgroundColor: '#fee', 
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        padding: '10px',
                        marginBottom: '15px',
                        color: '#c33',
                        fontSize: '14px'
                      }}>
                        {error}
                      </div>
                    )}

                    <div className="login-button-container">
                      <CustomButton
                        variant="filled"
                        size={'small'}
                        type="submit"
                        disabled={loading}
                      >
                        <span className="login-submit-button">
                          {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                        </span>
                      </CustomButton>
                    </div>

                    <div className="login-register-link">
                      <Link to="/login">Volver al inicio de sesión</Link>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
