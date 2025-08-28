import React from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
// No necesitamos catalogService aquí, solo usamos CatalogPage
import CatalogPage from './CatalogPage';

const CatalogProductsPage = () => {
  const { id } = useParams();
  

  return (
    <>
      <Helmet>
        <title>{`Catálogo ${id} - Cherry Central`}</title>
        <meta name="description" content="Descubre los productos de nuestro catálogo exclusivo" />
        <meta name="keywords" content="catálogo, productos, moda femenina, cherry central" />
      </Helmet>

      <CatalogPage catalogId={id} />
    </>
  );
};

export default CatalogProductsPage;
