/**
 * Utilidades para compartir productos con imágenes usando Web Share API
 * Versión optimizada con gestión de memoria mejorada
 */

import { generateS3ImageUrls } from '../api/cherryApi';

// Variable global para prevenir múltiples ejecuciones simultáneas
let isSharing = false;

// Array para rastrear todas las URLs creadas y poder revocarlas
const createdObjectURLs = [];

/**
 * Limpiar todas las URLs creadas y resetear el estado de compartir
 */
const cleanupMemory = () => {
  // Revocar todas las URLs creadas
  createdObjectURLs.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignorar errores al revocar URLs ya revocadas
    }
  });
  createdObjectURLs.length = 0; // Limpiar el array
  
  // Resetear el flag de compartir
  isSharing = false;
};

/**
 * Crear ObjectURL y rastrearlo para limpieza posterior
 */
const createTrackedObjectURL = (blob) => {
  const url = URL.createObjectURL(blob);
  createdObjectURLs.push(url);
  return url;
};

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
      // Timeout silencioso
    }
    return null;
  }
};

/**
 * Descargar archivo al dispositivo (dispara descarga del navegador)
 * Con gestión de memoria mejorada
 */
const downloadFileToDevice = async (file) => {
  let objectURL = null;
  try {
    objectURL = createTrackedObjectURL(file);
    const a = document.createElement('a');
    a.href = objectURL;
    a.download = file.name || 'imagen.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Dar tiempo a que el navegador inicie la descarga antes de revocar
    setTimeout(() => {
      if (objectURL) {
        try {
          URL.revokeObjectURL(objectURL);
          const index = createdObjectURLs.indexOf(objectURL);
          if (index > -1) {
            createdObjectURLs.splice(index, 1);
          }
        } catch (e) {
          // Ignorar errores
        }
      }
    }, 1000);
    return true;
  } catch (e) {
    // Limpiar URL en caso de error
    if (objectURL) {
      try {
        URL.revokeObjectURL(objectURL);
        const index = createdObjectURLs.indexOf(objectURL);
        if (index > -1) {
          createdObjectURLs.splice(index, 1);
        }
      } catch (err) {
        // Ignorar errores
      }
    }
    return false;
  }
};

/**
 * Descargar todas las imágenes disponibles de un producto como Files
 * Usa el endpoint del servidor que cachea las imágenes localmente
 * - Recorre {id}_{n}.jpg hasta maxImages (máximo 5)
 * - Se detiene tras 2 fallos consecutivos una vez encontrada al menos 1
 * - Descarga imágenes en paralelo para mayor velocidad
 */
