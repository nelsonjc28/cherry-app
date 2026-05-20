import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import api from '../../services/api';
import './AdminHistorial.css';

const STORAGE_KEY = 'adminOrderApiHistorial_itemsPerPage';

const AdminOrderExternalApiHistorial = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  });

  const getInitialFechaInicio = () => searchParams.get('fecha_inicio') || '';
  const getInitialFechaFin = () => searchParams.get('fecha_fin') || '';
  const getInitialPage = () => parseInt(searchParams.get('page') || '1', 10);
  const getInitialItemsPerPage = () =>
    parseInt(searchParams.get('per_page') || localStorage.getItem(STORAGE_KEY) || '15', 10);
  const getInitialOrderId = () => searchParams.get('order_id') || '';

  const [fechaInicio, setFechaInicio] = useState(getInitialFechaInicio());
  const [fechaFin, setFechaFin] = useState(getInitialFechaFin());
  const [orderIdFilter, setOrderIdFilter] = useState(getInitialOrderId());
  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [itemsPerPage, setItemsPerPage] = useState(getInitialItemsPerPage());

  const updateSearchParam = (key, value, resetPage = true) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (resetPage) {
      newParams.delete('page');
      setCurrentPage(1);
    }
    setSearchParams(newParams, { replace: true });
  };

  const updateFechaInicio = (value) => {
    setFechaInicio(value);
    updateSearchParam('fecha_inicio', value);
  };

  const updateFechaFin = (value) => {
    setFechaFin(value);
    updateSearchParam('fecha_fin', value);
  };

  const updateOrderIdFilter = (value) => {
    setOrderIdFilter(value);
    updateSearchParam('order_id', value.trim());
  };

  const updateItemsPerPage = (value) => {
    setItemsPerPage(value);
    localStorage.setItem(STORAGE_KEY, value.toString());
    const newParams = new URLSearchParams(searchParams);
    newParams.set('per_page', value.toString());
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  };

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setOrderIdFilter('');
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

  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.last_page;
    const current = pagination.current_page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (current >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (fechaInicio) params.append('fecha_inicio', fechaInicio);
        if (fechaFin) params.append('fecha_fin', fechaFin);
        if (orderIdFilter.trim()) params.append('order_id', orderIdFilter.trim());
        if (currentPage > 1) params.append('page', currentPage.toString());
        params.append('per_page', itemsPerPage.toString());

        const url = `/admin/order-external-api-logs${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await api.get(url);

        if (response.data.success) {
          setLogs(response.data.data);
          if (response.data.pagination) {
            setPagination(response.data.pagination);
            if (response.data.pagination.current_page !== currentPage) {
              setCurrentPage(response.data.pagination.current_page);
            }
          }
        } else {
          setError('Error al cargar el historial de envíos');
        }
      } catch {
        setError('Error al cargar el historial de envíos. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [fechaInicio, fechaFin, orderIdFilter, currentPage, itemsPerPage]);

  const getEstadoBadgeClass = (estado) => {
    if (estado === 'exitoso') return 'historial-badge-success';
    if (estado === 'duplicado') return 'historial-badge-warning';
    return 'historial-badge-error';
  };

  const getEstadoText = (estado) => {
    if (estado === 'exitoso') return 'Exitoso';
    if (estado === 'duplicado') return 'Duplicado';
    return 'Error';
  };

  const getOrigenLabel = (origen) => {
    const map = {
      sistema: 'Automático',
      comando: 'Comando sync',
      admin: 'Admin',
    };
    return map[origen] || origen || '-';
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
        <h2>Historial de envíos a API externa</h2>
        <p className="admin-historial__subtitle">
          Cada intento de envío de un pedido a la API de ventas (automático, comando o reenvío manual)
        </p>
      </div>

      <div className="admin-historial__filters">
        <div className="admin-historial__filters-row">
          <div className="admin-historial__filter-group">
            <label htmlFor="order_id_filter">ID de orden:</label>
            <input
              type="number"
              id="order_id_filter"
              min="1"
              value={orderIdFilter}
              onChange={(e) => updateOrderIdFilter(e.target.value)}
              className="admin-historial__date-input"
              placeholder="Ej. 94"
            />
          </div>

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
              onChange={(e) => updateItemsPerPage(Number(e.target.value))}
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
            <CherryButton variant="secondary" size="small" onClick={limpiarFiltros}>
              Limpiar Filtros
            </CherryButton>
          </div>
        </div>
      </div>

      {error && (
        <div className="admin-historial__error">
          <p>{error}</p>
        </div>
      )}

      <div className="admin-historial__table-container">
        {logs.length === 0 ? (
          <div className="admin-historial__empty">
            <p>No se encontraron registros de envío</p>
            {(fechaInicio || fechaFin || orderIdFilter) && (
              <CherryButton variant="secondary" size="small" onClick={limpiarFiltros}>
                Limpiar Filtros
              </CherryButton>
            )}
          </div>
        ) : (
          <table className="admin-historial__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Orden</th>
                <th>Fecha y hora</th>
                <th>HTTP</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Respuesta API</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>#{item.order_id}</td>
                  <td>{item.ejecutado_at}</td>
                  <td>{item.http_status ?? '-'}</td>
                  <td>
                    <span className={`historial-badge ${getEstadoBadgeClass(item.estado)}`}>
                      {getEstadoText(item.estado)}
                    </span>
                  </td>
                  <td>{getOrigenLabel(item.origen)}</td>
                  <td className="admin-historial__message-cell">
                    <button
                      type="button"
                      className="admin-order-api-log__toggle"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      {expandedId === item.id ? 'Ocultar' : 'Ver respuesta'}
                    </button>
                    {expandedId === item.id && (
                      <pre className="admin-order-api-log__response">{item.respuesta_api || '(vacío)'}</pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {logs.length > 0 && pagination.total > 0 && (
        <div className="admin-historial__info">
          <p>
            Mostrando {pagination.from} - {pagination.to} de {pagination.total} registros
            {pagination.last_page > 1 && (
              <span className="admin-historial__info-page">
                {' '}
                • Página {pagination.current_page} de {pagination.last_page}
              </span>
            )}
          </p>
        </div>
      )}

      {logs.length > 0 && pagination.total > 0 && (
        <div className="admin-historial__pagination">
          <div className="pagination-controls">
            <button
              type="button"
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
                      type="button"
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
              type="button"
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="pagination-button pagination-button-nav"
            >
              Siguiente
            </button>
          </div>
          <div className="admin-historial__pagination-info">
            <span>
              Página {pagination.current_page} de {pagination.last_page}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderExternalApiHistorial;
