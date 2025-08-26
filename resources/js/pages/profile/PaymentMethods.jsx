import React, { useState } from 'react';
import './PaymentMethods.css';
import CherryButton from '../../components/CherryButton/CherryButton';
import { getIconPath } from '../../utils/assetPaths';

const PaymentMethods = () => {
  // State for dropdown menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // State for selected payment method
  const [selectedMethodId, setSelectedMethodId] = useState(null);

  // Mock data for payment methods
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: 1,
      type: 'card',
      brand: 'visa',
      name: 'Tarjeta Visa',
      details: '12345*******12345',
      isDefault: true
    },
    {
      id: 2,
      type: 'card',
      brand: 'visa',
      name: 'Tarjeta Visa',
      details: '12345*******12345',
      isDefault: false
    },
    {
      id: 3,
      type: 'paypal',
      name: 'Paypal',
      details: 'Holly.Dickens@gmail.com',
      isDefault: false
    }
  ]);

  // Handle menu toggle
  const handleMenuToggle = (methodId) => {
    setOpenMenuId(openMenuId === methodId ? null : methodId);
  };

  // Handle payment method selection
  const handleMethodSelect = (methodId) => {
    setSelectedMethodId(selectedMethodId === methodId ? null : methodId);
  };

  // Handle menu actions
  const handleMenuAction = (methodId, action) => {

    if (action === 'setDefault') {
      // Set as default payment method
      setPaymentMethods(methods =>
        methods.map(method => ({
          ...method,
          isDefault: method.id === methodId
        }))
      );
    } else if (action === 'delete') {
      // Delete payment method
      setPaymentMethods(methods =>
        methods.filter(method => method.id !== methodId)
      );
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
  React.useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Render payment method icon
  const renderIcon = (type) => {
    if (type === 'paypal') {
      return (
        <img src={getIconPath('Paypal.svg')} alt="PayPal" style={{ width: 12, height: 16 }} />
      );
    }

    // Default card icon
    return (
      <img src={getIconPath('Credit Card.svg')} alt="Tarjeta de crédito" style={{ width: 18, height: 14 }} />
    );
  };

  return (
    <div className="payment-methods-page">
      {/* Header */}
      <div className="payment-methods-page__header">
        <h1 className="payment-methods-page__title">Métodos de pago</h1>
      </div>

      {/* Payment Methods List */}
      <div className="payment-methods-page__list">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`payment-method-card ${selectedMethodId === method.id ? 'payment-method-card--selected' : ''}`}
            onClick={() => handleMethodSelect(method.id)}
          >
            {/* Payment Method Icon */}
            <div className="payment-method-card__icon">
              {renderIcon(method.type, method.brand)}
            </div>

            {/* Payment Method Content */}
            <div className="payment-method-card__content">
              <div className="payment-method-card__header">
                <div className="payment-method-card__name">{method.name}</div>
                {/* Tag */}
                {method.isDefault && (
                  <div className="payment-method-card__tag">
                    Predeterminada para compras
                  </div>
                )}
              </div>
              <div className="payment-method-card__details">{method.details}</div>
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
                  {!method.isDefault && (
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
        ))}
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
        >
          Agregar método
        </CherryButton>
      </div>
    </div>
  );
};

export default PaymentMethods;
