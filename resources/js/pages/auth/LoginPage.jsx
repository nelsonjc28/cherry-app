import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "./LoginPage.css";
import { getIconPath, getImagePath } from '../../utils/assetPaths';
import { Link } from 'react-router-dom';
import CustomButton from '../../components/CustomButton';
import useUserStore from '../../store/userStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error, user, initialized } = useUserStore();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      if (window.showToast) {
        window.showToast('Por favor completa todos los campos', 'error');
      }
      return;
    }

    setIsSubmitting(true);
    
    try {
      const user = await login(formData.email, formData.password);
      
      if (user) {
        if (window.showToast) {
          window.showToast('¡Bienvenido!', 'success');
        }
        
        // Redirigir según el rol del usuario
        if (user.role?.name === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        if (window.showToast) {
          window.showToast(error || 'Error al iniciar sesión', 'error');
        }
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error de conexión', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Redirigir si el usuario ya está logueado
  useEffect(() => {
    if (initialized && user) {
      // Redirigir según el rol del usuario
      if (user.role?.name === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [initialized, user, navigate]);

  // Mostrar loading mientras se inicializa la autenticación
  if (!initialized) {
    return (
      <>
        <Helmet>
          <title>Cargando... - Cherry Central</title>
        </Helmet>
        <div className="login-page">
          <div className="login-container">
            <div className="login-form-wrapper">
              <div className="login-loading">
                <div className="loading-spinner"></div>
                <p>Verificando sesión...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Si el usuario ya está logueado, mostrar mensaje de redirección
  if (user) {
    return (
      <>
        <Helmet>
          <title>Redirigiendo... - Cherry Central</title>
        </Helmet>
        <div className="login-page">
          <div className="login-container">
            <div className="login-form-wrapper">
              <div className="login-redirect-message">
                <h2>Ya tienes una sesión activa</h2>
                <p>Redirigiendo...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Iniciar Sesión | Cherry Central</title>
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
                  <h2 className="login-subtitle">Inicio de Sesión</h2>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                  <div className="login-form-group">
                    <label>Email</label>
                    <div className="login-input-container">
                      <img
                        src={getIconPath('User.svg')}
                        alt="Email"
                        className="login-input-icon"
                      />
                      <input
                        type="email"
                        name="email"
                        placeholder="Ingresa tu email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="login-form-group">
                    <label>Contraseña</label>
                    <div className="login-input-container">
                      <img
                        src={getIconPath('Unlock.svg')}
                        alt="Contraseña"
                        className="login-input-icon"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Ingresa tu contraseña"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={togglePasswordVisibility}
                      >
                        <img
                          src={getIconPath(showPassword ? 'Eye.svg' : 'Eye.svg')}
                          alt={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="login-button-container">
                    <CustomButton
                      variant="filled"
                      size={'small'}
                      type="submit"
                      disabled={isSubmitting || loading}
                    >
                      <span className="login-submit-button">
                        {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                      </span>
                    </CustomButton>
                  </div>

                  <div className="login-forgot-password">
                    <Link to="/forgot-password">¿Olvidó su contraseña?</Link>
                  </div>

                  <div className="login-register-link">
                    ¿No tienes cuenta? <Link to="/registro">Afíliate</Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
