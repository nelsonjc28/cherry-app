import React, { useState, useEffect } from 'react';
import './AddressMapSelector.css';

const AddressMapSelector = ({ 
  settlement, 
  municipality, 
  state, 
  postalCode,
  onLocationSelect,
  initialLat = null,
  initialLng = null 
}) => {
  const [mapUrl, setMapUrl] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    // Construir URL del iframe de Google Maps embebido (gratuito, sin API key)
    if (settlement && municipality && state) {
      // Construir dirección completa
      let address = `${settlement}, ${municipality}, ${state}`;
      if (postalCode) {
        address += ` ${postalCode}`;
      }
      address += ', México';

      // Si hay coordenadas iniciales, usarlas
      if (initialLat && initialLng) {
        // URL de Google Maps embebido con coordenadas (formato pb)
        // Usar el formato de embed estándar de Google Maps que es gratuito
        const embedUrl = `https://www.google.com/maps?q=${initialLat},${initialLng}&hl=es&z=17&output=embed`;
        setMapUrl(embedUrl);
        setSelectedLocation({ lat: parseFloat(initialLat), lng: parseFloat(initialLng) });
      } else {
        // URL de Google Maps embebido con búsqueda por dirección (gratuito)
        const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}&hl=es&z=16&output=embed`;
        setMapUrl(embedUrl);
      }
    } else {
      setMapError('Por favor, completa la información de dirección primero.');
    }
  }, [settlement, municipality, state, postalCode, initialLat, initialLng]);

  const handleOpenGoogleMaps = () => {
    // Construir dirección para abrir en Google Maps
    let address = '';
    if (settlement) {
      address += settlement;
    }
    if (municipality) {
      address += address ? `, ${municipality}` : municipality;
    }
    if (state) {
      address += address ? `, ${state}` : state;
    }
    if (postalCode) {
      address += address ? ` ${postalCode}` : postalCode;
    }
    address += ', México';

    // Abrir Google Maps en una nueva ventana para que el usuario seleccione la ubicación
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setSelectedLocation(location);
          if (onLocationSelect) {
            onLocationSelect(location);
          }
          
          // Actualizar URL del mapa con las coordenadas (formato gratuito)
          const embedUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}&hl=es&z=17&output=embed`;
          setMapUrl(embedUrl);
        },
        (error) => {
          setMapError('No se pudo obtener tu ubicación. Por favor, usa el botón "Abrir en Google Maps" para seleccionar manualmente.');
        }
      );
    } else {
      setMapError('Tu navegador no soporta geolocalización.');
    }
  };

  if (mapError && !mapUrl) {
    return (
      <div className="address-map-selector">
        <div className="address-map-selector__error">
          <p>{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="address-map-selector">
      <div className="address-map-selector__header">
        <h4>Selecciona tu ubicación exacta</h4>
        <p className="address-map-selector__hint">
          Usa los botones debajo para seleccionar tu ubicación exacta dentro de la colonia
        </p>
      </div>
      
      {mapUrl && (
        <div className="address-map-selector__map-wrapper">
          <iframe
            title="Seleccionar ubicación"
            src={mapUrl}
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: '8px' }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      )}

      <div className="address-map-selector__actions">
        <button
          type="button"
          className="address-map-selector__btn address-map-selector__btn--primary"
          onClick={handleOpenGoogleMaps}
        >
          <i className="fa-solid fa-map-location-dot" style={{ marginRight: '8px' }}></i>
          Abrir en Google Maps para seleccionar ubicación
        </button>
        
        <button
          type="button"
          className="address-map-selector__btn address-map-selector__btn--secondary"
          onClick={handleGetCurrentLocation}
        >
          <i className="fa-solid fa-location-crosshairs" style={{ marginRight: '8px' }}></i>
          Usar mi ubicación actual
        </button>
      </div>

      {selectedLocation && (
        <div className="address-map-selector__coordinates">
          <small>
            <strong>Coordenadas seleccionadas:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </small>
        </div>
      )}

      <div className="address-map-selector__instructions">
        <p><strong>Instrucciones:</strong></p>
        <ol>
          <li>Haz clic en "Usar mi ubicación actual" para obtener automáticamente tus coordenadas (recomendado)</li>
          <li>O haz clic en "Abrir en Google Maps" para seleccionar manualmente tu ubicación exacta</li>
          <li>Si abres Google Maps, busca tu ubicación exacta y haz clic derecho en el punto para copiar las coordenadas</li>
          <li>Las coordenadas se guardarán automáticamente cuando uses "Usar mi ubicación actual"</li>
        </ol>
      </div>
    </div>
  );
};

export default AddressMapSelector;
