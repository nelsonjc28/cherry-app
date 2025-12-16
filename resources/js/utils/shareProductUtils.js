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
      window.showToast('Descargando imágenes del producto...', 'info');
    }

    // Descargar imágenes como Files
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

    // 1) Descargar al dispositivo (secuencial para evitar bloqueos del navegador)
    for (const file of imageFiles) {
      await downloadFileToDevice(file);
      // Pequeño delay entre descargas
      await new Promise(r => setTimeout(r, 200));
    }

    // 2) Luego compartir imágenes con el texto
    const shareText = `Mira este producto: ${title}${price ? ` - ${price}` : ''}\n\n${productUrl}`;

    if (navigator.share) {
      if (navigator.canShare && navigator.canShare({ files: imageFiles })) {
        await navigator.share({
          title: title,
          text: shareText,
          files: imageFiles
        });
      } else {
        await navigator.share({
          title: title,
          text: shareText,
          url: productUrl
        });
      }
      if (window.showToast) window.showToast('¡Imágenes descargadas y producto compartido!', 'success');
    } else {
      // Fallback: copiar URL
      await navigator.clipboard.writeText(productUrl);
      if (window.showToast) window.showToast('Imágenes descargadas. Enlace copiado al portapapeles.', 'info');
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    // Fallback final
    try {
      await navigator.clipboard.writeText(productUrl);
      if (window.showToast) window.showToast('No se pudo compartir. Enlace copiado.', 'error');
    } catch {}
  }
};