const collectProductImageFiles = async (productId, maxImages = 5) => {
  // Limitar a máximo 5 imágenes para evitar problemas de memoria
  const limit = Math.min(maxImages, 5);
  const files = [];
  let consecutiveMisses = 0;

  // Usar endpoint del servidor que cachea las imágenes
  const baseUrl = `${window.location.origin}/api/product-images`;

  // Intentar descargar las primeras 2 imágenes en paralelo (más rápido y menos carga)
  const parallelPromises = [];
  for (let i = 1; i <= Math.min(2, limit); i++) {
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

  // Si encontramos al menos una imagen, continuar secuencialmente
  if (files.length > 0) {
    for (let i = 3; i <= limit; i++) {
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

/**
 * Compartir producto con todas sus imágenes usando Web Share API
 * Versión mejorada con gestión de memoria y manejo de errores robusto
 */
export const shareProductWithImages = async (product) => {
  // Prevenir múltiples ejecuciones simultáneas
  if (isSharing) {
    if (window.showToast) {
      window.showToast('Ya se está compartiendo un producto. Espera un momento...', 'info');
    }
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
  let imageFiles = [];

  try {
    if (window.showToast) {
      window.showToast('Cargando imágenes del producto...', 'info');
    }

    // Cargar imágenes como Files en memoria (máximo 5 imágenes)
    const imageFilesPromise = collectProductImageFiles(id, 5);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout al cargar imágenes')), 15000) // Timeout de 15s
    );
    
    imageFiles = await Promise.race([imageFilesPromise, timeoutPromise]);

    // Generar texto de compartir con formato específico
    const shareText = generateShareText({
      title,
      price,
      finalPrice,
      discountPercentage,
      hasDiscount
    });

    // Si no hay imágenes, compartir solo texto
    if (imageFiles.length === 0) {
      // Limpiar memoria antes de compartir texto
      cleanupMemory();
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: shareText,
            url: productUrl
          });
          if (window.showToast) window.showToast('¡Producto compartido!', 'success');
          return;
        } catch (shareError) {
          // Si el usuario cancela, resetear estado y salir
          if (shareError.name === 'AbortError') {
            cleanupMemory();
            return;
          }
          // Si hay otro error, intentar copiar al portapapeles
        }
      }
      
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${productUrl}`);
        if (window.showToast) window.showToast('Enlace copiado al portapapeles', 'success');
      } catch (clipboardError) {
        if (window.showToast) window.showToast('No se pudo compartir. Intenta nuevamente.', 'error');
      }
      return;
    }

    // Validar soporte para compartir archivos ANTES de intentar compartir
    const canShareFiles = navigator.share && 
                         navigator.canShare && 
                         navigator.canShare({ files: imageFiles });

    // Intentar compartir directamente con las imágenes usando Web Share API
    if (canShareFiles) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          files: imageFiles
        });
        
        // Limpiar memoria después de compartir exitosamente
        cleanupMemory();
        
        if (window.showToast) window.showToast('¡Producto compartido!', 'success');
        return;
      } catch (shareError) {
        // Si el usuario cancela, resetear estado inmediatamente
        if (shareError.name === 'AbortError') {
          cleanupMemory();
          return;
        }
        // Si hay otro error, continuar con fallback
      }
    }
    
    // Si no puede compartir archivos o falló, intentar compartir solo texto/URL
    if (navigator.share) {
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
        
        // Descargar imágenes secuencialmente con limpieza de memoria
        for (const file of imageFiles) {
          await downloadFileToDevice(file);
          await new Promise(r => setTimeout(r, 200));
        }
        
        // Limpiar memoria después de descargar
        cleanupMemory();
        
        if (window.showToast) {
          window.showToast('Imágenes descargadas', 'success');
        }
        return;
      } catch (textShareError) {
        // Si el usuario cancela, resetear estado inmediatamente
        if (textShareError.name === 'AbortError') {
          cleanupMemory();
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
    
    // Limpiar memoria después de descargar
    cleanupMemory();
    
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${productUrl}`);
      if (window.showToast) {
        window.showToast('Imágenes descargadas. Enlace copiado al portapapeles.', 'success');
      }
    } catch (clipboardError) {
      if (window.showToast) {
        window.showToast('Imágenes descargadas. No se pudo copiar el enlace.', 'info');
      }
    }
  } catch (error) {
    // Limpiar memoria en caso de error
    cleanupMemory();
    
    // Si el usuario cancela, no mostrar error
    if (error.name === 'AbortError') {
      return;
    }
    
    // Fallback final: descargar imágenes y copiar URL
    try {
      if (window.showToast) {
        window.showToast('Descargando imágenes...', 'info');
      }
      
      // Intentar obtener imágenes nuevamente (máximo 5)
      const fallbackImageFiles = await collectProductImageFiles(id, 5);
      
      for (const file of fallbackImageFiles) {
        await downloadFileToDevice(file);
        await new Promise(r => setTimeout(r, 200));
      }
      
      // Limpiar memoria después de descargar
      cleanupMemory();
      
      const fallbackShareText = generateShareText({
        title: title || 'Producto Cherry',
        price: price || 0,
        finalPrice: finalPrice || price || 0,
        discountPercentage: discountPercentage || 0,
        hasDiscount: hasDiscount || false
      });
      
      try {
        await navigator.clipboard.writeText(`${fallbackShareText}\n\n${productUrl}`);
        if (window.showToast) {
          window.showToast('Imágenes descargadas. Enlace copiado.', 'info');
        }
      } catch (clipboardError) {
        if (window.showToast) {
          window.showToast('Imágenes descargadas.', 'info');
        }
      }
    } catch (fallbackError) {
      // Limpiar memoria incluso en caso de error del fallback
      cleanupMemory();
      
      if (window.showToast) {
        window.showToast('No se pudo compartir. Intenta nuevamente.', 'error');
      }
    }
  } finally {
    // Asegurar limpieza de memoria al finalizar
    cleanupMemory();
  }
};

/**
 * Compartir PDF de catálogo usando Web Share API
 * Versión mejorada con gestión de memoria
 */
