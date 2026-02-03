import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import api from '../../services/api';
import './AdminHistorial.css';

const AdminHistorial = () => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filtros de fecha
  const getInitialFechaInicio = () => {
    return searchParams.get('fecha_inicio') || '';
  };
  
  const getInitialFechaFin = () => {
    return searchParams.get('fecha_fin') || '';
  };

  const [fechaInicio, setFechaInicio] = useState(getInitialFechaInicio());
  const [fechaFin, setFechaFin] = useState(getInitialFechaFin());

  // Función para actualizar filtros y guardarlos en URL
  const updateFechaInicio = (value) => {
    setFechaInicio(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('fecha_inicio', value);
    } else {
      newParams.delete('fecha_inicio');
    }
    setSearchParams(newParams, { replace: true });
  };

  const updateFechaFin = (value) => {
    setFechaFin(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('fecha_fin', value);
    } else {
      newParams.delete('fecha_fin');
    }
    setSearchParams(newParams, { replace: true });
  };

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setSearchParams({}, { replace: true });
  };

  // Cargar historial
  useEffect(() => {
    const fetchHistorial = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        
        if (fechaInicio) {
          params.append('fecha_inicio', fechaInicio);
        }
        if (fechaFin) {
          params.append('fecha_fin', fechaFin);
        }
        
        const url = `/admin/historial${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await api.get(url);
        
        if (response.data.success) {
          setHistorial(response.data.data);
        } else {
          setError('Error al cargar el historial');
        }
      } catch (err) {
        console.error('Error fetching historial:', err);
        setError('Error al cargar el historial. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [fechaInicio, fechaFin]);

  const getEstadoBadgeClass = (estado) => {
    return estado === 'exitoso' ? 'historial-badge-success' : 'historial-badge-error';
  };

  const getEstadoText = (estado) => {
    return estado === 'exitoso' ? 'Exitoso' : 'Error';
  };

  if (loading) {
    return (
      <div className="admin-historial">
        <div className="admin-historial__loading">
          <p>Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-historial">
      <div className="admin-historial__header">
        <h2>Historial de Sincronizaciones</h2>
        <p className="admin-historial__subtitle">
          Registro de ejecuciones del cronjob de sincronización de productos
        </p>
      </div>

      {/* Filtros de fecha */}
      <div className="admin-historial__filters">
        <div className="admin-historial__filters-row">
          <div className="admin-historial__filter-group">
            <label htmlFor="fecha_inicio">Fecha de inicio:</label>
            <input
              type="date"
              id="fecha_inicio"
              value={fechaInicio}
              onChange={(e) => updateFechaInicio(e.target.value)}
              className="admin-historial__date-input"
            />
          </div>
          
          <div className="admin-historial__filter-group">
            <label htmlFor="fecha_fin">Fecha de fin:</label>
            <input
              type="date"
              id="fecha_fin"
              value={fechaFin}
              onChange={(e) => updateFechaFin(e.target.value)}
              className="admin-historial__date-input"
            />
          </div>
          
          <div className="admin-historial__filter-actions">
            <CherryButton
              variant="secondary"
              size="small"
              onClick={limpiarFiltros}
            >
              Limpiar Filtros
            </CherryButton>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="admin-historial__error">
          <p>{error}</p>
        </div>
      )}

      {/* Tabla de historial */}
      <div className="admin-historial__table-container">
        {historial.length === 0 ? (
          <div className="admin-historial__empty">
            <p>No se encontraron registros de sincronización</p>
            {(fechaInicio || fechaFin) && (
              <CherryButton
                variant="secondary"
                size="small"
                onClick={limpiarFiltros}
              >
                Limpiar Filtros
              </CherryButton>
            )}
          </div>
        ) : (
          <table className="admin-historial__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha y Hora</th>
                <th>Estado</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.ejecutado_at}</td>
                  <td>
                    <span className={`historial-badge ${getEstadoBadgeClass(item.estado)}`}>
                      {getEstadoText(item.estado)}
                    </span>
                  </td>
                  <td className="admin-historial__message-cell">
                    {item.mensaje || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Información de resultados */}
      {historial.length > 0 && (
        <div className="admin-historial__info">
          <p>Total de registros: {historial.length}</p>
        </div>
      )}
    </div>
  );
};

export default AdminHistorial;
