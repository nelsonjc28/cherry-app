import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../../config/axios';
import './ProductsChart.css';

const ProductsChart = ({ startDate, endDate, onDataUpdate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchProductsData();
  }, [startDate, endDate, limit]);

  const fetchProductsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { limit };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get('/dashboard/top-selling-products', { params });

      if (response.data.success) {
        setData(response.data.data);
        if (onDataUpdate) {
          onDataUpdate(response.data.data);
        }
      } else {
        setError(response.data.message || 'Error al cargar productos más vendidos');
      }
    } catch (err) {
      console.error('Error fetching products data:', err);
      setError('Error de conexión al cargar productos más vendidos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatTooltipValue = (value, name) => {
    if (name === 'total_revenue') {
      return [formatCurrency(value), 'Ingresos'];
    }
    if (name === 'total_quantity') {
      return [value, 'Cantidad Vendida'];
    }
    if (name === 'total_orders') {
      return [value, 'Órdenes'];
    }
    return [value, name];
  };

  const truncateLabel = (label, maxLength = 15) => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + '...';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const position = payload[0].payload.position || (payload[0].dataKey === 'total_quantity' ? 
        payload[0].payload.product_name : '');
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">🏆 {data.product_name}</p>
          <div className="tooltip-stats">
            <p className="tooltip-item">
              <span className="tooltip-label">📊 Cantidad vendida:</span>
              <span className="tooltip-value">{data.total_quantity} unidades</span>
            </p>
            <p className="tooltip-item">
              <span className="tooltip-label">💰 Ingresos totales:</span>
              <span className="tooltip-value">{formatCurrency(data.total_revenue)}</span>
            </p>
            <p className="tooltip-item">
              <span className="tooltip-label">📦 Total de órdenes:</span>
              <span className="tooltip-value">{data.total_orders}</span>
            </p>
            <p className="tooltip-item">
              <span className="tooltip-label">💵 Precio promedio:</span>
              <span className="tooltip-value">{formatCurrency(data.average_price)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="products-chart">
        <div className="chart-header">
          <h3>Productos Más Vendidos</h3>
        </div>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Cargando productos más vendidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="products-chart">
        <div className="chart-header">
          <h3>Productos Más Vendidos</h3>
        </div>
        <div className="chart-error">
          <p>⚠️ {error}</p>
          <button onClick={fetchProductsData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="products-chart">
        <div className="chart-header">
          <h3>Productos Más Vendidos</h3>
        </div>
        <div className="chart-empty">
          <p>📦 No hay datos de productos para el período seleccionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="products-chart">
      <div className="chart-header">
        <div className="header-left">
          <h3>Productos Más Vendidos</h3>
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Productos mostrados:</span>
              <span className="stat-value">{data.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total vendido:</span>
              <span className="stat-value">
                {data.reduce((sum, item) => sum + item.total_quantity, 0)} unidades
              </span>
            </div>
          </div>
        </div>
        <div className="header-controls">
          <label htmlFor="limit-select">Mostrar:</label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="limit-select"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={15}>Top 15</option>
            <option value={20}>Top 20</option>
          </select>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="product_name"
              tick={{ fontSize: 12 }}
              stroke="#666"
              angle={-45}
              textAnchor="end"
              height={80}
              tickFormatter={truncateLabel}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="total_quantity"
              fill="#EA2630"
              name="Cantidad Vendida"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-footer">
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#EA2630' }}></div>
            <span>Cantidad de unidades vendidas</span>
          </div>
        </div>
        <div className="chart-info">
          <span className="info-text">💡 Pasa el cursor sobre las barras para ver detalles completos</span>
        </div>
      </div>

    </div>
  );
};

export default ProductsChart;
