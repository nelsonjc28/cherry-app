import { Helmet } from 'react-helmet-async';
import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "./RegisterPage.css";
import { getIconPath } from '../../utils/assetPaths';
import CustomButton from '../../components/CustomButton';
import useUserStore from '../../store/userStore';
import TestimonialsSlider from '../../components/TestimonialsSlider/TestimonialsSlider';
import AffiliateFaq from '../../components/AffiliateFaq/AffiliateFaq';
import { publicAffiliateContentService } from '../../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading, error } = useUserStore();
  const firstNameInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [affiliateBanner, setAffiliateBanner] = useState(null);
  const [affiliateSeason, setAffiliateSeason] = useState(null);
  const [affiliateTrends, setAffiliateTrends] = useState([]);
  const [promoBanners, setPromoBanners] = useState([]);
  const [bottomBanner, setBottomBanner] = useState(null);
  const [affiliateFaqs, setAffiliateFaqs] = useState([]);

  useEffect(() => {
    let mounted = true;

    publicAffiliateContentService.getAll()
      .then((response) => {
        if (mounted) {
          setAffiliateBanner(response.data?.data?.banner || null);
          setAffiliateSeason(response.data?.data?.season || null);
          setAffiliateTrends(response.data?.data?.trends || []);
          setPromoBanners(response.data?.data?.promo_banners || []);
          setBottomBanner(response.data?.data?.bottom_banner || null);
          setAffiliateFaqs(response.data?.data?.faqs || []);
        }
      })
      .catch(() => {
        if (mounted) {
          setAffiliateBanner(null);
          setAffiliateSeason(null);
          setAffiliateTrends([]);
          setPromoBanners([]);
          setBottomBanner(null);
          setAffiliateFaqs([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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

      {/* Banner de Afiliación */}
      <section className="register-banner" aria-label="Banner de afiliación">
        <div className="register-banner__image">
          <img
            src={affiliateBanner?.image_path ? `/${affiliateBanner.image_path}` : `${window.location.origin}/images/AuthPages/register-banner-girl.png`}
            alt={affiliateBanner?.title || 'Affiliate Girl'}
          />
        </div>

        <div className="register-banner__content">
          <h2 id="register-banner-heading" className="register-banner__title">
            {affiliateBanner?.title || 'El momento es hoy: sé tu propia jefa, emprende con Cherry y transforma tu futuro'}
          </h2>
          {affiliateBanner?.subtitle && <p className="register-banner__subtitle">{affiliateBanner.subtitle}</p>}
          <a
            href={affiliateBanner?.button_url || '#registro-form'}
            className="register-banner__btn"
            target={affiliateBanner?.button_url?.match(/^https?:\/\//i) ? '_blank' : undefined}
            rel={affiliateBanner?.button_url?.match(/^https?:\/\//i) ? 'noreferrer' : undefined}
            aria-label={affiliateBanner?.button_text || 'Afiliate a Cherry Central y comienza tu negocio'}
          >
            {affiliateBanner?.button_text || 'Afiliate ahora'}
            <svg width="5" height="9" viewBox="0 0 5 9" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.86328 4.39453C4.99349 4.26432 4.99349 4.08203 4.86328 3.95182L1.0612 0.0976563C0.93099 -0.0325521 0.722656 -0.0325521 0.61849 0.0976563L0.0976562 0.61849C-0.0325521 0.722656 -0.0325521 0.93099 0.0976562 1.0612L3.17057 4.16016L0.0976562 7.28516C-0.0325521 7.41536 -0.0325521 7.59766 0.0976562 7.72786L0.61849 8.2487C0.722656 8.37891 0.93099 8.37891 1.0612 8.2487L4.86328 4.39453Z" fill="#F5F5FF" />
            </svg>
          </a>
        </div>

      </section>

      <section className="register-quick-benefits" aria-label="Beneficios de afiliación">
        <div className="register-quick-benefits__grid">
          <img
            src="/icons/benefits/icono-registro.png"
            alt="Registro 100% gratuito"
            className="register-quick-benefits__icon"
          />
          <img
            src="/icons/benefits/icono-envio.png"
            alt="Envíos a toda la República"
            className="register-quick-benefits__icon"
          />
          <img
            src="/icons/benefits/icono-precios.png"
            alt="Precios de mayoreo"
            className="register-quick-benefits__icon"
          />
          <img
            src="/icons/benefits/icono-catalogos.png"
            alt="Catálogo digital"
            className="register-quick-benefits__icon"
          />
        </div>
      </section>

      <section className="register-intro" aria-labelledby="register-intro-heading">
        <h2 id="register-intro-heading">
          Vende ropa de moda desde tu celular. Cherry se encarga de todo lo demás.
        </h2>
      </section>

      <TestimonialsSlider />

      {/* Sección ¿Cómo funciona? */}
      <section className="how-it-works">
        <div className="how-it-works__container">
          <h2 className="how-it-works__title">¿Cómo funciona?</h2>

          <div className="how-it-works__steps">
            <div className="how-it-works__step">
              <div className="how-it-works__number">
                <span>1</span>
              </div>
              <div className="how-it-works__title-wrapper">
                {/* <div className="how-it-works__icon">
                  <img src={getIconPath('Share Alt.svg')} alt="Compartir" />
                </div> */}
                <h3 className="how-it-works__step-title">Regístrate y comparte</h3>
              </div>
              <p className="how-it-works__step-description">
                Únete a Cherry y comienza a ofrecer nuestros catálogos a tus clientes.
              </p>
            </div>

            <div className="how-it-works__step">
              <div className="how-it-works__number">
                <span>2</span>
              </div>
              <div className="how-it-works__title-wrapper">
                {/* <div className="how-it-works__icon">
                  <img src={getIconPath('Shopping Cart.svg')} alt="Carrito de compras" />
                </div> */}
                <h3 className="how-it-works__step-title">Haz tu pedido</h3>
              </div>
              <p className="how-it-works__step-description">
                Selecciona los modelos que te pidan y compra a precio especial.
              </p>
            </div>

            <div className="how-it-works__step">
              <div className="how-it-works__number">
                <span>3</span>
              </div>
              <div className="how-it-works__title-wrapper">
                {/* <div className="how-it-works__icon">
                  <img src={getIconPath('Clock.svg')} alt="Reloj" />
                </div> */}
                <h3 className="how-it-works__step-title">Recibe y gana</h3>
              </div>
              <p className="how-it-works__step-description">
                Entrega tu mercancía y empieza a generar tus propias ganancias.
              </p>
            </div>
          </div>
        </div>
      </section>

      {affiliateSeason && (
        <section className="register-season" aria-labelledby="register-season-heading">
          <div className="register-season__container">
            <h2 id="register-season-heading" className="register-season__title">
              {affiliateSeason.title}
            </h2>

            {(affiliateSeason.image_path || affiliateSeason.catalog?.image_url) && (
              <a href="/catalogos" className="register-season__catalog-link">
                <img
                  src={affiliateSeason.image_path ? `/${affiliateSeason.image_path}` : affiliateSeason.catalog.image_url}
                  alt={affiliateSeason.catalog?.name || affiliateSeason.title}
                  className="register-season__catalog-image"
                />
              </a>
            )}

          </div>
        </section>
      )}

      {affiliateTrends.length > 0 && (
        <section className="register-season register-trends" aria-labelledby="register-trends-heading">
          <div className="register-season__container">
            <h2 id="register-trends-heading" className="register-season__title">Tendencias</h2>
            <div className="register-season__grid">
              {affiliateTrends.map((trend) => (
                <a className="register-season__card" key={trend.id} href={trend.button_url}>
                  <img src={`/${trend.image_path}`} alt={trend.title} className="register-season__card-image" />
                  <span className="register-season__card-label">{trend.title}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sección del Formulario de Registro */}
      <div className="register-page-form">
              <div className="register-form-container">
                <div className="register-form-header">
                  {currentStep === 1 ? (
                    <h2 className="register-subtitle">Afíliate</h2>
                  ) : (
                    <div style={{ marginTop: '20px' }}>
                      <h3 style={{ color: 'white', marginBottom: '10px' }}>Hola! {formData.firstName}</h3>
                      <h4 style={{ color: 'white', marginBottom: '20px' }}>Paso 2. Completa tus datos</h4>
                    </div>
                  )}
                </div>

                {/* {currentStep === 1 ? ( */}

                <form onSubmit={handleSubmit} className="register-form">
                  <div className="register-form-row">
                    <div className="register-form-group">
                      <label htmlFor="firstName">Nombre</label>
                      <input
                        ref={firstNameInputRef}
                        id="firstName"
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
                      <label htmlFor="lastName">Apellidos</label>
                      <input
                        id="lastName"
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
                      <label htmlFor="phone">Teléfono</label>
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        placeholder="10 dígitos"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        pattern="[0-9]{10}"
                        maxLength="10"
                        onInput={(e) => {
                          e.target.value = e.target.value.replace(/[^0-9]/g, '');
                          if (e.target.value.length > 10) {
                            e.target.value = e.target.value.slice(0, 10);
                          }
                        }}
                      />
                      {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                    </div>
                    <div className="register-form-group">
                      <label htmlFor="email">Correo electrónico</label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="tu @email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                      {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                    </div>
                  </div>

                  <div className="register-form-row">
                    <div className="register-form-group">
                      <label htmlFor="password">Contraseña</label>
                      <div className="login-input-container">
                        <input
                          id="password"
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
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                      <label htmlFor="confirmPassword">Confirmar contraseña</label>
                      <div className="login-input-container">
                        <input
                          id="confirmPassword"
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
                          aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                    Tu contraseña debe tener un mínimo de 8 caracteres y al menos una letra y un número
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

      {/* Banners Promocionales */}
      {promoBanners.length > 0 && (
        <section className="register-promo-banners" style={{ padding: '0 20px', maxWidth: 900, margin: '0 auto' }}>
          {promoBanners.map((banner) => (
            <a
              key={banner.id}
              href={banner.button_url || '#'}
              className="affiliate-promo-banner"
              style={{ marginBottom: 16, display: 'block' }}
              target={banner.button_url?.match(/^https?:\/\//i) ? '_blank' : undefined}
              rel={banner.button_url?.match(/^https?:\/\//i) ? 'noreferrer' : undefined}
            >
              <img
                className="affiliate-promo-banner__image"
                src={banner.image_path ? `/${banner.image_path}` : `${window.location.origin}/images/AuthPages/phone-banner.png`}
                alt="Promo Banner"
              />
            </a>
          ))}
        </section>
      )}

      <AffiliateFaq faqs={affiliateFaqs} bottomBanner={bottomBanner} />
    </>
  );
};

export default RegisterPage; 
