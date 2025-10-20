import { Helmet } from 'react-helmet-async';
import { useState } from "react";
import "./LoginPage.css";
import { getIconPath, getImagePath } from '../../utils/assetPaths';
import { Link } from 'react-router-dom';
import CustomButton from '../../components/CustomButton';

const LoginPage = () => {

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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
                    <label>Email o Teléfono</label>
                    <div className="login-input-container">
                      <img
                        src={getIconPath('User.svg')}
                        alt="Email o Teléfono"
                        className="login-input-icon"
                      />
                      <input
                        type="text"
                        name="username"
                        placeholder="Ingresa tu email o teléfono"
                        value={formData.username}
                        onChange={handleInputChange}
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
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={handleInputChange}
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
                    >
                      <span className="login-submit-button">Iniciar Sesión</span>
                    </CustomButton>
                  </div>

                  <div className="login-forgot-password">
                    <Link to="/forgot-password">¿Olvidó su contraseña?</Link>
                  </div>

                  <div className="login-register-link">
                    ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
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
