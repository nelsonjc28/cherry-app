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
    password: "",
    confirmPassword: "",
    day: "1",
    month: "Enero",
    year: "1986",
    city: "",
    state: "",
    municipality: "",
    postalCode: "",
    street: "",
    country: "México",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [settlements, setSettlements] = useState([]);
  const [loadingPostalCode, setLoadingPostalCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Si cambia el código postal y tiene 5 dígitos, consultar SEPOMEX
    if (name === 'postalCode') {
      if (value.length === 5) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
        fetchPostalCodeData(value);
      } else if (value.length < 5) {
        // Limpiar campos si el código postal es incompleto
        setSettlements([]);
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          state: '',
          municipality: '',
          city: '',
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
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

  // Función para consultar datos del código postal
  const fetchPostalCodeData = async (postalCode) => {
    if (!postalCode || postalCode.length !== 5) return;

    setLoadingPostalCode(true);
    try {
      const response = await fetch(`https://sepomex.789.com.mx/${postalCode}`);

      if (!response.ok) {
        throw new Error('Código postal no encontrado');
      }

      const data = await response.json();

      if (data && data.asentamientos && data.asentamientos.length > 0) {
        // Guardar lista de asentamientos
        setSettlements(data.asentamientos);

        // Auto-llenar estado y municipio
        setFormData(prev => ({
          ...prev,
          state: data.estados && data.estados.length > 0 ? data.estados[0] : '',
          municipality: data.municipios && data.municipios.length > 0 ? data.municipios[0] : '',
          city: data.asentamientos[0] || '', // Seleccionar el primer asentamiento por defecto
          country: 'México'
        }));
      } else {
        // Si no hay datos, limpiar
        setSettlements([]);
        if (window.showToast) {
          window.showToast('Código postal no encontrado', 'error');
        }
      }
    } catch (error) {
      setSettlements([]);
      if (window.showToast) {
        window.showToast('Error al consultar código postal', 'error');
      }
    } finally {
      setLoadingPostalCode(false);
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
      if (!formData.email.trim()) {
        errors.email = 'El correo electrónico es requerido';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = 'El correo electrónico no es válido';
      }
      if (!formData.phone.trim()) {
        errors.phone = 'El teléfono es requerido';
      } else if (!/^[0-9]{10}$/.test(formData.phone)) {
        errors.phone = 'El teléfono debe tener exactamente 10 dígitos numéricos';
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
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
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
          password: formData.password,
        };

        const user = await register(userData);

        if (user) {
          if (window.showToast) {
            window.showToast('¡Registro completado! Bienvenido a Cherry', 'success');
            navigate('/')

          }
          setCurrentStep(2);
        }
        // Los errores ya se muestran automáticamente en el userStore
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
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        if (window.showToast) {
          window.showToast('No hay sesión activa', 'error');
        }
        navigate('/login');
        return;
      }

      // Preparar datos para enviar al backend
      const profileData = {
        birth_day: parseInt(formData.day),
        birth_month: formData.month,
        birth_year: parseInt(formData.year),
        street: formData.street,
        city: formData.city,
        municipality: formData.municipality,
        state: formData.state,
        postal_code: formData.postalCode,
        country: formData.country,
      };

      const response = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Mostrar errores de validación
        if (data.errors) {
          Object.keys(data.errors).forEach(key => {
            const fieldErrors = data.errors[key];
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach(error => {
                if (window.showToast) {
                  window.showToast(error, 'error', 4000);
                }
              });
            } else {
              if (window.showToast) {
                window.showToast(fieldErrors, 'error', 4000);
              }
            }
          });
        } else if (data.error) {
          if (window.showToast) {
            window.showToast(data.error, 'error');
          }
        }
        return;
      }

      // Éxito
      if (window.showToast) {
        window.showToast('¡Registro completado! Bienvenido a Cherry', 'success');
      }

      // Actualizar el usuario en el store
      const { fetchUser } = useUserStore.getState();
      await fetchUser();

      navigate('/');
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al guardar datos adicionales', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (window.showToast) {
      window.showToast('¡Registro completado! Bienvenido a Cherry', 'success');
      navigate('/')
    }
    navigate('/');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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

                {/* {currentStep === 1 ? ( */}

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
                      <label>Teléfono</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="10 dígitos"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        pattern="[0-9]{10}"
                        maxLength="10"
                        onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                      />
                      {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                    </div>
                    <div className="register-form-group">
                      <label>Correo electrónico</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="tu@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                      {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                    </div>
                  </div>

                  <div className="register-section-title" style={{ color: 'white', marginTop: '20px' }}>Contraseña</div>
                  <div className="white-divider"></div>

                  <div className="register-form-row">
                    <div className="register-form-group">
                      <label>Contraseña</label>
                      <div className="login-input-container">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Mínimo 8 caracteres"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          minLength="8"
                        />
                        <button
                          type="button"
                          className={`login-password-toggle ${showPassword ? 'active' : ''}`}
                          onClick={togglePasswordVisibility}
                        >
                          <img
                            src={getIconPath('Eye.svg')}
                            alt={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          />
                        </button>
                      </div>
                      {formErrors.password && <span className="error-message">{formErrors.password}</span>}
                    </div>
                    <div className="register-form-group">
                      <label>Confirmar contraseña</label>
                      <div className="login-input-container">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Repite tu contraseña"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required
                          minLength="8"
                        />
                        <button
                          type="button"
                          className={`login-password-toggle ${showConfirmPassword ? 'active' : ''}`}
                          onClick={toggleConfirmPasswordVisibility}
                        >
                          <img
                            src={getIconPath('Eye.svg')}
                            alt={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          />
                        </button>
                      </div>
                      {formErrors.confirmPassword && <span className="error-message">{formErrors.confirmPassword}</span>}
                    </div>
                  </div>

                  <p className="register-password-hint">
                    Tu contraseña debe tener mínimo 8 caracteres y al menos una letra y un número
                  </p>

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
                    <p className="register-terms-text">
                      Al registrarte aceptas términos y condiciones
                    </p>
                  </div>
                </form>
                {/* ) }  : (
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
                        <label>Código postal</label>
                        <input
                          type="text"
                          name="postalCode"
                          placeholder="Código Postal (5 dígitos)"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          maxLength="5"
                        />
                        {loadingPostalCode && <small style={{color: '#666'}}>Consultando...</small>}
                      </div>
                      <div className="register-form-group">
                        <label>Calle y Número</label>
                        <input
                          type="text"
                          name="street"
                          placeholder="Tu calle y número"
                          value={formData.street}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="register-form-row">
                      <div className="register-form-group">
                        <label>Colonia/Asentamiento</label>
                        {settlements.length > 0 ? (
                          <select
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              fontSize: '14px',
                              backgroundColor: '#fff'
                            }}
                          >
                            <option value="">Selecciona una colonia</option>
                            {settlements.map((settlement, index) => (
                              <option key={index} value={settlement}>{settlement}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            name="city"
                            placeholder="Ingresa código postal primero"
                            value={formData.city}
                            onChange={handleInputChange}
                            disabled
                            style={{
                              backgroundColor: '#f5f5f5',
                              color: '#666',
                              cursor: 'not-allowed'
                            }}
                          />
                        )}
                      </div>
                      <div className="register-form-group">
                        <label>Municipio</label>
                        <input
                          type="text"
                          name="municipality"
                          placeholder="Se llenará automáticamente"
                          value={formData.municipality}
                          readOnly
                          style={{
                            backgroundColor: '#f5f5f5',
                            color: '#666',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                    </div>

                    <div className="register-form-row">
                      <div className="register-form-group">
                        <label>Estado</label>
                        <input
                          type="text"
                          name="state"
                          placeholder="Se llenará automáticamente"
                          value={formData.state}
                          readOnly
                          style={{
                            backgroundColor: '#f5f5f5',
                            color: '#666',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                      <div className="register-form-group">
                        <label>País</label>
                        <input
                          type="text"
                          name="country"
                          value={formData.country}
                          readOnly
                          style={{
                            backgroundColor: '#f5f5f5',
                            color: '#666',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                    </div>

                    <div className="register-button-container" style={{ display: 'flex', gap: '10px' }}>
                      <CustomButton
                        variant="filled"
                        size='medium'
                        type="submit"
                        disabled={isSubmitting}
                        style={{ flex: 1 }}>
                        <span className="register-submit-button">
                          {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </span>
                      </CustomButton>
                      <CustomButton
                        variant="filled"
                        size='medium'
                        type="button"
                        onClick={handleSkip}
                        disabled={isSubmitting}
                        style={{ flex: 1 }}>
                        <span className="register-submit-button">
                          Omitir
                        </span>
                      </CustomButton>
                    </div>
                  </form>
                {/* )} */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage; 
