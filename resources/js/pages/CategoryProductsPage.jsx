import React from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import CategoryPage from './CategoryPage';

const CategoryProductsPage = () => {
  const { slug } = useParams();
  
  // Debug: verificar que estamos recibiendo el slug
  console.log('CategoryProductsPage - Slug recibido:', slug);

  return (
    <>
      <Helmet>
        <title>{`Categoría ${slug} - Cherry Central`}</title>
        <meta name="description" content="Descubre los productos de nuestra categoría exclusiva" />
        <meta name="keywords" content="categoría, productos, moda femenina, cherry central" />
      </Helmet>

      <CategoryPage categorySlug={slug} />
    </>
  );
};

export default CategoryProductsPage;
