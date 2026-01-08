import { useState, useEffect } from 'react';
import CherryButton from '../../components/CherryButton/CherryButton';
import AccountStatementModal from '../../components/AccountStatementModal/AccountStatementModal';
import useUserStore from '../../store/userStore';
import { getIconPath } from '../../utils/assetPaths';
import './PersonalData.css';

const PersonalData = () => {
  const { user, updateProfile, fetchUser } = useUserStore();
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDay: '',
    birthMonth: '',
    birthYear: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showAccountStatementModal, setShowAccountStatementModal] = useState(false);

  // Cargar datos del usuario cuando el componente se monta
  useEffect(() => {
    const loadUserData = async () => {
      // Si no hay usuario, intentar cargarlo
      if (!user) {
        await fetchUser();
      }
    };

    loadUserData();
  }, []); // Solo se ejecuta una vez al montar el componente

  // Actualizar userData cuando el usuario cambie
  useEffect(() => {
    if (user) {
      setUserData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        birthDay: user.birth_day || '',
        birthMonth: user.birth_month || '',
        birthYear: user.birth_year || ''
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setUserData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Si se cambia el mes o año, ajustar el día si es necesario
      if (field === 'birthMonth' || field === 'birthYear') {
        const availableDays = getDaysInMonth(newData.birthMonth, newData.birthYear);
        if (newData.birthDay && !availableDays.includes(parseInt(newData.birthDay))) {
          newData.birthDay = '';
        }
      }
      
      return newData;
    });
    
    // Limpiar mensaje cuando el usuario empiece a escribir
    if (message) setMessage('');
  };

  const handleSave = async () => {
    if (!user) {
      if (window.showToast) {
        window.showToast('Debes iniciar sesión para actualizar tu perfil', 'error');
      }
      return;
    }

    // Validar teléfono (debe tener exactamente 10 dígitos)
    if (userData.phone && !/^[0-9]{10}$/.test(userData.phone.replace(/[\s()-]/g, ''))) {
      if (window.showToast) {
        window.showToast('El teléfono debe tener exactamente 10 dígitos', 'error');
      }
      setMessage('El teléfono debe tener exactamente 10 dígitos');
      return;
    }

    // Validar que se haya seleccionado una fecha de nacimiento completa
    if (userData.birthDay && userData.birthMonth && userData.birthYear) {
      if (!isUserAdult(userData.birthDay, userData.birthMonth, userData.birthYear)) {
        if (window.showToast) {
          window.showToast('Debes ser mayor de edad para usar esta plataforma', 'error');
        }
        setMessage('Debes ser mayor de edad para usar esta plataforma');
        return;
      }
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        },
        body: JSON.stringify({
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          birth_day: userData.birthDay,
          birth_month: userData.birthMonth,
          birth_year: userData.birthYear
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (window.showToast) {
          window.showToast('Perfil actualizado correctamente', 'success');
        }
        setMessage('Perfil actualizado correctamente');
        
        // Actualizar el store local
        if (updateProfile) {
          updateProfile(data.user);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el perfil');
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al actualizar el perfil';
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
      setMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Función para obtener los días del mes según el mes y año seleccionados
  const getDaysInMonth = (month, year) => {
    if (!month || !year) return Array.from({ length: 31 }, (_, i) => i + 1);
    
    const monthIndex = months.findIndex(m => m === month);
    if (monthIndex === -1) return Array.from({ length: 31 }, (_, i) => i + 1);
    
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // Función para validar que el usuario sea mayor de edad
  const isUserAdult = (day, month, year) => {
    if (!day || !month || !year) return true;
    
    const birthDate = new Date(year, months.findIndex(m => m === month), day);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    
    return age >= 18;
  };

  // Obtener días disponibles según el mes y año seleccionados
  const availableDays = getDaysInMonth(userData.birthMonth, userData.birthYear);

  // Años disponibles (usuarios deben ser mayores de edad)
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100; // Máximo 100 años
  const maxYear = currentYear - 18;  // Mínimo 18 años
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  return (
    <div className="personal-data">
      <div className="personal-data__header">
        <h1 className="personal-data__title">Datos Personales</h1>
      </div>

      <div className="personal-data__form">
        <div className="personal-data__row">
          <div className="personal-data__field">
            <label className="personal-data__label">Nombre</label>
            <input
              type="text"
              className="personal-data__input"
              value={userData.firstName}
              placeholder="Alejandro"
              onChange={(e) => handleInputChange('firstName', e.target.value)}
            />
          </div>

          <div className="personal-data__field">
            <label className="personal-data__label">Apellidos</label>
            <input
              type="text"
              className="personal-data__input"
              value={userData.lastName}
              placeholder="Valera"
              onChange={(e) => handleInputChange('lastName', e.target.value)}
            />
          </div>
        </div>

        <div className="personal-data__row">
          <div className="personal-data__field">
            <label className="personal-data__label">Correo electrónico</label>
            <input
              type="email"
              className="personal-data__input"
              value={userData.email}
              placeholder="Marcos_Schinner50@hotmail.com"
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          <div className="personal-data__field">
            <label className="personal-data__label">Teléfono</label>
            <input
              type="tel"
              className="personal-data__input"
              value={userData.phone}
              placeholder="10 dígitos"
              pattern="[0-9]{10}"
              maxLength="10"
              required
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length > 10) {
                  e.target.value = e.target.value.slice(0, 10);
                }
              }}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                handleInputChange('phone', value);
              }}
            />
            {userData.phone && userData.phone.length !== 10 && (
              <span className="error-message" style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                El teléfono debe tener exactamente 10 dígitos
              </span>
            )}
          </div>
        </div>

        <div className="personal-data__row personal-data__row-flex">
          <div className="personal-data__field">
            <label className="personal-data__label">Día</label>
            <select
              className="personal-data__select"
              value={userData.birthDay}
              onChange={(e) => handleInputChange('birthDay', e.target.value)}
              required
            >
              <option value="" disabled>Selecciona un día</option>
              {availableDays.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div className="personal-data__field">
            <label className="personal-data__label">Mes</label>
            <select
              className="personal-data__select"
              value={userData.birthMonth}
              onChange={(e) => handleInputChange('birthMonth', e.target.value)}
              required
            >
              <option value="" disabled>Selecciona un mes</option>
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div className="personal-data__field">
            <label className="personal-data__label">Año</label>
            <select
              className="personal-data__select"
              value={userData.birthYear}
              onChange={(e) => handleInputChange('birthYear', e.target.value)}
              required
            >
              <option value="" disabled>Selecciona un año</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {message && (
        <div className={`personal-data__message ${message.includes('correctamente') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Información de categoría y crédito */}
      {user && (
        <div className="personal-data__info-section">
          <div className="personal-data__info-row">
            <div className="personal-data__info-item">
              <span className="personal-data__info-label">Categoría:</span>
              <span className={`personal-data__info-value personal-data__info-value--category personal-data__info-value--${user.seller_category || 'bronce'}`}>
                {user.seller_category === 'oro' ? '🥇 Oro' : '🥉 Bronce'}
              </span>
            </div>
            <div className="personal-data__info-item">
              <span className="personal-data__info-label">Límite de crédito:</span>
              <span className="personal-data__info-value">
                ${user.credit_limit ? parseFloat(user.credit_limit).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
            <div className="personal-data__info-item">
              <span className="personal-data__info-label">Crédito disponible:</span>
              <span className="personal-data__info-value">
                ${user.credit_balance ? parseFloat(user.credit_balance).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Estados de Cuenta */}
      <div className="personal-data__account-section">
        <h2 className="personal-data__section-title">Estados de Cuenta</h2>
        <p className="personal-data__section-description">
          Consulta el historial de tus pagos y saldos pendientes
        </p>
        <CherryButton
          variant="outline"
          onClick={() => setShowAccountStatementModal(true)}
          className="personal-data__account-button"
        >
          Ver Estados de Cuenta
        </CherryButton>
      </div>

      <div className="personal-data__actions">
        <CherryButton
          variant="red"
          onClick={handleSave}
          disabled={isSubmitting}
          className="cherry-button--edit-changes"
          icon={
            <img src={getIconPath('Edit.svg')} alt="Editar" />
          }
          iconPosition="right"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </CherryButton>
      </div>

      {/* Modal de Estados de Cuenta */}
      {showAccountStatementModal && (
        <AccountStatementModal
          isOpen={showAccountStatementModal}
          onClose={() => setShowAccountStatementModal(false)}
          userId={null}
        />
      )}
    </div>
  );
};

export default PersonalData;
