import { Helmet } from 'react-helmet-async';
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./RegisterPage.css";
import { getIconPath, getImagePath } from '../../utils/assetPaths';
import { Link } from 'react-router-dom';
import CustomButton from '../../components/CustomButton';
import useUserStore from '../../store/userStore';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading, error } = useUserStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    day: "1",
    month: "Enero",
    year: "1986",
    city: "",
    state: "",
    postalCode: "",
    street: "",
    receivePromotions: false,
    acceptTerms: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    
    // Auto-llenar username con el teléfono cuando se cambie el teléfono
    if (name === 'phone') {
      setFormData((prev) => ({
        ...prev,
        username: value
      }));
    }
    
    // Limpiar errores del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (step = 1) => {
    const errors = {};

    if (step === 1) {
      if (!formData.firstName.trim()) {
        errors.firstName = 'El nombre es requerido';
      }
      if (!formData.lastName.trim()) {
        errors.lastName = 'Los apellidos son requeridos';
      }
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = 'El correo electrónico no es válido';
      }
      if (!formData.phone.trim()) {
        errors.phone = 'El teléfono es requerido';
      }
      if (!formData.username.trim()) {
        errors.username = 'El nombre de usuario es requerido';
      }
      if (!formData.password) {
        errors.password = 'La contraseña es requerida';
      } else if (formData.password.length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres';
      } else if (!/[a-z]/.test(formData.password)) {
        errors.password = 'La contraseña debe contener al menos una letra minúscula';
      } else if (!/[A-Z]/.test(formData.password)) {
        errors.password = 'La contraseña debe contener al menos una letra mayúscula';
      } else if (!/[0-9]/.test(formData.password)) {
        errors.password = 'La contraseña debe contener al menos un número';
      } else if (!/[^a-zA-Z0-9]/.test(formData.password)) {
        errors.password = 'La contraseña debe contener al menos un carácter especial';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
      }
      if (!formData.acceptTerms) {
        errors.acceptTerms = 'Debes aceptar los términos y condiciones';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm(currentStep);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (window.showToast) {
        window.showToast('Por favor corrige los errores en el formulario', 'error');
      }
      return;
    }

    if (currentStep === 1) {
      setIsSubmitting(true);
      
      try {
        const userData = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          username: formData.username,
          password: formData.password,
        };

        const user = await register(userData);
        
        if (user) {
          if (window.showToast) {
            window.showToast('¡Paso 1 completado! Continúa con el siguiente paso', 'success');
          }
          setCurrentStep(2);
        } else {
          // Mostrar el error específico del backend
          ;
          
          if (window.showToast) {
            window.showToast(error || 'Error en el registro', 'error');;
          } else {
            console.error('window.showToast is not available');
            // Fallback: mostrar alert
            alert(error || 'Error en el registro');
          }
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('Error de conexión', 'error');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    
    try {
      // Aquí se actualizarían los datos adicionales del usuario
      // Por ahora solo navegamos al home
      if (window.showToast) {
        window.showToast('¡Registro completado! Bienvenido a Cherry', 'success');
      }
      navigate('/');
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al guardar datos adicionales', 'error');
      }
    }
  };

  const handleSkip = () => {
    if (window.showToast) {
      window.showToast('¡Registro completado! Bienvenido a Cherry', 'success');
    }
    navigate('/');
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]
  const years = Array.from({ length: 80 }, (_, i) => 2024 - i)

  return (
    <>
      <Helmet>
        <title>Registro | Cherry Central</title>
      </Helmet>
      <div className="register-page">
        <div className="container">
          <div className="register-content">
            <div className="register-left">
              <div className="register-shopping-image">
                <img
                  src="images/AuthPages/girl-bags.png"
                  alt="Mujer con bolsas de compras"
                  className="shopping-image"
                />
              </div>
              <div className="register-benefits-section">
                <h2 className="register-benefits-title">Descubre los beneficios:</h2>
                <ul className="register-benefits-list cherry-divider">
                  <li>Te guiamos con capacitación constante.</li>
                  <li>Precios exclusivos para que incrementes tus ganancias.</li>
                  <li>Tus primeros catálogos con 50% de descuento.</li>
                  <li>Cambios o devoluciones sin preocuparte, con garantía de 30 días.</li>
                  <li>Tú decides tus horarios y donde quieres crecer tu negocio.</li>
                </ul>
              </div>
            </div>

            <div className="register-right">
              <div className="register-form-container">
                <div className="register-form-header">
                  <Link to="/">
                    <img src={getImagePath('logo.svg')} alt="Cherry" />
                  </Link>
                  {currentStep === 1 ? (
                    <>
                      <h2 className="register-subtitle">Afíliate a nosotros</h2>
                      <div className="white-divider"></div>
                    </>
                  ) : (
                    <>
                      <div style={{ marginTop: '20px' }}>
                        <h3 style={{ color: 'white', marginBottom: '10px' }}>Hola! {formData.firstName}</h3>
                        <h4 style={{ color: 'white', marginBottom: '20px' }}>Paso 2. Completa tus datos</h4>
                      </div>
                      <div className="white-divider"></div>
                    </>
                  )}
                </div>

                {currentStep === 1 ? (
                  <form onSubmit={handleSubmit} className="register-form">
                    <div className="register-form-row">
                      <div className="register-form-group">
                        <label>Nombre</label>
                        <input
                          type="text"
                          name="firstName"
                          placeholder="Tu nombre"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                        />
                        {formErrors.firstName && <span className="error-message">{formErrors.firstName}</span>}
                      </div>
                      <div className="register-form-group">
                        <label>Apellidos</label>
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Tus apellidos"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                        />
                        {formErrors.lastName && <span className="error-message">{formErrors.lastName}</span>}
                      </div>
                    </div>

                    <div className="register-form-row">
                      <div className="register-form-group">
                        <label>Correo electrónico (opcional)</label>
                        <input
                          type="email"
                          name="email"
                          placeholder="tu@email.com"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                        {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                      </div>
                      <div className="register-form-group">
                        <label>Teléfono</label>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Tu número de teléfono"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                        />
                        {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                      </div>
                    </div>

                    <div className="register-section-title" style={{ color: 'white', marginTop: '20px' }}>Usuario y contraseña</div>
                    <div className="white-divider"></div>

                    <div className="register-form-group">
                      <label>Nombre de usuario</label>
                      <input
                        type="text"
                        name="username"
                        placeholder="Tu nombre de usuario"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                      />
                      {formErrors.username && <span className="error-message">{formErrors.username}</span>}
                    </div>

                    <div className="register-form-row">
                      <div className="register-form-group">
                        <label>Contraseña</label>
                        <input
                          type="password"
                          name="password"
                          placeholder="Mínimo 8 caracteres"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          minLength="8"
                        />
                        {formErrors.password && <span className="error-message">{formErrors.password}</span>}
                      </div>
                      <div className="register-form-group">
                        <label>Confirmar contraseña</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          placeholder="Repite tu contraseña"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required
                          minLength="8"
                        />
                        {formErrors.confirmPassword && <span className="error-message">{formErrors.confirmPassword}</span>}
                      </div>
                    </div>

                    <p className="register-password-hint">
                      Tu contraseña debe tener mínimo 8 caracteres y al menos una letra y un número
                    </p>

                    <div className="register-checkbox-group">
                      <label className="register-checkbox-label">
                        <input
                          type="checkbox"
                          name="receivePromotions"
                          checked={formData.receivePromotions}
                          onChange={handleInputChange}
                        />
                        <span className="register-checkmark"></span>
                        Deseo recibir información sobre promociones
                      </label>
                    </div>

                    <div className="register-checkbox-group">
                      <label className="register-checkbox-label">
                        <input
                          type="checkbox"
                          name="acceptTerms"
                          checked={formData.acceptTerms}
                          onChange={handleInputChange}
                          required
                        />
                        <span className="checkmark"></span>
                        Acepto términos y condiciones
                      </label>
                      {formErrors.acceptTerms && <span className="error-message">{formErrors.acceptTerms}</span>}
                    </div>

                    <div className="register-button-container">
                      <CustomButton
                        variant="filled"
                        size='medium'
                        type="submit"
                        disabled={isSubmitting || loading}
                        iconRight={<img src={getIconPath('White Chevron Right.svg')} alt="crear cuenta" style={{ width: 16, height: 16 }} />}>
                        <span className="register-submit-button">
                          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
                        </span>
                      </CustomButton>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleStep2Submit} className="register-form">

                    <div className="register-form-group">
                      <label>Fecha de nacimiento</label>
                      <div className="register-date-selectors">
                        <select name="day" value={formData.day} onChange={handleInputChange}>
                          {days.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                        <select name="month" value={formData.month} onChange={handleInputChange}>
                          {months.map((month) => (
                            <option key={month} value={month}>
                              {month}
                            </option>
                          ))}
                        </select>
                        <select name="year" value={formData.year} onChange={handleInputChange}>
                          {years.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="register-section-title">Datos de dirección</div>
                    <div className="white-divider"></div>

                    <div className="register-form-row">
                      <div className="register-form-group">
                        <label>Ciudad</label>
                        <input
                          type="text"
                          name="city"
                          placeholder="Tu ciudad"
                          value={formData.city}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="register-form-group">
                        <label>Estado</label>
                        <input
                          type="text"
                          name="state"
                          placeholder="Tu estado"
                          value={formData.state}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="register-form-row">
                      <div className="register-form-group">
                        <label>Código postal</label>
                        <input
                          type="text"
                          name="postalCode"
                          placeholder="Tu código postal"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="register-form-group">
                        <label>Calle</label>
                        <input
                          type="text"
                          name="street"
                          placeholder="Tu dirección"
                          value={formData.street}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="register-button-container" style={{ display: 'flex', gap: '10px' }}>
                      <CustomButton
                        variant="filled"
                        size='medium'
                        type="submit"
                        style={{ flex: 1 }}>
                        <span className="register-submit-button">
                          Guardar
                        </span>
                      </CustomButton>
                      <CustomButton
                        variant="filled"
                        size='medium'
                        type="button"
                        onClick={handleSkip}
                        style={{ flex: 1 }}>
                        <span className="register-submit-button">
                          Omitir
                        </span>
                      </CustomButton>
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

export default RegisterPage; 
