import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import api from '../../services/api';
import './AdminHistorial.css';

const STORAGE_KEY = 'adminCronMailHistorial_itemsPerPage';

const TIPO_LABELS = {
  abandoned_cart: 'Carrito abandonado',
  order_status: 'Estatus pedido',
  welcome: 'Bienvenida (registro)',
  resumen_ejecucion: 'Resumen ejecución',
};

const ESTADO_LABELS = {
  exitoso: 'Exitoso',
  error: 'Error',
  omitido: 'Omitido',
  encolado: 'Encolado',
  enviando: 'Enviando',
};

const COMANDO_LABELS = {
  'mail:abandoned-cart': 'Carrito abandonado',
  'mail:order-status-update': 'Estatus pedido',
};

const AdminCronMailHistorial = () => {
  const [logs, setLogs] = useState([]);
  const [pending, setPending] = useState({ abandoned_cart: 0, order_status: 0 });
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
  const getInitialComando = () => searchParams.get('comando') || '';
  const getInitialTipo = () => searchParams.get('tipo_correo') || '';
  const getInitialEstado = () => searchParams.get('estado') || '';
  const getInitialOrderId = () => searchParams.get('order_id') || '';

  const [fechaInicio, setFechaInicio] = useState(getInitialFechaInicio());
  const [fechaFin, setFechaFin] = useState(getInitialFechaFin());
  const [comandoFilter, setComandoFilter] = useState(getInitialComando());
  const [tipoFilter, setTipoFilter] = useState(getInitialTipo());
  const [estadoFilter, setEstadoFilter] = useState(getInitialEstado());
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

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setComandoFilter('');
    setTipoFilter('');
    setEstadoFilter('');
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
        if (comandoFilter) params.append('comando', comandoFilter);
        if (tipoFilter) params.append('tipo_correo', tipoFilter);
        if (estadoFilter) params.append('estado', estadoFilter);
        if (orderIdFilter.trim()) params.append('order_id', orderIdFilter.trim());
        if (currentPage > 1) params.append('page', currentPage.toString());
        params.append('per_page', itemsPerPage.toString());

        const url = `/admin/cron-mail-logs${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await api.get(url);

        if (response.data.success) {
          setLogs(response.data.data);
          if (response.data.pending) {
            setPending(response.data.pending);
          }
          if (response.data.pagination) {
            setPagination(response.data.pagination);
            if (response.data.pagination.current_page !== currentPage) {
              setCurrentPage(response.data.pagination.current_page);
            }
          }
        } else {
          setError('Error al cargar el historial de correos');
        }
      } catch {
        setError('Error al cargar el historial de correos. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [fechaInicio, fechaFin, comandoFilter, tipoFilter, estadoFilter, orderIdFilter, currentPage, itemsPerPage]);

  const getEstadoBadgeClass = (estado) => {
    if (estado === 'exitoso' || estado === 'encolado') return 'historial-badge-success';
    if (estado === 'omitido' || estado === 'enviando') return 'historial-badge-warning';
    return 'historial-badge-error';
  };

  const getEstadoText = (estado) => ESTADO_LABELS[estado] || estado;

  const formatMensaje = (item) => {
    if (item.tipo_correo === 'resumen_ejecucion' && item.resumen) {
      const r = item.resumen;
      return `Encolados: ${r.encolados ?? 0} · Errores: ${r.errores ?? 0} · Omitidos: ${r.omitidos ?? 0}`;
    }
    return item.mensaje || '-';
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
        <h2>Historial correos cron</h2>
        <p className="admin-historial__subtitle">
          Supervisión de correos automáticos (carrito abandonado diario, estatus de pedido cada hora)
        </p>
      </div>

      <div
        className="admin-historial__filters"
        style={{ marginBottom: '16px', padding: '12px 16px', background: '#f8f9fa', borderRadius: '8px' }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
          <strong>Pendientes:</strong> carrito abandonado ({pending.abandoned_cart ?? 0}) · estatus pedido (
          {pending.order_status ?? 0})
        </p>
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#666' }}>
          CLI: <code>php artisan mail:check-cron</code> · <code>php artisan mail:sync-cron</code>
        </p>
      </div>

      <div className="admin-historial__filters">
        <div className="admin-historial__filters-row">
          <div className="admin-historial__filter-group">
            <label htmlFor="comando_filter">Comando:</label>
            <select
              id="comando_filter"
              value={comandoFilter}
              onChange={(e) => {
                setComandoFilter(e.target.value);
                updateSearchParam('comando', e.target.value);
              }}
              className="admin-historial__date-input"
            >
              <option value="">Todos</option>
              <option value="mail:abandoned-cart">mail:abandoned-cart</option>
              <option value="mail:order-status-update">mail:order-status-update</option>
            </select>
          </div>

          <div className="admin-historial__filter-group">
            <label htmlFor="tipo_filter">Tipo:</label>
            <select
              id="tipo_filter"
              value={tipoFilter}
              onChange={(e) => {
                setTipoFilter(e.target.value);
                updateSearchParam('tipo_correo', e.target.value);
              }}
              className="admin-historial__date-input"
            >
              <option value="">Todos</option>
              <option value="abandoned_cart">Carrito abandonado</option>
              <option value="order_status">Estatus pedido</option>
              <option value="resumen_ejecucion">Resumen ejecución</option>
            </select>
          </div>

          <div className="admin-historial__filter-group">
            <label htmlFor="estado_filter">Estado:</label>
            <select
              id="estado_filter"
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value);
                updateSearchParam('estado', e.target.value);
              }}
              className="admin-historial__date-input"
            >
              <option value="">Todos</option>
              <option value="exitoso">Exitoso</option>
              <option value="error">Error</option>
              <option value="omitido">Omitido</option>
              <option value="encolado">Encolado</option>
              <option value="enviando">Enviando</option>
            </select>
          </div>

          <div className="admin-historial__filter-group">
            <label htmlFor="order_id_filter">ID orden:</label>
            <input
              type="number"
              id="order_id_filter"
              min="1"
              value={orderIdFilter}
              onChange={(e) => {
                setOrderIdFilter(e.target.value);
                updateSearchParam('order_id', e.target.value);
              }}
              className="admin-historial__date-input"
              placeholder="Ej. 94"
            />
          </div>

          <div className="admin-historial__filter-group">
            <label htmlFor="fecha_inicio">Fecha inicio:</label>
            <input
              type="date"
              id="fecha_inicio"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                updateSearchParam('fecha_inicio', e.target.value);
              }}
              className="admin-historial__date-input"
            />
          </div>

          <div className="admin-historial__filter-group">
            <label htmlFor="fecha_fin">Fecha fin:</label>
            <input
              type="date"
              id="fecha_fin"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                updateSearchParam('fecha_fin', e.target.value);
              }}
              className="admin-historial__date-input"
            />
          </div>

          <div className="admin-historial__filter-group">
            <label htmlFor="items-per-page">Mostrar:</label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                setItemsPerPage(val);
                localStorage.setItem(STORAGE_KEY, val.toString());
                const newParams = new URLSearchParams(searchParams);
                newParams.set('per_page', val.toString());
                newParams.set('page', '1');
                setSearchParams(newParams, { replace: true });
                setCurrentPage(1);
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
            <CherryButton variant="secondary" size="small" onClick={limpiarFiltros}>
              Limpiar filtros
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
            <p>No se encontraron registros</p>
            {(fechaInicio || fechaFin || comandoFilter || tipoFilter || estadoFilter || orderIdFilter) && (
              <CherryButton variant="secondary" size="small" onClick={limpiarFiltros}>
                Limpiar filtros
              </CherryButton>
            )}
          </div>
        ) : (
          <table className="admin-historial__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Comando</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Destino</th>
                <th>Ref.</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{COMANDO_LABELS[item.comando] || item.comando}</td>
                  <td>{TIPO_LABELS[item.tipo_correo] || item.tipo_correo}</td>
                  <td>{item.ejecutado_at}</td>
                  <td>
                    <span className={`historial-badge ${getEstadoBadgeClass(item.estado)}`}>
                      {getEstadoText(item.estado)}
                    </span>
                  </td>
                  <td>{item.email_destino || item.user_email || '-'}</td>
                  <td>
                    {item.order_id ? `#${item.order_id}` : item.cart_id ? `Carrito ${item.cart_id}` : '-'}
                  </td>
                  <td className="admin-historial__message-cell">
                    <button
                      type="button"
                      className="admin-order-api-log__toggle"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      {expandedId === item.id ? 'Ocultar' : 'Ver detalle'}
                    </button>
                    {expandedId === item.id && (
                      <pre className="admin-order-api-log__response">{formatMensaje(item)}</pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {logs.length > 0 && pagination.total > 0 && (
        <>
          <div className="admin-historial__info">
            <p>
              Mostrando {pagination.from} - {pagination.to} de {pagination.total} registros
            </p>
          </div>
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
                  {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                        ...
                      </span>
                    ) : (
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
                    )
                  )}
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
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCronMailHistorial;
