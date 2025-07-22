import { useState, useEffect } from 'react';
import { generateS3ImageUrl } from '../api/cherryApi';

const useCatalogs = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all catalogs from external API
  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
      
      if (!response.ok) {
        throw new Error('Error al cargar los catálogos desde la API externa');
      }
      
      const data = await response.json();
      
      // Process the data to extract unique catalogs by temporada
      const catalogMap = new Map();
      
      data.forEach(product => {
        if (product.temporada) {
          const catalogName = product.temporada;
          const catalogSlug = catalogName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          
          if (!catalogMap.has(catalogSlug)) {
            catalogMap.set(catalogSlug, {
              id: catalogSlug,
              name: catalogName,
              slug: catalogSlug,
              description: `Catálogo ${catalogName}`,
              product_count: 0,
              season: catalogName,
              active: product.opc_catalogo === 'S'
            });
          }
          
          // Count products in this catalog
          const catalog = catalogMap.get(catalogSlug);
          catalog.product_count++;
        }
      });
      
      const catalogsArray = Array.from(catalogMap.values());
      setCatalogs(catalogsArray);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products by catalog from external API
  const fetchProductsByCatalog = async (catalogSlug) => {
    try {
      setLoading(true);
      const response = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
      
      if (!response.ok) {
        throw new Error('Error al cargar los productos del catálogo');
      }
      
      const data = await response.json();
      
      // Filter products by catalog/temporada
      const catalogProducts = data.filter(product => {
        if (!product.temporada) return false;
        const productCatalogSlug = product.temporada.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return productCatalogSlug === catalogSlug;
      });
      
      // Transform products to match our expected format
      const transformedProducts = catalogProducts.map(product => ({
        id: product.id_articulo,
        title: product.descripcion,
        price: product.precio1,
        image: generateS3ImageUrl(product.id_articulo),
        rating: 4.5, // Default rating since API doesn't provide it
        description: product.descripcion,
        marca: product.marca,
        stock: product.inventario,
        detalles: product.detalles || [],
        temporada: product.temporada,
        catalogoId: product.catalogoId,
        opc_catalogo: product.opc_catalogo,
        desc_promo: product.desc_promo || 0,
        opc_promo: product.opc_promo
      }));
      
      return transformedProducts;
      
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch catalog details from external API
  const fetchCatalogDetails = async (catalogSlug) => {
    try {
      setLoading(true);
      const response = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
      
      if (!response.ok) {
        throw new Error('Error al cargar los detalles del catálogo');
      }
      
      const data = await response.json();
      
      // Find the catalog
      const catalogData = data.find(product => {
        if (!product.temporada) return false;
        const productCatalogSlug = product.temporada.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return productCatalogSlug === catalogSlug;
      });
      
      if (!catalogData) {
        return null;
      }
      
      const catalogName = catalogData.temporada;
      
      return {
        id: catalogSlug,
        name: catalogName,
        slug: catalogSlug,
        description: `Catálogo ${catalogName}`,
        product_count: data.filter(p => p.temporada === catalogName).length,
        season: catalogName,
        active: catalogData.opc_catalogo === 'S'
      };
      
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get seasonal catalog mapping
  const getSeasonalCatalogMapping = () => {
    return {
      'primavera-verano': 'L-2025',
      'otono-invierno': 'L-2024',
      'verano': 'L-2025',
      'invierno': 'L-2024'
    };
  };

  // Fetch products by seasonal catalog
  const fetchProductsBySeasonalCatalog = async (seasonalCatalog) => {
    try {
      setLoading(true);
      const response = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
      
      if (!response.ok) {
        throw new Error('Error al cargar los productos del catálogo de temporada');
      }
      
      const data = await response.json();
      
      const seasonalMapping = getSeasonalCatalogMapping();
      const targetSeason = seasonalMapping[seasonalCatalog];
      
      // Filter products by season
      const seasonalProducts = data.filter(product => {
        if (!product.temporada) return false;
        return product.temporada.includes(targetSeason);
      });
      
      // Transform products to match our expected format
      const transformedProducts = seasonalProducts.map(product => ({
        id: product.id_articulo,
        title: product.descripcion,
        price: product.precio1,
        image: generateS3ImageUrl(product.id_articulo),
        rating: 4.5,
        description: product.descripcion,
        marca: product.marca,
        stock: product.inventario,
        detalles: product.detalles || [],
        temporada: product.temporada,
        catalogoId: product.catalogoId,
        opc_catalogo: product.opc_catalogo,
        desc_promo: product.desc_promo || 0,
        opc_promo: product.opc_promo
      }));
      
      return transformedProducts;
      
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  return {
    catalogs,
    loading,
    error,
    fetchProductsByCatalog,
    fetchCatalogDetails,
    fetchProductsBySeasonalCatalog,
    getSeasonalCatalogMapping,
    refetch: fetchCatalogs
  };
};

export default useCatalogs; 