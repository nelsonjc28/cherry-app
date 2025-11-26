/**
 * Utilidades para compartir productos con imágenes usando Web Share API
 */

import { generateS3ImageUrls } from '../api/cherryApi';

/**
 * Descargar una imagen y convertirla a File
 */
const downloadImageAsFile = async (imageUrl, filename) => {
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });
    return file;
  } catch (error) {
    console.error(`Error descargando imagen ${imageUrl}:`, error);
    return null;
  }
};

/**
 * Verificar si una imagen existe (no retorna error 404)
 */
const checkImageExists = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Obtener todas las imágenes disponibles de un producto
 */
const getAvailableProductImages = async (productId, maxImages = 12) => {
  const availableImages = [];

  // Intentar con numeración incremental: {id}_{index}.jpg
  // Paramos al alcanzar maxImages o tras 2 fallos consecutivos una vez hallada al menos 1 imagen
  let consecutiveMisses = 0;
  for (let i = 1; i <= maxImages; i++) {
    const url = `https://cherry-fotos.s3.amazonaws.com/shopify/${productId}/${productId}_${i}.jpg`;
    const exists = await checkImageExists(url);
    if (exists) {
      availableImages.push({ url, index: i });
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
      // Si ya encontramos al menos una y llevamos 2 fallos seguidos, asumimos fin
      if (availableImages.length > 0 && consecutiveMisses >= 2) {
        break;
      }
    }
  }

  // Fallback: si no encontramos nada, intentar al menos la primera usando util existente
  if (availableImages.length === 0) {
    const fallback = generateS3ImageUrls(productId, 1);
    const exists = await checkImageExists(fallback[0]);
    if (exists) {
      availableImages.push({ url: fallback[0], index: 1 });
    }
  }

  return availableImages;
};

/**
 * Compartir producto con todas sus imágenes usando Web Share API
 */
export const shareProductWithImages = async (product) => {
  const { id, title, price } = product;
  const productUrl = `${window.location.origin}/producto/${id}`;
  
  // Verificar si el navegador soporta Web Share API
  if (!navigator.share) {
    // Fallback: copiar URL al portapapeles
    try {
      await navigator.clipboard.writeText(productUrl);
      if (window.showToast) {
        window.showToast('Enlace copiado al portapapeles', 'success');
      }
      return;
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
      return;
    }
  }
  
  try {
    // Mostrar mensaje de carga
    if (window.showToast) {
      window.showToast('Descargando imágenes del producto...', 'info');
    }
    
    // Obtener todas las imágenes disponibles del producto
    const availableImages = await getAvailableProductImages(id);
    
    if (availableImages.length === 0) {
      // Si no hay imágenes, compartir solo texto
      await navigator.share({
        title: title,
        text: `Mira este producto: ${title}${price ? ` - ${price}` : ''}`,
        url: productUrl
      });
      return;
    }
    
    // Descargar todas las imágenes y convertirlas a File
    const imageFiles = [];
    for (const imageInfo of availableImages) {
      const filename = `${id}_${imageInfo.index}.jpg`;
      const file = await downloadImageAsFile(imageInfo.url, filename);
      if (file) {
        imageFiles.push(file);
      }
    }
    
    if (imageFiles.length === 0) {
      // Si no se pudieron descargar las imágenes, compartir solo texto
      await navigator.share({
        title: title,
        text: `Mira este producto: ${title}${price ? ` - ${price}` : ''}`,
        url: productUrl
      });
      return;
    }
    
    // Preparar texto para compartir
    const shareText = `Mira este producto: ${title}${price ? ` - ${price}` : ''}\n\n${productUrl}`;
    
    // Verificar si el navegador puede compartir archivos
    if (navigator.canShare && navigator.canShare({ files: imageFiles })) {
      // Compartir con imágenes
      await navigator.share({
        title: title,
        text: shareText,
        files: imageFiles
      });
      
      if (window.showToast) {
        window.showToast('¡Producto compartido exitosamente!', 'success');
      }
    } else {
      // Si no puede compartir archivos, compartir solo texto
      await navigator.share({
        title: title,
        text: shareText
      });
      
      if (window.showToast) {
        window.showToast('Producto compartido (imágenes no disponibles en este dispositivo)', 'info');
      }
    }
  } catch (error) {
    // Si el usuario cancela, no mostrar error
    if (error.name === 'AbortError') {
      return;
    }
    
    console.error('Error al compartir producto:', error);
    
    // Fallback: intentar compartir solo texto
    try {
      await navigator.share({
        title: title,
        text: `Mira este producto: ${title}${price ? ` - ${price}` : ''}\n\n${productUrl}`
      });
    } catch (fallbackError) {
      // Si también falla, copiar URL al portapapeles
      try {
        await navigator.clipboard.writeText(productUrl);
        if (window.showToast) {
          window.showToast('Enlace copiado al portapapeles', 'success');
        }
      } catch (clipboardError) {
        if (window.showToast) {
          window.showToast('Error al compartir producto', 'error');
        }
      }
    }
  }
};

