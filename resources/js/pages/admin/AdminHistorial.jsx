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
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  });
  
  // Filtros de fecha
  const getInitialFechaInicio = () => {
    return searchParams.get('fecha_inicio') || '';
  };
  
  const getInitialFechaFin = () => {
    return searchParams.get('fecha_fin') || '';
  };

  const getInitialPage = () => {
    return parseInt(searchParams.get('page') || '1', 10);
  };

  const getInitialItemsPerPage = () => {
    return parseInt(searchParams.get('per_page') || localStorage.getItem('adminHistorial_itemsPerPage') || '15', 10);
  };

  const [fechaInicio, setFechaInicio] = useState(getInitialFechaInicio());
  const [fechaFin, setFechaFin] = useState(getInitialFechaFin());
  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [itemsPerPage, setItemsPerPage] = useState(getInitialItemsPerPage());

  // Función para actualizar filtros y guardarlos en URL
  const updateFechaInicio = (value) => {
    setFechaInicio(value);
    setCurrentPage(1); // Resetear a página 1 cuando cambia el filtro
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('fecha_inicio', value);
    } else {
      newParams.delete('fecha_inicio');
    }
    newParams.delete('page'); // Eliminar página al cambiar filtros
    setSearchParams(newParams, { replace: true });
  };

  const updateFechaFin = (value) => {
    setFechaFin(value);
    setCurrentPage(1); // Resetear a página 1 cuando cambia el filtro
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('fecha_fin', value);
    } else {
      newParams.delete('fecha_fin');
    }
    newParams.delete('page'); // Eliminar página al cambiar filtros
    setSearchParams(newParams, { replace: true });
  };

  const updateItemsPerPage = (value) => {
    setItemsPerPage(value);
    localStorage.setItem('adminHistorial_itemsPerPage', value.toString());
    const newParams = new URLSearchParams(searchParams);
    newParams.set('per_page', value.toString());
    newParams.set('page', '1'); // Reset a página 1 cuando cambia items por página
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  };

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    const newParams = new URLSearchParams(searchParams);
    if (newPage > 1) {
      newParams.set('page', newPage.toString());
    } else {
      newParams.delete('page');
    }
    setSearchParams(newParams, { replace: true });
  };

  // Generar números de página a mostrar
  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.last_page;
    const current = pagination.current_page;
    
    if (totalPages <= 7) {
      // Si hay 7 o menos páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Si hay más de 7 páginas, mostrar lógica inteligente
      if (current <= 4) {
        // Cerca del inicio
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        // Cerca del final
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // En el medio
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
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
        if (currentPage > 1) {
          params.append('page', currentPage.toString());
        }
        params.append('per_page', itemsPerPage.toString());
        
        const url = `/admin/historial${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await api.get(url);
        
        if (response.data.success) {
          setHistorial(response.data.data);
          if (response.data.pagination) {
            setPagination(response.data.pagination);
            // Sincronizar currentPage con la paginación del backend
            if (response.data.pagination.current_page !== currentPage) {
              setCurrentPage(response.data.pagination.current_page);
            }
          }
        } else {
          setError('Error al cargar el historial');
        }
      } catch (err) {
        setError('Error al cargar el historial. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [fechaInicio, fechaFin, currentPage, itemsPerPage]);

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
        <h2>Historial de sincronización de productos</h2>
        <p className="admin-historial__subtitle">
          Registro de ejecuciones del cronjob de sincronización de productos desde la API externa
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
          
          <div className="admin-historial__filter-group">
            <label htmlFor="items-per-page">Mostrar:</label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => {
                updateItemsPerPage(Number(e.target.value));
              }}
              className="admin-historial__date-input"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
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
      {historial.length > 0 && pagination.total > 0 && (
        <div className="admin-historial__info">
          <p>
            Mostrando {pagination.from} - {pagination.to} de {pagination.total} registros
            {pagination.last_page > 1 && (
              <span className="admin-historial__info-page">
                {' '}• Página {pagination.current_page} de {pagination.last_page}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Paginación */}
      {historial.length > 0 && pagination.total > 0 && (
        <div className="admin-historial__pagination">
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="pagination-button pagination-button-nav"
            >
              Anterior
            </button>
            
            {pagination.last_page > 1 && (
              <div className="pagination-numbers">
                {getPageNumbers().map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`pagination-page-button ${
                        page === pagination.current_page ? 'pagination-page-button-active' : ''
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            )}
            
            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="pagination-button pagination-button-nav"
            >
              Siguiente
            </button>
          </div>
          <div className="admin-historial__pagination-info">
            <span>Página {pagination.current_page} de {pagination.last_page}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHistorial;
