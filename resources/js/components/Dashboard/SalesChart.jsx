import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../../config/axios';
import './SalesChart.css';

const SalesChart = ({ startDate, endDate, onDataUpdate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get('/dashboard/sales-by-month', { params });

      if (response.data.success) {
        setData(response.data.data);
        if (onDataUpdate) {
          onDataUpdate(response.data.data);
        }
      } else {
        setError(response.data.message || 'Error al cargar datos de ventas');
      }
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError('Error de conexión al cargar datos de ventas');
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
    if (name === 'total_sales') {
      return [formatCurrency(value), 'Ventas'];
    }
    if (name === 'total_orders') {
      return [value, 'Órdenes'];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <div className="sales-chart">
        <div className="chart-header">
          <h3>Ventas por Mes</h3>
        </div>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Cargando datos de ventas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-chart">
        <div className="chart-header">
          <h3>Ventas por Mes</h3>
        </div>
        <div className="chart-error">
          <p>⚠️ {error}</p>
          <button onClick={fetchSalesData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="sales-chart">
        <div className="chart-header">
          <h3>Ventas por Mes</h3>
        </div>
        <div className="chart-empty">
          <p>📊 No hay datos de ventas para el período seleccionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-chart">
      <div className="chart-header">
        <h3>Ventas por Mes</h3>
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Total de meses:</span>
            <span className="stat-value">{data.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Ventas totales:</span>
            <span className="stat-value">
              {formatCurrency(data.reduce((sum, item) => sum + item.total_sales, 0))}
            </span>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#666"
              tickFormatter={formatCurrency}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelStyle={{ color: '#333' }}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total_sales"
              stroke="#EA2630"
              strokeWidth={3}
              dot={{ fill: '#EA2630', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#EA2630', strokeWidth: 2 }}
              name="Ventas"
            />
            <Line
              type="monotone"
              dataKey="total_orders"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#82ca9d', strokeWidth: 2 }}
              name="Órdenes"
              yAxisId="right"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#EA2630' }}></div>
          <span>Ventas totales (MXN)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#82ca9d' }}></div>
          <span>Número de órdenes</span>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;