export const shareCatalogPdf = async (pdfInfo) => {
  // Prevenir múltiples ejecuciones simultáneas
  if (isSharing) {
    if (window.showToast) {
      window.showToast('Ya se está compartiendo un catálogo. Espera un momento...', 'info');
    }
    return;
  }

  const { pdf_url, pdf_name, catalogName } = pdfInfo;
  const catalogUrl = window.location.href;

  if (!pdf_url) {
    throw new Error('No hay PDF disponible para compartir');
  }

  isSharing = true;
  let blob = null;
  let objectURL = null;

  try {
    if (window.showToast) {
      window.showToast('Cargando PDF del catálogo...', 'info');
    }

    // Descargar el PDF desde el servidor con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout de 15s
    
    const response = await fetch(pdf_url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Error al descargar el PDF');
    }

    blob = await response.blob();
    const file = new File([blob], pdf_name || 'catalogo.pdf', { type: 'application/pdf' });

    // Generar texto de compartir
    const shareText = `Checa este catálogo que tenemos para ti: ${catalogName || 'Catálogo Cherry'}\n\nPregunta por productos disponibles y precios especiales.`;

    // Validar soporte para compartir archivos ANTES de intentar compartir
    const canShareFiles = navigator.share && 
                         navigator.canShare && 
                         navigator.canShare({ files: [file] });

    // Intentar compartir directamente con el PDF usando Web Share API
    if (canShareFiles) {
      try {
        await navigator.share({
          title: catalogName || 'Catálogo Cherry',
          text: shareText,
          files: [file]
        });
        
        // Limpiar memoria después de compartir exitosamente
        cleanupMemory();
        
        if (window.showToast) window.showToast('¡Catálogo PDF compartido!', 'success');
        return;
      } catch (shareError) {
        // Si el usuario cancela, resetear estado inmediatamente
        if (shareError.name === 'AbortError') {
          cleanupMemory();
          return;
        }
        // Si hay otro error, continuar con fallback
      }
    }
    
    // Si no puede compartir archivos o falló, intentar compartir solo texto/URL
    if (navigator.share) {
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
        
        // Descargar PDF con gestión de memoria
        objectURL = createTrackedObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectURL;
        a.download = pdf_name || 'catalogo.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Revocar URL después de un delay
        setTimeout(() => {
          if (objectURL) {
            try {
              URL.revokeObjectURL(objectURL);
              const index = createdObjectURLs.indexOf(objectURL);
              if (index > -1) {
                createdObjectURLs.splice(index, 1);
              }
            } catch (e) {
              // Ignorar errores
            }
          }
        }, 1000);
        
        // Limpiar memoria
        cleanupMemory();
        
        if (window.showToast) {
          window.showToast('PDF descargado', 'success');
        }
        return;
      } catch (textShareError) {
        // Si el usuario cancela, resetear estado inmediatamente
        if (textShareError.name === 'AbortError') {
          cleanupMemory();
          return;
        }
        throw textShareError;
      }
    }

    // Si no hay soporte para navigator.share, descargar el PDF y copiar URL
    if (window.showToast) {
      window.showToast('Descargando PDF...', 'info');
    }
    
    objectURL = createTrackedObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectURL;
    a.download = pdf_name || 'catalogo.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Revocar URL después de un delay
    setTimeout(() => {
      if (objectURL) {
        try {
          URL.revokeObjectURL(objectURL);
          const index = createdObjectURLs.indexOf(objectURL);
          if (index > -1) {
            createdObjectURLs.splice(index, 1);
          }
        } catch (e) {
          // Ignorar errores
        }
      }
    }, 1000);
    
    // Limpiar memoria
    cleanupMemory();
    
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${catalogUrl}`);
      if (window.showToast) {
        window.showToast('PDF descargado. Enlace copiado al portapapeles.', 'success');
      }
    } catch (clipboardError) {
      if (window.showToast) {
        window.showToast('PDF descargado. No se pudo copiar el enlace.', 'info');
      }
    }
  } catch (error) {
    // Limpiar memoria en caso de error
    if (objectURL) {
      try {
        URL.revokeObjectURL(objectURL);
        const index = createdObjectURLs.indexOf(objectURL);
        if (index > -1) {
          createdObjectURLs.splice(index, 1);
        }
      } catch (e) {
        // Ignorar errores
      }
    }
    cleanupMemory();
    
    // Si el usuario cancela, no mostrar error
    if (error.name === 'AbortError') {
      return;
    }
    
    // Fallback final: descargar PDF y copiar URL
    try {
      if (window.showToast) {
        window.showToast('Descargando PDF...', 'info');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const fallbackResponse = await fetch(pdf_url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!fallbackResponse.ok) {
        throw new Error('Error al descargar el PDF');
      }
      
      const fallbackBlob = await fallbackResponse.blob();
      const fallbackObjectURL = createTrackedObjectURL(fallbackBlob);
      const fallbackA = document.createElement('a');
      fallbackA.href = fallbackObjectURL;
      fallbackA.download = pdf_name || 'catalogo.pdf';
      document.body.appendChild(fallbackA);
      fallbackA.click();
      document.body.removeChild(fallbackA);
      
      // Revocar URL después de un delay
      setTimeout(() => {
        if (fallbackObjectURL) {
          try {
            URL.revokeObjectURL(fallbackObjectURL);
            const index = createdObjectURLs.indexOf(fallbackObjectURL);
            if (index > -1) {
              createdObjectURLs.splice(index, 1);
            }
          } catch (e) {
            // Ignorar errores
          }
        }
      }, 1000);
      
      // Limpiar memoria
      cleanupMemory();
      
      const fallbackShareText = `Checa este catálogo que tenemos para ti: ${catalogName || 'Catálogo Cherry'}\n\nPregunta por productos disponibles y precios especiales.`;
      
      try {
        await navigator.clipboard.writeText(`${fallbackShareText}\n\n${catalogUrl}`);
        if (window.showToast) {
          window.showToast('PDF descargado. Enlace copiado.', 'info');
        }
      } catch (clipboardError) {
        if (window.showToast) {
          window.showToast('PDF descargado.', 'info');
        }
      }
    } catch (fallbackError) {
      // Limpiar memoria incluso en caso de error del fallback
      cleanupMemory();
      
      if (window.showToast) {
        window.showToast('No se pudo compartir. Intenta nuevamente.', 'error');
      }
    }
  } finally {
    // Asegurar limpieza de memoria al finalizar
    cleanupMemory();
  }
};
