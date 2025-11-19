import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../config/axios';
import './PaymentMethods.css';
import CherryButton from '../../components/CherryButton/CherryButton';
import { getIconPath } from '../../utils/assetPaths';
import useUserStore from '../../store/userStore';

const PaymentMethods = () => {
  // Obtener token y usuario del store
  const { token, user } = useUserStore();

  // State for dropdown menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // State for selected payment method
  const [selectedMethodId, setSelectedMethodId] = useState(null);

  // State for modal
  const [showAddModal, setShowAddModal] = useState(false);

  // State for form
  const [formData, setFormData] = useState({
    cardholder_name: '',
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    brand: 'visa',
    card_type: 'credit',
    is_default: false
  });

  // State for payment methods from API
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load payment methods from API
  useEffect(() => {
    if (token) {
      loadPaymentMethods();
    } else {
      setLoading(false);
      setError('No hay token de autenticación');
    }
  }, [token]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('No hay token de autenticación');
        setLoading(false);
        return;
      }

      const response = await api.get('/payment-cards');
      setPaymentMethods(response.data.cards || []);
      setError(null);
    } catch (error) {
      
      if (error.response?.status === 401) {
        setError('Token de autenticación expirado o inválido');
        if (window.showToast) {
          window.showToast('Token de autenticación expirado o inválido. Por favor, inicia sesión nuevamente.', 'error');
        }
      } else {
        const errorMessage = error.response?.data?.message || 'Error al cargar métodos de pago';
        setError(errorMessage);
        if (window.showToast) {
          window.showToast(errorMessage, 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle card number formatting
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Solo números
    value = value.replace(/(\d{4})/g, '$1 ').trim(); // Agregar espacios cada 4 dígitos
    setFormData(prev => ({ ...prev, card_number: value }));
  };

  // Handle expiry month formatting
  const handleExpiryMonthChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value > 12) value = '12';
    if (value < 1) value = '01';
    setFormData(prev => ({ ...prev, expiry_month: value.padStart(2, '0') }));
  };

  // Handle expiry year formatting
  const handleExpiryYearChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length === 2) {
      value = '20' + value;
    }
    setFormData(prev => ({ ...prev, expiry_year: value }));
  };

  // Handle CVV formatting
  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cvv: value }));
  };

  // Handle add new payment method
  const handleAddPaymentMethod = () => {
    if (!token) {
      if (window.showToast) {
        window.showToast('No hay token de autenticación. Por favor, inicia sesión nuevamente.', 'error');
      }
      return;
    }
    
    setFormData({
      cardholder_name: '',
      card_number: '',
      expiry_month: '',
      expiry_year: '',
      cvv: '',
      brand: 'visa',
      card_type: 'credit',
      is_default: false
    });
    setShowAddModal(true);
  };

  // Handle save payment method
  const handleSavePaymentMethod = async () => {
    try {
      // Validate required fields
      if (!formData.cardholder_name || !formData.card_number || !formData.expiry_month || 
          !formData.expiry_year || !formData.cvv) {
        if (window.showToast) {
          window.showToast('Por favor completa todos los campos requeridos', 'warning', 7000);
        }
        return;
      }

      if (!token) {
        if (window.showToast) {
          window.showToast('No hay token de autenticación. Por favor, inicia sesión nuevamente.', 'error');
        }
        return;
      }

      // Clean card number (remove spaces)
      const cleanCardNumber = formData.card_number.replace(/\s/g, '');
      
      // Validate card number length
      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        if (window.showToast) {
          window.showToast('Número de tarjeta inválido', 'warning', 7000);
        }
        return;
      }

      // Validate CVV length
      if (formData.cvv.length < 3 || formData.cvv.length > 4) {
        if (window.showToast) {
          window.showToast('CVV inválido', 'warning', 7000);
        }
        return;
      }

      // Validate expiry date
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(formData.expiry_year) < currentYear || 
          (parseInt(formData.expiry_year) === currentYear && parseInt(formData.expiry_month) < currentMonth)) {
        if (window.showToast) {
          window.showToast('La tarjeta está expirada', 'warning', 7000);
        }
        return;
      }

      // Prepare data for API
      const cardData = {
        ...formData,
        card_number: cleanCardNumber
      };

      // Create payment method
      await api.post('/payment-cards', cardData);

      // Close modal
      setShowAddModal(false);
      
      // Reload payment methods
      await loadPaymentMethods();
      
      // Show success message with longer duration
      if (window.showToast) {
        window.showToast('Método de pago agregado correctamente', 'success', 8000);
      }
    } catch (error) {
      
      if (error.response?.status === 401) {
        if (window.showToast) {
          window.showToast('Token de autenticación expirado o inválido. Por favor, inicia sesión nuevamente.', 'error');
        }
      } else {
        const errorMessage = error.response?.data?.message || 'Error al guardar el método de pago';
        if (window.showToast) {
          window.showToast(errorMessage, 'error');
        }
      }
    }
  };

  // Handle menu toggle
  const handleMenuToggle = (methodId) => {
    setOpenMenuId(openMenuId === methodId ? null : methodId);
  };

  // Handle payment method selection
  const handleMethodSelect = (methodId) => {
    setSelectedMethodId(selectedMethodId === methodId ? null : methodId);
  };

  // Handle menu actions
  const handleMenuAction = async (methodId, action) => {
    if (action === 'setDefault') {
      try {
        await api.patch(`/payment-cards/${methodId}/set-default`);
        await loadPaymentMethods();
        
        if (window.showToast) {
          window.showToast('Método de pago marcado como predeterminado', 'success', 6000);
        }
      } catch (error) {
        if (window.showToast) {
          window.showToast('Error al marcar como predeterminado', 'error');
        }
      }
    } else if (action === 'delete') {
      // Show confirmation with SweetAlert2
      const result = await Swal.fire({
        title: '¿Eliminar método de pago?',
        html: `
          <div class="text-center">
            <p>¿Estás seguro de que quieres eliminar este método de pago?</p>
            <p class="text-muted small">Esta acción no se puede deshacer.</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        focusCancel: true
      });

      if (result.isConfirmed) {
        try {
          // Show loading
          Swal.fire({
            title: 'Eliminando...',
            text: 'Por favor espera mientras se elimina el método de pago',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          await api.delete(`/payment-cards/${methodId}`);
          await loadPaymentMethods();
          
          // Close loading and show success
          Swal.fire({
            title: '¡Eliminado!',
            text: 'El método de pago ha sido eliminado correctamente',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });

          if (window.showToast) {
            window.showToast('Método de pago eliminado correctamente', 'success', 6000);
          }
        } catch (error) {
          
          // Close loading and show error
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el método de pago',
            icon: 'error',
            confirmButtonText: 'Entendido'
          });
          
          if (error.response?.status === 401) {
            if (window.showToast) {
              window.showToast('Token de autenticación expirado o inválido. Por favor, inicia sesión nuevamente.', 'error');
            }
          } else {
            const errorMessage = error.response?.data?.message || 'Error al eliminar el método de pago';
            if (window.showToast) {
              window.showToast(errorMessage, 'error');
            }
          }
        }
      }
    }

    // Close menu
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  const handleClickOutside = (e) => {
    if (!e.target.closest('.payment-method-card__menu')) {
      setOpenMenuId(null);
    }
  };

  // Add click outside listener
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="payment-methods-page">
        <div className="payment-methods-page__header">
          <h1 className="payment-methods-page__title">Métodos de pago</h1>
        </div>
        <div className="text-center py-4">
          <p>Debes iniciar sesión para ver tus métodos de pago.</p>
          <a href="/login" className="btn btn-primary">
            Iniciar Sesión
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="payment-methods-page">
        <div className="payment-methods-page__header">
          <h1 className="payment-methods-page__title">Métodos de pago</h1>
        </div>
        <div className="text-center py-4">
          <p>Cargando métodos de pago...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="payment-methods-page">
        <div className="payment-methods-page__header">
          <h1 className="payment-methods-page__title">Métodos de pago</h1>
        </div>
        <div className="text-center py-4">
          <p className="text-danger">Error: {error}</p>
          <button onClick={loadPaymentMethods} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Render payment method icon
  const renderIcon = (brand) => {
    switch (brand) {
      case 'visa':
        return <img src={getIconPath('Visa.svg')} alt="Visa" style={{ width: 40, height: 25 }} />;
      case 'mastercard':
        return <img src={getIconPath('Mastercard.svg')} alt="Mastercard" style={{ width: 40, height: 25 }} />;
      case 'amex':
        return <img src={getIconPath('American Express.svg')} alt="American Express" style={{ width: 40, height: 25 }} />;
      case 'discover':
        return <img src={getIconPath('Discover.svg')} alt="Discover" style={{ width: 40, height: 25 }} />;
      default:
        return <img src={getIconPath('Credit Card.svg')} alt="Tarjeta de crédito" style={{ width: 40, height: 25 }} />;
    }
  };

  return (
    <div className="payment-methods-page">
      {/* Header */}
      <div className="payment-methods-page__header">
        <h1 className="payment-methods-page__title">Métodos de pago</h1>
      </div>

      {/* Payment Methods List */}
      <div className="payment-methods-page__list">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-4">
            <p>No tienes métodos de pago guardados</p>
            <p>Haz clic en "Agregar método" para comenzar</p>
          </div>
        ) : (
          paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`payment-method-card ${selectedMethodId === method.id ? 'payment-method-card--selected' : ''}`}
              onClick={() => handleMethodSelect(method.id)}
            >
              {/* Payment Method Icon */}
              <div className="payment-method-card__icon">
                {renderIcon(method.brand)}
              </div>

              {/* Payment Method Content */}
              <div className="payment-method-card__content">
                <div className="payment-method-card__header">
                  <div className="payment-method-card__name">
                    {method.brand_display_name} {method.card_type_display_name}
                  </div>
                  {/* Tag */}
                  {method.is_default && (
                    <div className="payment-method-card__tag">
                      Predeterminada para compras
                    </div>
                  )}
                </div>
                <div className="payment-method-card__details">
                  <div className="card-info">
                    <span className="card-number">{method.masked_number}</span>
                    <span className="card-expiry">Expira: {method.expiry_date}</span>
                    <span className="card-holder">{method.cardholder_name}</span>
                  </div>
                </div>
              </div>

              {/* Menu Button */}
              <div className="payment-method-card__menu">
                <button
                  className="payment-method-card__menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuToggle(method.id);
                  }}
                  aria-label="Opciones de método de pago"
                >
                  <img src={getIconPath('More Options.svg')} alt="Opciones" style={{ width: 20, height: 20 }} />
                </button>

                {/* Dropdown Menu */}
                {openMenuId === method.id && (
                  <div className="payment-method-card__dropdown">
                    {!method.is_default && (
                      <button
                        className="payment-method-card__dropdown-item"
                        onClick={() => handleMenuAction(method.id, 'setDefault')}
                      >
                        Usar como predeterminada para compras
                      </button>
                    )}
                    <button
                      className="payment-method-card__dropdown-item payment-method-card__dropdown-item--danger"
                      onClick={() => handleMenuAction(method.id, 'delete')}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Payment Method Button */}
      <div className="payment-methods-page__actions">
        <CherryButton
          variant="outline"
          size="small"
          icon={
            <img src={getIconPath('Plus.svg')} alt="Agregar" style={{ width: 11, height: 10 }} />
          }
          iconPosition="left"
          onClick={handleAddPaymentMethod}
        >
          Agregar método
        </CherryButton>
      </div>

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nueva Tarjeta</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSavePaymentMethod(); }}>
                <div className="form-group">
                  <label>Nombre del titular *</label>
                  <input
                    type="text"
                    name="cardholder_name"
                    value={formData.cardholder_name}
                    onChange={handleInputChange}
                    placeholder="Nombre como aparece en la tarjeta"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Número de tarjeta *</label>
                  <input
                    type="text"
                    name="card_number"
                    value={formData.card_number}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength="23"
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Mes de expiración *</label>
                    <input
                      type="text"
                      name="expiry_month"
                      value={formData.expiry_month}
                      onChange={handleExpiryMonthChange}
                      placeholder="MM"
                      maxLength="2"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Año de expiración *</label>
                    <input
                      type="text"
                      name="expiry_year"
                      value={formData.expiry_year}
                      onChange={handleExpiryYearChange}
                      placeholder="YYYY"
                      maxLength="4"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>CVV *</label>
                    <input
                      type="text"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleCvvChange}
                      placeholder="123"
                      maxLength="4"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Marca de tarjeta *</label>
                    <select
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">American Express</option>
                      <option value="discover">Discover</option>
                      <option value="jcb">JCB</option>
                      <option value="diners">Diners Club</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo de tarjeta *</label>
                    <select
                      name="card_type"
                      value={formData.card_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="credit">Crédito</option>
                      <option value="debit">Débito</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={formData.is_default}
                      onChange={handleInputChange}
                    />
                    Marcar como método de pago predeterminado
                  </label>
                </div>
                
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;
