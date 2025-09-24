import React, { useState, useEffect } from 'react';
import './DateFilters.css';

const DateFilters = ({ onDateChange, initialStartDate, initialEndDate }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickFilter, setQuickFilter] = useState('current_month');

  useEffect(() => {
    if (initialStartDate) {
      setStartDate(initialStartDate);
    }
    if (initialEndDate) {
      setEndDate(initialEndDate);
    }
  }, [initialStartDate, initialEndDate]);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getQuickFilterDates = (filter) => {
    const now = new Date();
    let start, end;

    switch (filter) {
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_6_months':
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'current_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return { start: null, end: null };
    }

    return {
      start: formatDate(start),
      end: formatDate(end)
    };
  };

  const handleQuickFilterChange = (filter) => {
    setQuickFilter(filter);
    
    if (filter === 'custom') {
      // No cambiar las fechas, dejar que el usuario las seleccione
      return;
    }

    const dates = getQuickFilterDates(filter);
    setStartDate(dates.start);
    setEndDate(dates.end);
    
    if (onDateChange) {
      onDateChange(dates.start, dates.end);
    }
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    setQuickFilter('custom');
    
    if (onDateChange && newStartDate && endDate) {
      onDateChange(newStartDate, endDate);
    }
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    setQuickFilter('custom');
    
    if (onDateChange && startDate && newEndDate) {
      onDateChange(startDate, newEndDate);
    }
  };

  const handleApplyFilter = () => {
    if (onDateChange && startDate && endDate) {
      onDateChange(startDate, endDate);
    }
  };

  const handleResetFilter = () => {
    setQuickFilter('current_month');
    const dates = getQuickFilterDates('current_month');
    setStartDate(dates.start);
    setEndDate(dates.end);
    
    if (onDateChange) {
      onDateChange(dates.start, dates.end);
    }
  };

  // Inicializar con el mes actual si no hay fechas iniciales
  useEffect(() => {
    if (!initialStartDate && !initialEndDate) {
      const dates = getQuickFilterDates('current_month');
      setStartDate(dates.start);
      setEndDate(dates.end);
      
      if (onDateChange) {
        onDateChange(dates.start, dates.end);
      }
    }
  }, []);

  const getQuickFilterLabel = (filter) => {
    const labels = {
      'current_month': 'Mes Actual',
      'last_month': 'Mes Pasado',
      'last_3_months': 'Últimos 3 Meses',
      'last_6_months': 'Últimos 6 Meses',
      'current_year': 'Año Actual',
      'last_year': 'Año Pasado',
      'custom': 'Personalizado'
    };
    return labels[filter] || filter;
  };

  return (
    <div className="date-filters">
      <div className="filters-header">
        <h3>Filtros de Fecha</h3>
        <button 
          onClick={handleResetFilter}
          className="reset-button"
          title="Resetear al mes actual"
        >
          🔄 Resetear
        </button>
      </div>

      <div className="filters-content">
        <div className="quick-filters">
          <label>Período predefinido:</label>
          <div className="quick-filter-buttons">
            {[
              'current_month',
              'last_month', 
              'last_3_months',
              'last_6_months',
              'current_year',
              'last_year',
              'custom'
            ].map(filter => (
              <button
                key={filter}
                onClick={() => handleQuickFilterChange(filter)}
                className={`quick-filter-btn ${quickFilter === filter ? 'active' : ''}`}
              >
                {getQuickFilterLabel(filter)}
              </button>
            ))}
          </div>
        </div>

        <div className="custom-dates">
          <div className="date-input-group">
            <label htmlFor="start-date">Fecha de inicio:</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="date-input"
            />
          </div>

          <div className="date-input-group">
            <label htmlFor="end-date">Fecha de fin:</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="date-input"
              min={startDate}
            />
          </div>

          {quickFilter === 'custom' && (
            <button 
              onClick={handleApplyFilter}
              className="apply-button"
              disabled={!startDate || !endDate}
            >
              Aplicar Filtro
            </button>
          )}
        </div>
      </div>

      {startDate && endDate && (
        <div className="current-period">
          <span className="period-label">Período seleccionado:</span>
          <span className="period-dates">
            {new Date(startDate).toLocaleDateString('es-MX', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} - {new Date(endDate).toLocaleDateString('es-MX', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export default DateFilters;
