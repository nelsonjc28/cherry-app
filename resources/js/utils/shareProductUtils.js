/**
 * Utilidades para compartir productos con imágenes usando Web Share API
 * Versión optimizada con gestión de memoria mejorada
 */

import { generateS3ImageUrls } from '../api/cherryApi';

// Array para rastrear todas las URLs creadas y poder revocarlas
const createdObjectURLs = [];

// Map para rastrear ejecuciones en curso por ID de producto/catálogo
const activeShares = new Map();

/**
 * Limpiar todas las URLs creadas para un ID específico
 */
const cleanupMemory = (id = null) => {
  // Revocar todas las URLs creadas
  createdObjectURLs.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignorar errores al revocar URLs ya revocadas
    }
  });
  createdObjectURLs.length = 0; // Limpiar el array
  
  // Remover de ejecuciones activas si se proporciona ID
  if (id) {
    activeShares.delete(id);
  }
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
 * Con timeout optimizado para respuesta rápida en móviles
 */
const fetchImageAsFile = async (imageUrl, filename, timeout = 4000) => {
  try {
    // Crear un AbortController para timeout más corto en móviles
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(imageUrl, { 
      mode: 'cors', 
      credentials: 'omit',
      signal: controller.signal,
      cache: 'force-cache' // Usar caché para acelerar
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
 * Versión optimizada para respuesta rápida en móviles
 * - Recorre {id}_{n}.jpg hasta maxImages (máximo 5)
 * - Se detiene tras 2 fallos consecutivos una vez encontrada al menos 1
 * - Descarga imágenes en paralelo para máxima velocidad
 */
const collectProductImageFiles = async (productId, maxImages = 5) => {
  // Limitar a máximo 5 imágenes para evitar problemas de memoria
  const limit = Math.min(maxImages, 5);
  const files = [];
  let consecutiveMisses = 0;

  // Usar endpoint del servidor que cachea las imágenes
  const baseUrl = `${window.location.origin}/api/product-images`;

  // Intentar descargar TODAS las imágenes en paralelo para máxima velocidad
  // Esto es crítico para que navigator.share reciba los archivos rápidamente
  const parallelPromises = [];
  for (let i = 1; i <= limit; i++) {
    const url = `${baseUrl}/${productId}/${i}`;
    parallelPromises.push(
      fetchImageAsFile(url, `${productId}_${i}.jpg`, 2500) // Timeout reducido a 2.5s
        .then(file => ({ index: i, file }))
        .catch(() => ({ index: i, file: null }))
    );
  }

  // Esperar todas las imágenes en paralelo
  const parallelResults = await Promise.all(parallelPromises);
  
  // Ordenar por índice y agregar solo las que se descargaron exitosamente
  parallelResults
    .sort((a, b) => a.index - b.index)
    .forEach(({ file }) => {
      if (file) {
        files.push(file);
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
        // Si tenemos al menos una imagen y hay 2 fallos consecutivos, detener
        if (files.length > 0 && consecutiveMisses >= 2) {
          return;
        }
      }
    });

  // Si no encontramos ninguna imagen, intentar fallback desde S3
  if (files.length === 0) {
    const fallback = generateS3ImageUrls(productId, 1);
    const file = await fetchImageAsFile(fallback[0], `${productId}_1.jpg`, 4000);
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
 * Versión reestructurada: secuencia async/await directa sin dependencias de estado
 * Los archivos se pasan directamente a navigator.share sin esperar actualizaciones
 */
export const shareProductWithImages = async (product) => {
  const id = product.id;
  const title = product.title || 'Producto Cherry';
  const price = product.price || 0;
  const finalPrice = product.finalPrice || product.price || 0;
  const discountPercentage = product.discountPercentage || 0;
  const hasDiscount = product.hasDiscount || false;
  
  const productUrl = `${window.location.origin}/producto/${id}`;

  // Prevenir múltiples ejecuciones simultáneas para el mismo producto
  if (activeShares.has(id)) {
    if (window.showToast) {
      window.showToast('Ya se está compartiendo este producto. Espera un momento...', 'info');
    }
    return;
  }

  // Marcar como en ejecución
  activeShares.set(id, true);

  try {
    if (window.showToast) {
      window.showToast('Cargando imágenes del producto...', 'info');
    }

    // SECUENCIA DIRECTA: Descargar imágenes como Files (máximo 5 imágenes)
    // Timeout optimizado para móviles: 10 segundos máximo
    const imageFilesPromise = collectProductImageFiles(id, 5);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout al cargar imágenes')), 10000)
    );
    
    // Obtener archivos directamente - NO usar estado de React
    const imageFiles = await Promise.race([imageFilesPromise, timeoutPromise]);

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
          // Si el usuario cancela, salir silenciosamente
          if (shareError.name === 'AbortError') {
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

    // SECUENCIA DIRECTA: Validar soporte y compartir INMEDIATAMENTE con los archivos
    // Esto es crítico: los archivos deben pasarse directamente sin esperar estados
    const canShareFiles = navigator.share && 
                         navigator.canShare && 
                         navigator.canShare({ files: imageFiles });

    // Intentar compartir directamente con las imágenes usando Web Share API
    // IMPORTANTE: Usar imageFiles directamente, no esperar actualizaciones de estado
    if (canShareFiles) {
      try {
        // Llamar a navigator.share inmediatamente con los archivos descargados
        await navigator.share({
          title: title,
          text: shareText,
          files: imageFiles // Pasar directamente el array de archivos
        });
        
        if (window.showToast) window.showToast('¡Producto compartido!', 'success');
        return;
      } catch (shareError) {
        // Si el usuario cancela, salir silenciosamente
        if (shareError.name === 'AbortError') {
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
        // Si el usuario cancela, salir silenciosamente
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
      if (window.showToast) {
        window.showToast('No se pudo compartir. Intenta nuevamente.', 'error');
      }
    }
  } finally {
    // Asegurar limpieza de memoria y remover de ejecuciones activas
    cleanupMemory(id);
  }
};

/**
 * Compartir PDF de catálogo usando Web Share API
 * Versión mejorada con gestión de memoria
 */
export const shareCatalogPdf = async (pdfInfo) => {
  const { pdf_url, pdf_name, catalogName } = pdfInfo;
  const catalogUrl = window.location.href;

  if (!pdf_url) {
    throw new Error('No hay PDF disponible para compartir');
  }

  // Usar una clave única para este catálogo
  const catalogKey = `catalog_${pdf_url}`;
  
  // Prevenir múltiples ejecuciones simultáneas para el mismo catálogo
  if (activeShares.has(catalogKey)) {
    if (window.showToast) {
      window.showToast('Ya se está compartiendo este catálogo. Espera un momento...', 'info');
    }
    return;
  }

  // Marcar como en ejecución
  activeShares.set(catalogKey, true);

  let blob = null;
  let objectURL = null;

  try {
    if (window.showToast) {
      window.showToast('Cargando PDF del catálogo...', 'info');
    }

    // SECUENCIA DIRECTA: Descargar el PDF desde el servidor con timeout optimizado
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10s para móviles
    
    const response = await fetch(pdf_url, { 
      signal: controller.signal,
      cache: 'force-cache', // Usar caché para acelerar
      mode: 'cors', // Asegurar CORS para S3 o dominios externos
      credentials: 'omit'
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Error al descargar el PDF');
    }

    blob = await response.blob();
    
    // Validar que el blob sea realmente un PDF
    if (!blob.type || !blob.type.includes('pdf')) {
      // Forzar tipo MIME explícitamente
      blob = new Blob([blob], { type: 'application/pdf' });
    }
    
    // Crear File directamente con tipo MIME explícito - NO usar estado de React
    const file = new File([blob], pdf_name || 'catalogo.pdf', { 
      type: 'application/pdf' // Tipo MIME explícito para reconocimiento correcto
    });

    // Generar texto de compartir
    const shareText = `Checa este catálogo que tenemos para ti: ${catalogName || 'Catálogo Cherry'}\n\nPregunta por productos disponibles y precios especiales.`;

    // SECUENCIA DIRECTA: Validar soporte y compartir INMEDIATAMENTE con el archivo
    // PRIORIDAD: Siempre intentar compartir el archivo primero, NO descargar automáticamente
    const canShareFiles = navigator.share && 
                         navigator.canShare && 
                         navigator.canShare({ files: [file] });

    // PRIORIDAD 1: Intentar compartir directamente con el PDF usando Web Share API
    // IMPORTANTE: Usar file directamente, no esperar actualizaciones de estado
    if (canShareFiles) {
      try {
        // Llamar a navigator.share inmediatamente con el archivo descargado
        await navigator.share({
          title: catalogName || 'Catálogo Cherry',
          text: shareText,
          files: [file] // Pasar directamente el archivo
        });
        
        // Limpiar memoria después de compartir exitosamente
        blob = null; // Permitir garbage collection
        
        if (window.showToast) window.showToast('¡Catálogo PDF compartido!', 'success');
        return;
      } catch (shareError) {
        // Si el usuario cancela, salir silenciosamente
        if (shareError.name === 'AbortError') {
          blob = null; // Liberar memoria
          return;
        }
        // Si hay otro error al compartir archivos, intentar compartir solo texto/URL
        // NO descargar automáticamente aquí
      }
    }
    
    // PRIORIDAD 2: Si no puede compartir archivos o falló, intentar compartir solo texto/URL
    // Esto abre el menú de compartir pero sin el archivo
    if (navigator.share) {
      try {
        await navigator.share({
          title: catalogName || 'Catálogo Cherry',
          text: shareText,
          url: catalogUrl
        });
        
        // Si compartió solo texto, informar al usuario
        if (window.showToast) {
          window.showToast('Compartido. El PDF está disponible en el enlace.', 'info');
        }
        
        blob = null; // Liberar memoria
        return;
      } catch (textShareError) {
        // Si el usuario cancela, salir silenciosamente
        if (textShareError.name === 'AbortError') {
          blob = null; // Liberar memoria
          return;
        }
        // Si falla también compartir texto, continuar con último fallback
      }
    }

    // PRIORIDAD 3: Último recurso - Solo si NO hay soporte para navigator.share
    // Descargar el PDF y copiar URL al portapapeles
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
    
    // Revocar URL inmediatamente después de iniciar descarga
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
    }, 500);
    
    blob = null; // Liberar memoria inmediatamente
    
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
    // Limpiar URL en caso de error
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
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const fallbackResponse = await fetch(pdf_url, { 
        signal: controller.signal,
        cache: 'force-cache',
        mode: 'cors', // Asegurar CORS para S3 o dominios externos
        credentials: 'omit'
      });
      clearTimeout(timeoutId);
      
      if (!fallbackResponse.ok) {
        throw new Error('Error al descargar el PDF');
      }
      
      let fallbackBlob = await fallbackResponse.blob();
      
      // Validar y forzar tipo MIME explícito
      if (!fallbackBlob.type || !fallbackBlob.type.includes('pdf')) {
        fallbackBlob = new Blob([fallbackBlob], { type: 'application/pdf' });
      }
      
      const fallbackObjectURL = createTrackedObjectURL(fallbackBlob);
      const fallbackA = document.createElement('a');
      fallbackA.href = fallbackObjectURL;
      fallbackA.download = pdf_name || 'catalogo.pdf';
      document.body.appendChild(fallbackA);
      fallbackA.click();
      document.body.removeChild(fallbackA);
      
      // Revocar URL inmediatamente después de iniciar descarga
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
      }, 500); // Reducido a 500ms para liberar memoria más rápido
      
      fallbackBlob = null; // Liberar memoria inmediatamente
      
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
      if (window.showToast) {
        window.showToast('No se pudo compartir. Intenta nuevamente.', 'error');
      }
    }
  } finally {
    // Asegurar limpieza de memoria y remover de ejecuciones activas
    cleanupMemory(catalogKey);
  }
};

/**
 * Compartir PDF de pedido (mismo contenido que imprimir; incluye órdenes divididas).
 * @param {{ orderId: number|string, pdf_name?: string, orderLabel?: string, totalFormatted?: string }} orderInfo
 */
export const shareOrderPdf = async (orderInfo) => {
  const { orderId, pdf_name, orderLabel, totalFormatted } = orderInfo;

  if (!orderId) {
    throw new Error('No hay pedido para compartir');
  }

  const shareKey = `order_${orderId}`;

  if (activeShares.has(shareKey)) {
    if (window.showToast) {
      window.showToast('Ya se está compartiendo este pedido. Espera un momento...', 'info');
    }
    return;
  }

  activeShares.set(shareKey, true);

  const token = localStorage.getItem('token');
  const pdfUrl = `${window.location.origin}/api/orders/${orderId}/print-pdf${
    token ? `?token=${encodeURIComponent(token)}` : ''
  }`;

  let blob = null;
  let objectURL = null;

  const label = orderLabel || `Pedido #${orderId}`;
  const shareText = totalFormatted
    ? `Te comparto mi pedido Cherry: ${label}. Total: ${totalFormatted}.`
    : `Te comparto mi pedido Cherry: ${label}.`;

  const fileName = pdf_name || `pedido-${orderId}.pdf`;

  try {
    if (window.showToast) {
      window.showToast('Generando PDF del pedido...', 'info');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(pdfUrl, {
      signal: controller.signal,
      headers,
      credentials: 'same-origin',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Error al descargar el PDF del pedido');
    }

    blob = await response.blob();

    if (!blob.type || !blob.type.includes('pdf')) {
      blob = new Blob([blob], { type: 'application/pdf' });
    }

    const file = new File([blob], fileName, { type: 'application/pdf' });

    const canShareFiles =
      navigator.share && navigator.canShare && navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({
          title: label,
          text: shareText,
          files: [file],
        });
        blob = null;
        if (window.showToast) window.showToast('¡Pedido PDF compartido!', 'success');
        return;
      } catch (shareError) {
        if (shareError.name === 'AbortError') {
          blob = null;
          return;
        }
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: label,
          text: shareText,
        });
        if (window.showToast) {
          window.showToast('Compartido. Descarga el PDF desde Mis pedidos si lo necesitas.', 'info');
        }
        blob = null;
        return;
      } catch (textShareError) {
        if (textShareError.name === 'AbortError') {
          blob = null;
          return;
        }
      }
    }

    if (window.showToast) {
      window.showToast('Descargando PDF...', 'info');
    }

    objectURL = createTrackedObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectURL;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      if (objectURL) {
        try {
          URL.revokeObjectURL(objectURL);
          const index = createdObjectURLs.indexOf(objectURL);
          if (index > -1) {
            createdObjectURLs.splice(index, 1);
          }
        } catch (e) {
          // ignore
        }
      }
    }, 500);

    blob = null;

    try {
      await navigator.clipboard.writeText(shareText);
      if (window.showToast) {
        window.showToast('PDF descargado. Mensaje copiado al portapapeles.', 'success');
      }
    } catch (clipboardError) {
      if (window.showToast) {
        window.showToast('PDF descargado.', 'info');
      }
    }
  } catch (error) {
    if (objectURL) {
      try {
        URL.revokeObjectURL(objectURL);
      } catch (e) {
        // ignore
      }
    }

    if (error.name === 'AbortError') {
      return;
    }

    if (window.showToast) {
      window.showToast('No se pudo compartir el pedido. Intenta nuevamente.', 'error');
    }
    throw error;
  } finally {
    cleanupMemory(shareKey);
  }
};
