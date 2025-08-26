import { useState, useEffect } from 'react';
import api from '../services/api';

export const useExternalProducts = (categoryCode) => {
  const [products, setProducts] = useState({
    local: [],
    external: [],
    total_local: 0,
    total_external: 0,
    total_combined: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(null);

  const fetchProducts = async () => {
    if (!categoryCode) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/external-products/category/${categoryCode}`);
      
      if (response.data.success) {

        setProducts(response.data.data.products);
        setCategory(response.data.data.category);
      } else {
        setError(response.data.error || 'Error al obtener productos');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al obtener productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryCode]);

  const refreshProducts = () => {
    fetchProducts();
  };

  return {
    products,
    category,
    loading,
    error,
    refreshProducts
  };
};

export default useExternalProducts;
