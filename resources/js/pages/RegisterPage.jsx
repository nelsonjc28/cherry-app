import { Helmet } from 'react-helmet-async';
import RegisterForm from '../../components/AuthForms/RegisterForm';
import { useState } from "react"
import "./RegisterPage.css"
import { getIconPath, getImagePath } from '../../utils/assetPaths';
import { Link } from 'react-router-dom';
import CustomButton from '../../components/CustomButton';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    day: "1",
    month: "Enero",
    year: "1986",
    city: "",
    state: "",
    postalCode: "",
    street: "",
    password: "",
    confirmPassword: "",
    receivePromotions: false,
    acceptTerms: false,
  })

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

  }

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
                    <img src={getImagePath('white-logo.svg')} alt="Cherry" />
                  </Link>
                  <h2 className="register-subtitle">Afíliate a nosotros</h2>
                </div>
                <div className="white-divider"></div>

                <form onSubmit={handleSubmit} className="register-form">
                  <div className="register-form-row">
                    <div className="register-form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="Placeholder"
                        value={formData.firstName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="register-form-group">
                      <label>Apellidos</label>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Placeholder"
                        value={formData.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="register-form-row">
                    <div className="register-form-group">
                      <label>Correo electrónico</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="Placeholder"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="register-form-group">
                      <label>Teléfono</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Placeholder"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

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
                        placeholder="Placeholder"
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="register-form-group">
                      <label>Estado</label>
                      <input
                        type="text"
                        name="state"
                        placeholder="Placeholder"
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
                        placeholder="Placeholder"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="register-form-group">
                      <label>Calle</label>
                      <input
                        type="text"
                        name="street"
                        placeholder="Placeholder"
                        value={formData.street}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="register-section-title">Contraseña y seguridad</div>
                  <div className="white-divider"></div>

                  <div className="register-form-row">
                    <div className="register-form-group">
                      <label>Contraseña</label>
                      <input
                        type="password"
                        name="password"
                        placeholder="Placeholder"
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="register-form-group">
                      <label>Confirmar contraseña</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Placeholder"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                      />
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
                      />
                      <span className="checkmark"></span>
                      Acepto términos y condiciones
                    </label>
                  </div>

                  <div className="register-button-container">
                    <CustomButton
                      variant="filled"
                      size='medium'
                      iconRight={<img src={getIconPath('White Chevron Right.svg')} alt="crear cuenta" style={{ width: 16, height: 16 }} />}>
                      <span className="register-submit-button">Crear cuenta</span>
                    </CustomButton>
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

export default RegisterPage; 
