import React, { useState } from 'react';
import './Addresses.css';
import CherryButton from '../../components/CherryButton/CherryButton';
import { getIconPath } from '../../utils/assetPaths';

const Addresses = () => {
  // State for dropdown menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // State for selected address
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Mock data for addresses
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      street: 'Calle de la Paz 123, Colonia Del Valle, Ciudad de México, CDMX, México.',
      city: 'Ciudad de México - México',
      isDefault: true,
      isShipping: true,
      tags: ['Domicilio de envío']
    },
    {
      id: 2,
      street: 'Calle de la Paz 123, Colonia Del Valle, Ciudad de México, CDMX, México.',
      city: 'Ciudad de México - México',
      isDefault: false,
      isShipping: false,
      tags: ['Venta']
    },
    {
      id: 3,
      street: 'Calle de la Paz 123, Colonia Del Valle, Ciudad de México, CDMX, México.',
      city: 'Ciudad de México - México',
      isDefault: false,
      isShipping: false,
      tags: []
    }
  ]);

  // Handle menu toggle
  const handleMenuToggle = (addressId) => {
    setOpenMenuId(openMenuId === addressId ? null : addressId);
  };

  // Handle address selection
  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(selectedAddressId === addressId ? null : addressId);
  };

  // Handle menu actions
  const handleMenuAction = (addressId, action) => {
    console.log(`Action ${action} for address ${addressId}`);

    if (action === 'setDefaultShipping') {
      // Set as default shipping address
      setAddresses(addresses =>
        addresses.map(address => ({
          ...address,
          isDefault: address.id === addressId ? true : false,
          isShipping: address.id === addressId ? true : address.isShipping
        }))
      );
    } else if (action === 'setSale') {
      // Set for sales
      setAddresses(addresses =>
        addresses.map(address => ({
          ...address,
          tags: address.id === addressId
            ? [...address.tags.filter(tag => tag !== 'Venta'), 'Venta']
            : address.tags.filter(tag => tag !== 'Venta')
        }))
      );
    } else if (action === 'delete') {
      // Delete address
      setAddresses(addresses =>
        addresses.filter(address => address.id !== addressId)
      );
    }

    // Close menu
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  const handleClickOutside = (e) => {
    if (!e.target.closest('.address-card__menu')) {
      setOpenMenuId(null);
    }
  };

  // Add click outside listener
  React.useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle add new address
  const handleAddAddress = () => {
    console.log('Add new address');
    // Here you would open a modal or navigate to add address form
  };

  return (
    <div className="addresses-page">
      {/* Header */}
      <div className="addresses-page__header">
        <h1 className="addresses-page__title">Mis direcciones</h1>
      </div>

      {/* Addresses List */}
      <div className="addresses-page__list">
        {addresses.map((address) => (
          <div
            key={address.id}
            className={`address-card ${selectedAddressId === address.id ? 'address-card--selected' : ''}`}
            onClick={() => handleAddressSelect(address.id)}
          >
            {/* Location Icon */}
            <div className="address-card__icon">
              <img src={getIconPath('Location.svg')} alt="Ubicación" style={{ width: 12, height: 17 }} />
            </div>

            {/* Address Content */}
            <div className="address-card__content">
              <div className="address-card__header">
                <div className="address-card__street">{address.street}</div>
                {/* Tags */}
                {address.tags.length > 0 && (
                  <div className="address-card__tags">
                    {address.tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`address-card__tag ${tag === 'Domicilio de envío' ? 'address-card__tag--shipping' : 'address-card__tag--sale'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="address-card__city">{address.city}</div>
            </div>

            {/* Menu Button */}
            <div className="address-card__menu">
              <button
                className="address-card__menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuToggle(address.id);
                }}
                aria-label="Opciones de dirección"
              >
                <img src={getIconPath('More Options.svg')} alt="Opciones" style={{ width: 20, height: 20 }} />
              </button>

              {/* Dropdown Menu */}
              {openMenuId === address.id && (
                <div className="address-card__dropdown">
                  <button
                    className="address-card__dropdown-item"
                    onClick={() => handleMenuAction(address.id, 'edit')}
                  >
                    Editar
                  </button>
                  <button
                    className="address-card__dropdown-item"
                    onClick={() => handleMenuAction(address.id, 'setDefaultShipping')}
                  >
                    Usar como predeterminado de envíos
                  </button>
                  <button
                    className="address-card__dropdown-item"
                    onClick={() => handleMenuAction(address.id, 'setSale')}
                  >
                    Usar para ventas
                  </button>
                  <button
                    className="address-card__dropdown-item address-card__dropdown-item--danger"
                    onClick={() => handleMenuAction(address.id, 'delete')}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Address Button */}
      <div className="addresses-page__actions">
        <CherryButton
          variant="outline"
          size="small"
          icon={
            <img src={getIconPath('Plus.svg')} alt="Agregar" style={{ width: 11, height: 10 }} />
          }
          iconPosition="left"
        >
          Agregar dirección
        </CherryButton>
      </div>
    </div>
  );
};

export default Addresses;
