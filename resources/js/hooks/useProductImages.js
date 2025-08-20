import { useState, useEffect } from 'react';
import { getProductImageUrl, checkImageExists } from '../utils/productImageUtils';

/**
 * Hook personalizado para manejar imágenes de productos
 * @param {string} externalProductId - ID externo del producto
 * @param {number} imageNumber - Número de imagen (por defecto 1)
 * @returns {Object} Objeto con la URL de imagen y estado de carga
 */
export const useProductImage = (externalProductId, imageNumber = 1) => {
  const [imageUrl, setImageUrl] = useState('/images/placeholder-product.png');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!externalProductId) {
      setImageUrl('/images/placeholder-product.png');
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const url = getProductImageUrl(externalProductId, imageNumber);
        
        // Verificar si la imagen existe
        const exists = await checkImageExists(url);
        
        if (exists) {
          setImageUrl(url);
        } else {
          // Si la imagen principal no existe, intentar con la imagen 1
          if (imageNumber !== 1) {
            const fallbackUrl = getProductImageUrl(externalProductId, 1);
            const fallbackExists = await checkImageExists(fallbackUrl);
            
            if (fallbackExists) {
              setImageUrl(fallbackUrl);
            } else {
              setImageUrl('/images/placeholder-product.png');
            }
          } else {
            setImageUrl('/images/placeholder-product.png');
          }
        }
      } catch (err) {
        setError(err);
        setImageUrl('/images/placeholder-product.png');
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [externalProductId, imageNumber]);

  return { imageUrl, isLoading, error };
};

/**
 * Hook para manejar múltiples imágenes de un producto (galería)
 * @param {string} externalProductId - ID externo del producto
 * @param {number} maxImages - Número máximo de imágenes
 * @returns {Object} Objeto con las URLs de imágenes y estado de carga
 */
export const useProductImageGallery = (externalProductId, maxImages = 5) => {
  const [imageUrls, setImageUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!externalProductId) {
      setImageUrls(['/images/placeholder-product.png']);
      setIsLoading(false);
      return;
    }

    const loadImages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const urls = [];
        
        for (let i = 1; i <= maxImages; i++) {
          const url = getProductImageUrl(externalProductId, i);
          const exists = await checkImageExists(url);
          
          if (exists) {
            urls.push(url);
          }
        }
        
        // Si no se encontraron imágenes, usar placeholder
        if (urls.length === 0) {
          urls.push('/images/placeholder-product.png');
        }
        
        setImageUrls(urls);
      } catch (err) {
        setError(err);
        setImageUrls(['/images/placeholder-product.png']);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [externalProductId, maxImages]);

  return { imageUrls, isLoading, error };
};
