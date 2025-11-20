import { useState, useEffect } from 'react';
import { getFeaturedCatalogImagePath } from '../utils/assetPaths';
import api from '../services/api';

const useHomeCatalogs = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomeCatalogs = async () => {
      try {
        setLoading(true);
        const response = await api.get('/home-catalogs');

        console.log(response.data);
        
        if (response.data.success && response.data.catalogs) {
          // Mapear los catálogos con sus PDFs
          const catalogsWithImages = response.data.catalogs.map(catalog => {
            const hasPdf = catalog.pdfs && catalog.pdfs.length > 0;
            const pdfCount = catalog.pdfs ? catalog.pdfs.length : 0;
            
            return {
              id: catalog.id,
              name: catalog.name,
              description: catalog.description,
              image: catalog.image || getFeaturedCatalogImagePath('image_example_1.png'),
              display_order: catalog.display_order,
              hasPdf,
              pdfCount
            };
          });
          setCatalogs(catalogsWithImages);
        } else {
          // Si no hay catálogos ordenados, usar catálogos por defecto
          const defaultCatalogs = [
            { 
              id: 1,
              name: 'Colección Primavera', 
              description: 'Descubre nuestra colección exclusiva de primavera',
              image: getFeaturedCatalogImagePath('image_example_1.png'),
              display_order: 1,
              hasPdf: true,
              pdfCount: 3
            },
            { 
              id: 2,
              name: 'Colección Verano', 
              description: 'Lo mejor para el verano',
              image: getFeaturedCatalogImagePath('image_example_2.png'),
              display_order: 2,
              hasPdf: true,
              pdfCount: 2
            }
          ];
          setCatalogs(defaultCatalogs);
        }
        
        setError(null);
      } catch (err) {
        setError('Error al cargar catálogos');
        setCatalogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeCatalogs();
  }, []);

  return { catalogs, loading, error };
};

export default useHomeCatalogs;
