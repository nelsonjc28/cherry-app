/**
 * Utilidades para compartir productos con imágenes usando Web Share API
 */

import { generateS3ImageUrls } from '../api/cherryApi';

/**
 * Descargar una imagen (GET) y devolverla como File
 * Nota: usamos GET directo (no HEAD) para evitar problemas de CORS con S3.
 */
const fetchImageAsFile = async (imageUrl, filename) => {
  try {
    const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return null;
    const blob = await response.blob();
    // Asegurar tipo de imagen
    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    return new File([blob], filename, { type });
  } catch (error) {
    return null;
  }
};

/**
 * Descargar archivo al dispositivo (dispara descarga del navegador)
 */
const downloadFileToDevice = async (file) => {
  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'imagen.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Dar tiempo a que el navegador inicie la descarga antes de revocar
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Descargar todas las imágenes disponibles de un producto como Files
 * Usa el endpoint del servidor que cachea las imágenes localmente
 * - Recorre {id}_{n}.jpg hasta maxImages
 * - Se detiene tras 2 fallos consecutivos una vez encontrada al menos 1
 */
const collectProductImageFiles = async (productId, maxImages = 12) => {
  const files = [];
  let consecutiveMisses = 0;

  // Usar endpoint del servidor que cachea las imágenes
  const baseUrl = `${window.location.origin}/api/product-images`;

  for (let i = 1; i <= maxImages; i++) {
    // Usar endpoint del servidor en lugar de S3 directamente
    const url = `${baseUrl}/${productId}/${i}`;
    const file = await fetchImageAsFile(url, `${productId}_${i}.jpg`);
    if (file) {
      files.push(file);
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
      if (files.length > 0 && consecutiveMisses >= 2) break;
    }
  }

  // Fallback: intentar al menos la primera imagen desde S3 directamente
  if (files.length === 0) {
    const fallback = generateS3ImageUrls(productId, 1);
    const file = await fetchImageAsFile(fallback[0], `${productId}_1.jpg`);
    if (file) files.push(file);
  }

  return files;
};

/**
 * Compartir producto con todas sus imágenes usando Web Share API
 */
export const shareProductWithImages = async (product) => {
  const { id, title, price } = product;
  const productUrl = `${window.location.origin}/producto/${id}`;

  try {
    if (window.showToast) {
      window.showToast('Cargando imágenes del producto...', 'info');
    }

    // Cargar imágenes como Files en memoria
    const imageFiles = await collectProductImageFiles(id, 12);

    if (imageFiles.length === 0) {
      // Sin imágenes: al menos comparte texto
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `Mira este producto: ${title}${price ? ` - ${price}` : ''}`,
          url: productUrl
        });
      } else {
        await navigator.clipboard.writeText(productUrl);
        if (window.showToast) window.showToast('Enlace copiado al portapapeles', 'success');
      }
      return;
    }

    // Preparar texto para compartir
    const shareText = `Mira este producto: ${title}${price ? ` - ${price}` : ''}\n\n${productUrl}`;

    // Intentar compartir directamente con las imágenes usando Web Share API
    if (navigator.share) {
      // Verificar si puede compartir archivos
      if (navigator.canShare && navigator.canShare({ files: imageFiles })) {
        try {
          await navigator.share({
            title: title,
            text: shareText,
            files: imageFiles
          });
          if (window.showToast) window.showToast('¡Producto compartido!', 'success');
          return;
        } catch (shareError) {
          // Si el usuario cancela, no hacer nada más
          if (shareError.name === 'AbortError') {
            return;
          }
          // Si hay otro error, intentar compartir solo texto
          console.warn('Error al compartir con archivos, intentando solo texto:', shareError);
        }
      }
      
      // Si no puede compartir archivos o falló, intentar compartir solo texto/URL
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: productUrl
        });
        // Si compartió solo texto, descargar las imágenes como fallback
        if (window.showToast) {
          window.showToast('Compartido. Descargando imágenes...', 'info');
        }
        // Descargar imágenes secuencialmente
        for (const file of imageFiles) {
          await downloadFileToDevice(file);
          await new Promise(r => setTimeout(r, 200));
        }
        if (window.showToast) {
          window.showToast('Imágenes descargadas', 'success');
        }
        return;
      } catch (textShareError) {
        if (textShareError.name === 'AbortError') {
          return;
        }
        throw textShareError;
      }
    }

    // Si no hay soporte para navigator.share, descargar las imágenes y copiar URL
    if (window.showToast) {
      window.showToast('Descargando imágenes...', 'info');
    }
    for (const file of imageFiles) {
      await downloadFileToDevice(file);
      await new Promise(r => setTimeout(r, 200));
    }
    await navigator.clipboard.writeText(productUrl);
    if (window.showToast) {
      window.showToast('Imágenes descargadas. Enlace copiado al portapapeles.', 'success');
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Error al compartir producto:', error);
    
    // Fallback final: descargar imágenes y copiar URL
    try {
      if (window.showToast) {
        window.showToast('Descargando imágenes...', 'info');
      }
      const imageFiles = await collectProductImageFiles(id, 12);
      for (const file of imageFiles) {
        await downloadFileToDevice(file);
        await new Promise(r => setTimeout(r, 200));
      }
      await navigator.clipboard.writeText(productUrl);
      if (window.showToast) {
        window.showToast('Imágenes descargadas. Enlace copiado.', 'info');
      }
    } catch (fallbackError) {
      console.error('Error en fallback:', fallbackError);
      if (window.showToast) {
        window.showToast('No se pudo compartir. Intenta nuevamente.', 'error');
      }
    }
  }
};

