import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import ExternalProductsList from '../components/ExternalProductsList';
import api from '../services/api';
import './CategoryDetailPage.css';

const CategoryDetailPage = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Log simple para verificar que el componente se está ejecutando


  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/categories/${slug}`);
        
        if (response.data.success) {
          setCategory(response.data.data.category);
        } else {
          setError(response.data.error || 'Error al obtener la categoría');
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Error al obtener la categoría');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCategory();
    }
  }, [slug]);

  const handleProductAdded = async (product) => {
    try {
      // Aquí puedes implementar la lógica para agregar el producto a la categoría
      // Mostrar mensaje de éxito
      if (window.showToast) {
        window.showToast('Producto agregado a la categoría exitosamente', 'success');
      }
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al agregar producto a la categoría', 'error');
      }
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Cargando... - Cherry Central</title>
        </Helmet>
        
        <main className="category-detail-page">
          <div className="container">
            <div className="category-detail-loading">
              <div className="loading-spinner"></div>
              <p>Cargando categoría...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !category) {
    return (
      <>
        <Helmet>
          <title>Error - Cherry Central</title>
        </Helmet>
        
        <main className="category-detail-page">
          <div className="container">
            <div className="category-detail-error">
              <h1>Error</h1>
              <p>{error || 'Categoría no encontrada'}</p>
              <Link to="/categorias" className="back-btn">
                Volver a Categorías
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{category.name} - Cherry Central</title>
        <meta name="description" content={category.description || `Explora ${category.name} en Cherry Central`} />
      </Helmet>

      <main className="category-detail-page">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="category-detail-breadcrumb">
            <Link to="/">Inicio</Link>
            <span className="separator">/</span>
            <Link to="/categorias">Categorías</Link>
            <span className="separator">/</span>
            <span className="current">{category.name}</span>
          </nav>

          {/* Header de la categoría */}
          <div className="category-detail-header">
            <div className="category-detail-info">
              <h1>{category.name}</h1>
              {category.description && (
                <p className="category-detail-description">{category.description}</p>
              )}
              {category.code && (
                <div className="category-detail-code">
                  <span>Código: {category.code}</span>
                </div>
              )}
            </div>
            
            <Link to="/categorias" className="back-to-categories-btn">
              ← Volver a Categorías
            </Link>
          </div>

          {/* Lista de productos externos */}
          
          {category.code && (
            <ExternalProductsList 
              categoryCode={category.code}
              onProductAdded={handleProductAdded}
            />
          )}

          {/* Mensaje si no hay código de categoría */}
          {!category.code && (
            <div className="category-detail-no-code">
              <p>Esta categoría no tiene código asignado para mostrar productos externos.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default CategoryDetailPage;
