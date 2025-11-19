import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SalesChart from '../../components/Dashboard/SalesChart';
import ProductsChart from '../../components/Dashboard/ProductsChart';
import DateFilters from '../../components/Dashboard/DateFilters';
import api from '../../config/axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inicializar con el mes actual
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchDashboardSummary();
    }
  }, [startDate, endDate]);

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboard/summary', {
        params: { start_date: startDate, end_date: endDate }
      });

      if (response.data.success) {
        setDashboardSummary(response.data.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard de Ventas</h1>
          <p>Análisis de ventas y productos más vendidos</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => navigate('/admin/ordenes')}
            className="nav-button nav-button--red"
          >
            📋 Ver Órdenes
          </button>
        </div>
      </div>

      <DateFilters 
        onDateChange={handleDateChange}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />

      {dashboardSummary && (
        <div className="dashboard-summary">
          <div className="summary-cards">
            <div className="summary-card sales">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <h3>Ventas Totales</h3>
                <p className="card-value">{formatCurrency(dashboardSummary.total_sales)}</p>
                <p className="card-growth">
                  <span className={dashboardSummary.sales_growth_percentage >= 0 ? 'positive' : 'negative'}>
                    {formatPercentage(dashboardSummary.sales_growth_percentage)}
                  </span>
                  vs período anterior
                </p>
              </div>
            </div>

            <div className="summary-card orders">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <h3>Total de Órdenes</h3>
                <p className="card-value">{dashboardSummary.total_orders}</p>
                <p className="card-subtitle">órdenes completadas</p>
              </div>
            </div>

            <div className="summary-card products">
              <div className="card-icon">📦</div>
              <div className="card-content">
                <h3>Productos Vendidos</h3>
                <p className="card-value">{dashboardSummary.total_products_sold}</p>
                <p className="card-subtitle">unidades totales</p>
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="dashboard-charts">
        <div className="charts-grid-side-by-side">
          <div className="chart-section-half">
            <SalesChart 
              startDate={startDate}
              endDate={endDate}
            />
          </div>

          <div className="chart-section-half">
            <ProductsChart 
              startDate={startDate}
              endDate={endDate}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Cargando datos del dashboard...</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
