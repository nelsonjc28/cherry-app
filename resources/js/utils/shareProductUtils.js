/**
 * Utilidades para compartir productos con imágenes usando Web Share API
 */

import { generateS3ImageUrls } from '../api/cherryApi';

/**
 * Descargar una imagen (GET) y devolverla como File
 * Nota: usamos GET directo (no HEAD) para evitar problemas de CORS con S3.
 * Con timeout para evitar esperas infinitas
 */
const fetchImageAsFile = async (imageUrl, filename, timeout = 5000) => {
  try {
    // Crear un AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(imageUrl, { 
      mode: 'cors', 
      credentials: 'omit',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    const blob = await response.blob();
    // Asegurar tipo de imagen
    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    return new File([blob], filename, { type });
  } catch (error) {
    if (error.name === 'AbortError') {
    }
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
 * - Descarga imágenes en paralelo para mayor velocidad
 */
const collectProductImageFiles = async (productId, maxImages = 12) => {
  const files = [];
  let consecutiveMisses = 0;

  // Usar endpoint del servidor que cachea las imágenes
  const baseUrl = `${window.location.origin}/api/product-images`;

  // Intentar descargar las primeras 2 imágenes en paralelo (más rápido y menos carga)
  const parallelPromises = [];
  for (let i = 1; i <= Math.min(2, maxImages); i++) {
    const url = `${baseUrl}/${productId}/${i}`;
    parallelPromises.push(
      fetchImageAsFile(url, `${productId}_${i}.jpg`, 3000) // Timeout de 3s por imagen
        .then(file => ({ index: i, file }))
        .catch(() => ({ index: i, file: null }))
    );
  }

  // Esperar las primeras imágenes en paralelo
  const parallelResults = await Promise.all(parallelPromises);
  for (const { file } of parallelResults) {
    if (file) {
      files.push(file);
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
    }
  }

  // Si encontramos al menos una imagen, continuar secuencialmente (más rápido que paralelo para muchas imágenes)
  if (files.length > 0) {
    for (let i = 3; i <= maxImages; i++) {
      if (consecutiveMisses >= 2) break;
      
      const url = `${baseUrl}/${productId}/${i}`;
      const file = await fetchImageAsFile(url, `${productId}_${i}.jpg`, 3000);
      if (file) {
        files.push(file);
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
      }
    }
  } else {
    // Fallback: intentar al menos la primera imagen desde S3 directamente
    const fallback = generateS3ImageUrls(productId, 1);
    const file = await fetchImageAsFile(fallback[0], `${productId}_1.jpg`, 5000);
    if (file) files.push(file);
  }

  return files;
};

/**
 * Formatear precio para compartir (sin símbolo de peso, solo número)
 */
const formatPriceForShare = (price) => {
  if (!price || price === 0) return '0';
  return price.toFixed(2).replace(/\.00$/, '');
};

/**
 * Generar texto de compartir con formato específico
 */
const generateShareText = (productData) => {
  const title = productData.title || 'Producto';
  
  let text = `Checa este producto que tenemos para ti *${title}*`;
  text += ` pregunta por colores y tallas disponibles`;
  
  return text;
};

// Variable global para prevenir múltiples ejecuciones simultáneas
let isSharing = false;

/**
 * Compartir producto con todas sus imágenes usando Web Share API
 */
export const shareProductWithImages = async (product) => {
  // Prevenir múltiples ejecuciones simultáneas
  if (isSharing) {
    return;
  }

  const id = product.id;
  const title = product.title || 'Producto Cherry';
  const price = product.price || 0;
  const finalPrice = product.finalPrice || product.price || 0;
  const discountPercentage = product.discountPercentage || 0;
  const hasDiscount = product.hasDiscount || false;
  
  const productUrl = `${window.location.origin}/producto/${id}`;

  isSharing = true;

  try {
    if (window.showToast) {
      window.showToast('Cargando imágenes del producto...', 'info');
    }

    // Cargar imágenes como Files en memoria (con timeout para evitar esperas infinitas)
    const imageFilesPromise = collectProductImageFiles(id, 6); // Reducir a 6 imágenes para mayor velocidad
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout al cargar imágenes')), 10000) // Reducir timeout a 10s
    );
    
    const imageFiles = await Promise.race([imageFilesPromise, timeoutPromise]);

    // Generar texto de compartir con formato específico
    const shareText = generateShareText({
      title,
      price,
      finalPrice,
      discountPercentage,
      hasDiscount
    });

    if (imageFiles.length === 0) {
      // Sin imágenes: al menos comparte texto
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: shareText,
          url: productUrl
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n\n${productUrl}`);
        if (window.showToast) window.showToast('Enlace copiado al portapapeles', 'success');
      }
      return;
    }

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
    await navigator.clipboard.writeText(`${shareText}\n\n${productUrl}`);
    if (window.showToast) {
      window.showToast('Imágenes descargadas. Enlace copiado al portapapeles.', 'success');
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    
    // Fallback final: descargar imágenes y copiar URL
    try {
      if (window.showToast) {
        window.showToast('Descargando imágenes...', 'info');
      }
      const fallbackImageFiles = await collectProductImageFiles(id, 12);
      for (const file of fallbackImageFiles) {
        await downloadFileToDevice(file);
        await new Promise(r => setTimeout(r, 200));
      }
      const fallbackShareText = generateShareText({
        title: title || 'Producto Cherry',
        price: price || 0,
        finalPrice: finalPrice || price || 0,
        discountPercentage: discountPercentage || 0,
        hasDiscount: hasDiscount || false
      });
      await navigator.clipboard.writeText(`${fallbackShareText}\n\n${productUrl}`);
      if (window.showToast) {
        window.showToast('Imágenes descargadas. Enlace copiado.', 'info');
      }
    } catch (fallbackError) {
      if (window.showToast) {
        window.showToast('No se pudo compartir. Intenta nuevamente.', 'error');
      }
    }
  }
};

/**
 * Compartir PDF de catálogo usando Web Share API
 */
export const shareCatalogPdf = async (pdfInfo) => {
  const { pdf_url, pdf_name, catalogName } = pdfInfo;
  const catalogUrl = window.location.href;

  if (!pdf_url) {
    throw new Error('No hay PDF disponible para compartir');
  }

  try {
    if (window.showToast) {
      window.showToast('Cargando PDF del catálogo...', 'info');
    }

    // Descargar el PDF desde el servidor
    const response = await fetch(pdf_url);
    if (!response.ok) {
      throw new Error('Error al descargar el PDF');
    }

    const blob = await response.blob();
    const file = new File([blob], pdf_name || 'catalogo.pdf', { type: 'application/pdf' });

    // Generar texto de compartir
    const shareText = `Checa este catálogo que tenemos para ti: ${catalogName || 'Catálogo Cherry'}\n\nPregunta por productos disponibles y precios especiales.`;

    // Intentar compartir directamente con el PDF usando Web Share API
    if (navigator.share) {
      // Verificar si puede compartir archivos
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: catalogName || 'Catálogo Cherry',
            text: shareText,
            files: [file]
          });
          if (window.showToast) window.showToast('¡Catálogo PDF compartido!', 'success');
          return;
        } catch (shareError) {
          // Si el usuario cancela, no hacer nada más
          if (shareError.name === 'AbortError') {
            return;
          }
          // Si hay otro error, intentar compartir solo texto
        }
      }
      
      // Si no puede compartir archivos o falló, intentar compartir solo texto/URL
      try {
        await navigator.share({
          title: catalogName || 'Catálogo Cherry',
          text: shareText,
          url: catalogUrl
        });
        // Si compartió solo texto, descargar el PDF como fallback
        if (window.showToast) {
          window.showToast('Compartido. Descargando PDF...', 'info');
        }
        // Descargar PDF
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdf_name || 'catalogo.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.showToast) {
          window.showToast('PDF descargado', 'success');
        }
        return;
      } catch (textShareError) {
        if (textShareError.name === 'AbortError') {
          return;
        }
        throw textShareError;
      }
    }

    // Si no hay soporte para navigator.share, descargar el PDF y copiar URL
    if (window.showToast) {
      window.showToast('Descargando PDF...', 'info');
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdf_name || 'catalogo.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    await navigator.clipboard.writeText(`${shareText}\n\n${catalogUrl}`);
    if (window.showToast) {
      window.showToast('PDF descargado. Enlace copiado al portapapeles.', 'success');
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    
    // Fallback final: descargar PDF y copiar URL
    try {
      if (window.showToast) {
        window.showToast('Descargando PDF...', 'info');
      }
      const fallbackResponse = await fetch(pdf_url);
      if (!fallbackResponse.ok) {
        throw new Error('Error al descargar el PDF');
      }
      const fallbackBlob = await fallbackResponse.blob();
      const fallbackUrl = URL.createObjectURL(fallbackBlob);
      const fallbackA = document.createElement('a');
      fallbackA.href = fallbackUrl;
      fallbackA.download = pdf_name || 'catalogo.pdf';
      document.body.appendChild(fallbackA);
      fallbackA.click();
      document.body.removeChild(fallbackA);
      URL.revokeObjectURL(fallbackUrl);
      const fallbackShareText = `Checa este catálogo que tenemos para ti: ${catalogName || 'Catálogo Cherry'}\n\nPregunta por productos disponibles y precios especiales.`;
      await navigator.clipboard.writeText(`${fallbackShareText}\n\n${catalogUrl}`);
      if (window.showToast) {
        window.showToast('PDF descargado. Enlace copiado.', 'info');
      }
    } catch (fallbackError) {
      if (window.showToast) {
        window.showToast('No se pudo compartir. Intenta nuevamente.', 'error');
      }
    }
  }
};

