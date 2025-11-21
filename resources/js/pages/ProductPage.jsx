import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './ProductPage.css';
import './ProductPageOfferIndicators.css';
import CustomButton from '../components/CustomButton';
import { getIconPath } from '../utils/assetPaths';
import { useLocation } from "react-router-dom";
import Swal from 'sweetalert2';


// Components
import CherryButton from '../components/CherryButton/CherryButton';
import FavoriteButton from '../components/FavoriteButton/FavoriteButton';
import FeaturedProducts from '../components/sections/FeaturedProducts/FeaturedProducts';
import ProductGallery from '../components/ProductGallery/ProductGallery';
import StarRating from '../components/StarRating/StarRating';
import ProductReviews from '../components/ProductReviews/ProductReviews';


// Hooks
import { useUserDiscounts } from '../hooks/useUserDiscounts';

// API and Store
import { getProductById, generateS3ImageUrl, isUserSessionActive } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import useCartStore from '../store/cartStore';
import useUserStore from '../store/userStore';

// Utils
import { formatPrice } from '../utils/formatters';
import useHorizontalDragScroll from '../hooks/useHorizontalDragScroll';
import colorConverter from '../services/colorConverter';
import { validateStock, getProductStock } from '../services/inventoryService';

const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserStore();

  // State management
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quantitiesBySize, setQuantitiesBySize] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hook para detectar si es móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleShareCatalog = useCallback(async () => {
    try {
      // Validar que el producto existe
      if (!product) {
        throw new Error("No hay información del producto disponible");
      }

      // Mostrar mensaje de carga
      if (window.showToast) {
        window.showToast('Capturando imagen del producto...', 'info');
      }

      // Cargar html2canvas desde CDN
      let html2canvas;
      
      // Si ya está cargado, usarlo directamente
      if (window.html2canvas) {
        html2canvas = window.html2canvas;
      } else {
        // Cargar desde CDN
        await new Promise((resolve, reject) => {
          // Verificar si ya existe un script cargando html2canvas
          const existingScript = document.querySelector('script[src*="html2canvas"]');
          if (existingScript) {
            existingScript.addEventListener('load', () => {
              html2canvas = window.html2canvas;
              resolve();
            });
            existingScript.addEventListener('error', () => {
              reject(new Error("No se pudo cargar html2canvas"));
            });
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.async = true;
          script.onload = () => {
            html2canvas = window.html2canvas;
            if (!html2canvas) {
              reject(new Error("html2canvas no se inicializó correctamente"));
            } else {
              resolve();
            }
          };
          script.onerror = () => reject(new Error("No se pudo cargar html2canvas desde el CDN"));
          document.head.appendChild(script);
        });
      }

      if (!html2canvas) {
        throw new Error("html2canvas no está disponible");
      }

      // Esperar un momento para asegurar que el DOM está completamente renderizado
      await new Promise(resolve => setTimeout(resolve, 300));

      // Buscar el contenedor principal del producto que incluye galería e info
      const productContainer = document.querySelector('.product-page__container');
      
      if (!productContainer) {
        throw new Error("No se encontró el contenedor del producto");
      }

      // Crear un contenedor temporal que incluya solo la galería y las opciones (hasta las tallas)
      const galleryElement = productContainer.querySelector('.product-page__gallery');
      const infoElement = productContainer.querySelector('.product-page__info');
      
      if (!galleryElement || !infoElement) {
        throw new Error("No se encontraron los elementos del producto para capturar");
      }

      // Encontrar dónde terminan las tallas (antes del botón de agregar al carrito)
      const sizeOptions = infoElement.querySelector('.product-page__size-options');
      const sizeOptionContainer = sizeOptions ? sizeOptions.closest('.product-page__option') : null;
      
      // Crear un elemento temporal que contenga solo lo que queremos capturar
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = productContainer.offsetWidth + 'px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.visibility = 'hidden';
      
      // Clonar la galería profundamente
      const clonedGallery = galleryElement.cloneNode(true);
      
      // Asegurar que todas las imágenes en el clon se carguen correctamente
      const allImages = clonedGallery.querySelectorAll('img');
      const imagePromises = Array.from(allImages).map((img, index) => {
        return new Promise((resolve) => {
          // Si la imagen ya está cargada, continuar
          if (img.complete && img.naturalHeight !== 0) {
            // Asegurar crossOrigin
            if (!img.crossOrigin && img.src.startsWith('http')) {
              img.crossOrigin = 'anonymous';
            }
            resolve();
            return;
          }
          
          // Cargar la imagen manualmente
          const newImg = new Image();
          newImg.crossOrigin = 'anonymous';
          
          newImg.onload = () => {
            // Actualizar la imagen en el clon con la versión cargada
            img.src = newImg.src;
            img.crossOrigin = 'anonymous';
            img.style.display = 'block';
            resolve();
          };
          
          newImg.onerror = () => {
            // Si falla con CORS, intentar sin CORS
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              img.src = fallbackImg.src;
              img.style.display = 'block';
              resolve();
            };
            fallbackImg.onerror = () => {
              // Si todo falla, mantener la imagen original
              img.style.display = 'block';
              resolve();
            };
            fallbackImg.src = img.src;
          };
          
          newImg.src = img.src || img.getAttribute('src') || '';
        });
      });
      
      await Promise.all(imagePromises);
      
      // Esperar un momento adicional para que las imágenes se rendericen
      await new Promise(resolve => setTimeout(resolve, 200));
      
      tempContainer.appendChild(clonedGallery);
      
      // Clonar la información hasta las tallas
      const clonedInfo = infoElement.cloneNode(true);
      // Remover todo después de las tallas
      if (sizeOptionContainer) {
        const allOptions = clonedInfo.querySelectorAll('.product-page__option');
        allOptions.forEach((option, index) => {
          // Mantener solo hasta la opción de tallas (Paso 2)
          if (index > 1) { // Después de colores (0) y tallas (1)
            option.remove();
          }
        });
      }
      
      // Asegurar que las imágenes en el info también se carguen
      const infoImages = clonedInfo.querySelectorAll('img');
      const infoImagePromises = Array.from(infoImages).map(img => {
        return new Promise((resolve) => {
          if (img.complete && img.naturalHeight !== 0) {
            if (!img.crossOrigin && img.src.startsWith('http')) {
              img.crossOrigin = 'anonymous';
            }
            resolve();
            return;
          }
          
          const newImg = new Image();
          newImg.crossOrigin = 'anonymous';
          newImg.onload = () => {
            img.src = newImg.src;
            img.crossOrigin = 'anonymous';
            img.style.display = 'block';
            resolve();
          };
          newImg.onerror = () => {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              img.src = fallbackImg.src;
              img.style.display = 'block';
              resolve();
            };
            fallbackImg.onerror = () => {
              img.style.display = 'block';
              resolve();
            };
            fallbackImg.src = img.src;
          };
          newImg.src = img.src || img.getAttribute('src') || '';
        });
      });
      
      await Promise.all(infoImagePromises);
      await new Promise(resolve => setTimeout(resolve, 200));
      tempContainer.appendChild(clonedInfo);
      
      document.body.appendChild(tempContainer);
      
      // Esperar un momento adicional para que el navegador renderice el clon
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capturar el contenedor temporal con configuración mejorada para imágenes
      const canvas = await html2canvas(tempContainer, {
        useCORS: true,
        allowTaint: true, // Permitir imágenes de otros dominios
        backgroundColor: '#ffffff',
        scale: 1,
        logging: false,
        width: tempContainer.offsetWidth,
        height: tempContainer.scrollHeight,
        onclone: (clonedDoc) => {
          // Asegurar que todas las imágenes en el documento clonado tengan crossOrigin
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach(img => {
            if (img.src && !img.crossOrigin) {
              img.crossOrigin = 'anonymous';
            }
            // Forzar recarga si es necesario
            if (!img.complete) {
              const src = img.src;
              img.src = '';
              img.src = src;
            }
          });
        }
      });

      // Remover el contenedor temporal
      document.body.removeChild(tempContainer);

      // Convertir canvas a blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, "image/png", 0.95);
      });

      if (!blob) {
        throw new Error("No se pudo generar la imagen");
      }

      // Crear archivo para compartir
      const fileName = `${product?.descripcion || 'producto'}-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // Construir el texto de compartir según el formato solicitado
      const buildShareText = () => {
        const productName = product?.descripcion || 'Producto';
        const basePrice = product?.precio1 || 0;
        
        // Calcular descuento y precio final
        let discount = 0;
        let finalPrice = basePrice;
        
        // Calcular descuento (misma lógica que en el componente)
        if (product?.userOffer?.discount_percentage > 0) {
          discount = Math.round(product.userOffer.discount_percentage);
        } else if (product?.desc_promo && product.desc_promo > 0) {
          discount = Math.round(product.desc_promo);
        } else if (product?.discount && product.discount > 0) {
          discount = Math.round(product.discount);
        }
        
        // Calcular precio final
        if (discount > 0 && basePrice > 0) {
          finalPrice = basePrice - (basePrice * (discount / 100));
        } else if (product?.price && product.price !== basePrice) {
          finalPrice = product.price;
        }
        
        const hasDiscount = discount > 0;

        let text = `Checa este nuevo producto que tenemos para ti!!\n\n`;
        text += `${productName}\n\n`;

        if (hasDiscount) {
          // Precio tachado (original) y precio con descuento
          text += `~~$${basePrice.toFixed(2)}~~\n`;
          text += `$${finalPrice.toFixed(2)} -${discount}%\n\n`;
        } else {
          // Solo precio sin descuento
          text += `$${basePrice.toFixed(2)}\n\n`;
        }

        text += `Pregunta por colores y tallas disponibles`;

        return text;
      };

      const shareText = buildShareText();

      // Usar Web Share API (muestra el diálogo nativo de compartir de la PC/móvil)
      if (navigator.share) {
        try {
          // Detectar si es móvil
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          
          // Verificar si puede compartir archivos
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            if (isMobile) {
              // En móviles, compartir primero el texto (que siempre funciona)
              // Luego el usuario puede adjuntar la imagen manualmente
              await navigator.share({
                title: product?.descripcion || 'Producto',
                text: shareText + '\n\n📸 ' + window.location.href,
                url: window.location.href
              });
              
              // Descargar la imagen automáticamente para que el usuario pueda adjuntarla
              const dataUrl = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = fileName;
              link.href = dataUrl;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              if (window.showToast) {
                window.showToast('Texto compartido. La imagen se descargó para adjuntarla.', 'info');
              }
            } else {
              // En desktop, intentar compartir texto + archivo
              try {
                await navigator.share({
                  title: product?.descripcion || 'Producto',
                  text: shareText,
                  url: window.location.href,
                  files: [file]
                });
              } catch (shareWithFilesError) {
                // Si falla, compartir solo texto
                await navigator.share({
                  title: product?.descripcion || 'Producto',
                  text: shareText + '\n\n📸 ' + window.location.href,
                  url: window.location.href
                });
                
                // Descargar la imagen
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = fileName;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }
          } else {
            // Compartir solo texto si no soporta archivos
            await navigator.share({
              title: product?.descripcion || 'Producto',
              text: shareText + '\n\n📸 ' + window.location.href,
              url: window.location.href
            });
            
            // Descargar la imagen por separado
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          
          if (window.showToast && !isMobile) {
            window.showToast('¡Compartido exitosamente!', 'success');
          }
          return;
        } catch (shareError) {
          // Si el usuario cancela, no mostrar error
          if (shareError.name === 'AbortError') {
            return;
          }
          // Continuar con el fallback si falla
          console.log('Error al compartir:', shareError);
        }
      }

      // Fallback: Descargar imagen y abrir WhatsApp Web
      const dataUrl = canvas.toDataURL('image/png');
      
      // Descargar la imagen automáticamente
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Abrir WhatsApp Web con el texto formateado
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n📸 La imagen se ha descargado, puedes adjuntarla desde tu galería')}`;
      
      // Abrir WhatsApp después de un pequeño delay
      setTimeout(() => {
        window.open(whatsappUrl, "_blank");
      }, 500);

      if (window.showToast) {
        window.showToast('Imagen descargada. Abriendo WhatsApp...', 'info');
      }

    } catch (error) {
      console.error("Error al compartir:", error);
      
      let errorMessage = "No se pudo compartir la imagen.";
      
      if (error.message) {
        if (error.message.includes("No se encontró el elemento")) {
          errorMessage = "No se pudo capturar la pantalla. Por favor, intenta de nuevo.";
        } else if (error.message.includes("html2canvas")) {
          errorMessage = "Error al cargar la herramienta de captura. Por favor, recarga la página.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      if (window.showToast) {
        window.showToast(errorMessage, "error");
      }
    }
  }, [product]);

  // Rating states
  const [ratingData, setRatingData] = useState({
    average: 0,
    count: 0,
    distribution: [0, 0, 0, 0, 0]
  });

  // Description state
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Specifications state
  const [showSpecifications, setShowSpecifications] = useState(false);



  // Cart store
  const { addToCart, isLoading: isAddingToCart } = useCartStore();

  // User discounts hook
  const { userDiscounts, loading: discountsLoading } = useUserDiscounts(product ? [product.id_articulo] : []);

  // Load product data from external API
  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const productData = await getProductById(productId);

        // Aplicar ofertas usando el sistema inteligente (con o sin sesión)
        const hasActiveSession = isUserSessionActive();
        let productWithOffer = productData;;

        if (hasActiveSession) {
          // Si hay sesión activa, aplicar ofertas personalizadas
          const productsWithOffers = await applyUserOffersToProducts([productData]);
          productWithOffer = productsWithOffers[0] || productData;;
        } else {
          // Si no hay sesión, usar solo las ofertas externas (ya incluidas en getProductById)
          productWithOffer = productData;;
        }

        setProduct(productWithOffer);
        // Set default color/size if available
        if (productData.detalles && productData.detalles.length > 0) {
          const availableColors = [...new Set(productData.detalles.map(d => d.nombreColor).filter(Boolean))];
          const availableSizes = [...new Set(productData.detalles.map(d => d.detalle).filter(Boolean))];

          // Auto-seleccionar primer color con fallback
          const coloresParaSeleccion = availableColors.length > 0 ? availableColors : (productData.colors || ['rojo', 'azul', 'verde']);
          if (coloresParaSeleccion.length > 0) {
            setSelectedColor(coloresParaSeleccion[0]);
          }

          if (availableSizes.length > 0) {
            setSelectedSize(availableSizes[0]);
          }
        } else {
          // Si no hay detalles, usar colores genéricos
          const coloresGenericos = productData.colors || ['rojo', 'azul', 'verde'];
          if (coloresGenericos.length > 0) {
            setSelectedColor(coloresGenericos[0]);
          }
        }

        // Fetch rating data
        fetchRatingData();
      } catch (err) {
        if (window.showToast) {
          window.showToast('Error al cargar el producto', 'error');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [productId, user]);



  // Efecto para resetear la cantidad cuando cambie la talla o color
  useEffect(() => {
    if (selectedColor && selectedSize) {
      const stockDisponible = getStockBySizeAndColor(selectedSize, selectedColor);
      // Si la cantidad actual excede el stock disponible, ajustarla
      if (quantity > stockDisponible) {
        setQuantity(Math.max(1, stockDisponible));
      }
    }
  }, [selectedColor, selectedSize, product]);

  // Efecto para ajustar la cantidad cuando se seleccione una talla diferente
  useEffect(() => {
    if (selectedColor && selectedSize) {
      const stockDisponible = getStockBySizeAndColor(selectedSize, selectedColor);
      // Ajustar la cantidad al stock disponible de la nueva talla
      if (quantity > stockDisponible) {
        setQuantity(Math.max(1, stockDisponible));
      }
    }
  }, [selectedSize]);

  // Efecto para resetear la talla seleccionada cuando cambie el color
  useEffect(() => {
    if (selectedColor && selectedSize) {
      const stockDisponible = getStockBySizeAndColor(selectedSize, selectedColor);
      // Si la talla seleccionada no tiene stock para el nuevo color, resetearla
      if (stockDisponible <= 0) {
        setSelectedSize('');
        setQuantity(1);
        setQuantitiesBySize({});
      }
    }
  }, [selectedColor]);

  // Efecto para inicializar las cantidades por talla cuando se cargue el producto
  useEffect(() => {
    if (product && product.detalles) {
      const initialQuantities = {};
      tallas.forEach(talla => {
        initialQuantities[talla] = 0;
      });
      setQuantitiesBySize(initialQuantities);
    }
  }, [product, selectedColor]);


  // Fetch rating data for the product
  const fetchRatingData = async () => {
    try {
      const response = await fetch(`/api/ratings/product?product_id=${productId}`);
      if (response.ok) {
        const data = await response.json();
        setRatingData(data.average_rating);
      }
    } catch (error) {
      // Error fetching rating data
    }
  };


  // Handle add to cart
  const handleAddToCart = async () => {
    if (!selectedColor) {
      if (window.showToast) {
        window.showToast('Por favor selecciona un color', 'error');
      }
      return;
    }

    // Obtener las tallas con cantidades seleccionadas
    const tallasConCantidades = getSelectedSizesWithQuantities();

    if (tallasConCantidades.length === 0) {
      if (window.showToast) {
        window.showToast('Por favor selecciona al menos una talla con cantidad mayor a 0', 'error');
      }
      return;
    }

    // Verificar que todas las cantidades no excedan el stock disponible
    for (const { talla, cantidad } of tallasConCantidades) {
      const stockDisponible = getStockBySizeAndColor(talla, selectedColor);

      if (cantidad > stockDisponible) {
        if (window.showToast) {
          window.showToast(`Solo hay ${stockDisponible} unidades disponibles para la talla ${talla}`, 'error');
        }
        return;
      }
    }

    try {
      // Agregar cada talla con su cantidad al carrito
      for (const { talla, cantidad } of tallasConCantidades) {
        const productToAdd = {
          id_articulo: product.id_articulo,
          title: product.descripcion,
          desc_promo: product.desc_promo,
          price: finalPrice, // Usar precio con descuento aplicado
          precio: finalPrice, // Usar precio con descuento aplicado
          originalPrice: hasOffer ? precio1 : null, // Precio original solo si hay descuento
          discount: hasOffer ? discountPercentage : null, // Porcentaje de descuento
          savings: hasOffer ? (precio1 - finalPrice) : null, // Cantidad ahorrada
          image: generateS3ImageUrl(product.id_articulo),
          selectedColor,
          selectedSize: talla,
          quantity: cantidad,
          colors: [selectedColor],
          barcode: getBarcodeBySizeAndColor(talla, selectedColor) || product.ean || product.sku || product.codigo_barras || product.id_articulo, // Código de barras específico por talla/color
          // Información de ofertas especiales
          userOffer: hasUserOffer ? {
            type: userOffer.discount_category,
            title: userOffer.title,
            discount_percentage: userOffer.discount_percentage,
            buy_quantity: userOffer.buy_quantity,
            get_quantity: userOffer.get_quantity,
            min_purchase_amount: userOffer.min_purchase_amount
          } : null
        };

        addToCart(productToAdd, cantidad, product);

        // La lógica de Buy X Get Y ahora se maneja automáticamente en el cartStore
      }

      if (window.showToast) {
        const totalUnidades = getTotalUnits();
        let message = `${totalUnidades} unidad${totalUnidades > 1 ? 'es' : ''} agregada${totalUnidades > 1 ? 's' : ''} al carrito`;

        if (hasOffer) {
          if (hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y') {
            message += ` 🎁 Oferta: Compra ${userOffer.buy_quantity} por el precio de ${userOffer.buy_quantity - userOffer.get_quantity}`;
            message += ` - Los productos gratis se aplicarán automáticamente según tu carrito`;
          } else if (hasUserOffer && userOffer && userOffer.discount_category === 'order_discount') {
            message += ` 💰 Descuento del ${Math.round(userOffer.discount_percentage)}% se aplicará al total del pedido`;
          } else if (hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping') {
            message += ` 🚚 ¡Envío gratis incluido!`;
          } else if (discountPercentage > 0) {
            message += ` 🏷️ Con ${discountPercentage}% de descuento`;
          }
        }

        window.showToast(message, 'success');

        // Resetear las cantidades después de agregar exitosamente al carrito
        setQuantitiesBySize({});
        setQuantity(1);
        setSelectedSize('');
        handleMoreShoppingOrGoToCart();


      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al agregar al carrito', 'error');
      }
    }
  };

  const handleMoreShoppingOrGoToCart = async () => {
    const result = await Swal.fire({
      title: '¿Seguir comprando o ir al carrito?',
      text: 'Si decides seguir comprado seras redireccionado a la lista de productos, sino al carrito',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Seguir comprando',
      cancelButtonText: 'Ir al carrito'
    });

    if (!result.isConfirmed) {
      return navigate('/carrito-detalle');
    }

    try {
      return navigate(-1);

    } catch (error) {
      window.showToast('Error al eliminar el catálogo', 'error');
    }
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity) => {
    // Obtener el stock máximo disponible para la talla y color seleccionados
    const stockMaximo = selectedColor && selectedSize ?
      getStockBySizeAndColor(selectedSize, selectedColor) :
      (product?.inventario || product?.stock || 99);

    if (newQuantity >= 1 && newQuantity <= stockMaximo) {
      setQuantity(newQuantity);
    }
  };

  // Handle quantity change for specific size
  const handleQuantityChangeForSize = (talla, newQuantity) => {
    const stockMaximo = getStockForSize(talla);

    if (newQuantity >= 0 && newQuantity <= stockMaximo) {
      // Actualizar la cantidad para la talla específica
      setQuantitiesBySize(prev => ({
        ...prev,
        [talla]: newQuantity
      }));

      // Si es la talla seleccionada, también actualizar la cantidad global
      if (selectedSize === talla) {
        setQuantity(newQuantity);
      }

      // Seleccionar la talla si no está seleccionada
      if (selectedSize !== talla) {
        setSelectedSize(talla);
        setQuantity(newQuantity);
      }
    }
  };

  // Función para seleccionar talla e inicializar cantidad
  const handleSizeSelection = (talla) => {
    // Verificar si la talla tiene stock
    const stockDisponible = selectedColor ? getStockBySizeAndColor(talla, selectedColor) : getStockForSize(talla);

    // No permitir selección si no hay stock
    if (stockDisponible <= 0) {
      if (window.showToast) {
        window.showToast('Esta talla no tiene stock disponible', 'info');
      }
      return;
    }

    // Seleccionar la talla
    setSelectedSize(talla);

    // Si la talla no tiene cantidad o tiene 0, inicializar con 1
    const cantidadActual = quantitiesBySize[talla] || 0;
    if (cantidadActual <= 0) {
      if (stockDisponible > 0) {
        setQuantitiesBySize(prev => ({
          ...prev,
          [talla]: 1
        }));
        setQuantity(1);
      }
    } else {
      setQuantity(cantidadActual);
    }
  };

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`product-page__rating-star ${i <= rating ? 'product-page__rating-star--filled' : 'product-page__rating-star--empty'}`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  const thumbnailsRef = useRef(null);
  const { isDragging, eventHandlers } = useHorizontalDragScroll(thumbnailsRef);

  if (isLoading) {
    return (
      <div className="product-page" id='product-page'>
        <div className="product-page__loading">
          <div className="product-page__loading-spinner"></div>
          <p>Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-page">
        <div className="product-page__error">
          <h2>Error</h2>
          <p>{error || 'Producto no encontrado'}</p>
          <CherryButton onClick={() => navigate(-1)}>
            Volver
          </CherryButton>
        </div>
      </div>
    );
  }

  // Extraer detalles relevantes
  const {
    descripcion,
    marca,
    precio1, precio2, precio3, precio4, precio5, precio6, precio7, precio8, precio9, precio10,
    costo,
    imagen,
    piezas,
    inventario,
    especificaciones,
    detalles = [],
    linea,
    sector,
    genero,
    notas,
    id_articulo,
    art_empresa,
    id_provedor,
    tkmov,
    tipo_venta,
    iva,
    stockmin,
    stockmax,
    proporcion,
    sku,
    ean,
    fecha_alta,
    activo,
    tipoart,
    url_video,
    descuento,
    catalogoId,
    generoId,
    sectorId,
    fechaAct,
    ...rest
  } = product;

  // Colores y tallas únicos
  const colores = [...new Set(detalles.map(d => d.nombreColor).filter(Boolean))];
  const tallas = [...new Set(detalles.map(d => d.detalle).filter(Boolean))];

  // Fallback: si no hay colores desde detalles, usar colores genéricos
  const coloresFallback = colores.length > 0 ? colores : (product.colors || ['rojo', 'azul', 'verde']);


  // Obtener información del descuento del usuario para este producto
  // Usar datos procesados por applyUserOffersToProducts si están disponibles
  const userOffer = product?.userOffer || (product ? userDiscounts[product.id_articulo] : null);
  const hasUserOffer = Boolean(product?.hasUserOffer || userOffer);

  // Calcular descuento con prioridades
  const calculateDiscountPercentage = () => {
    // PRIORIDAD 1: Descuento personalizado del usuario (ya procesado)
    if (hasUserOffer && userOffer && userOffer.discount_percentage > 0) {
      return Math.round(userOffer.discount_percentage);
    }
    // PRIORIDAD 2: Descuento general desde la API (desc_promo) - usar directamente desc_promo
    if (product?.desc_promo && product.desc_promo > 0) {
      return Math.round(product.desc_promo);
    }

    // PRIORIDAD 3: Descuento ya procesado en product.discount
    if (product?.discount && product.discount > 0) {
      return Math.round(product.discount);
    }

    // PRIORIDAD 4: Fallback usando originalPrice vs price
    if (product?.originalPrice && product?.price && product.originalPrice > product.price) {
      const calculatedDiscount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);;
      return calculatedDiscount;
    }

    return 0;
  };

  const discountPercentage = calculateDiscountPercentage();

  // Determinar si hay oferta (incluyendo ofertas especiales que no tienen porcentaje)
  const hasOffer = discountPercentage > 0 || (hasUserOffer && userOffer && (userOffer.discount_category === 'buy_x_get_y' || userOffer.discount_category === 'free_shipping'));

  // Calcular precio final con logs para debugging
  const calculateFinalPrice = () => {
    const basePrice = precio1 || 0;

    // Si ya hay un precio procesado, usarlo
    if (product?.price && product.price !== basePrice) {
      return product.price;
    }

    // Si hay descuento, calcularlo
    if (discountPercentage > 0 && basePrice > 0) {
      const discountedPrice = basePrice - (basePrice * (discountPercentage / 100));;
      return discountedPrice;
    }

    return basePrice;
  };

  const finalPrice = calculateFinalPrice();


  // Función para obtener el stock disponible por talla y color
  const getStockBySizeAndColor = (talla, color) => {
    if (!detalles || detalles.length === 0) return 0;

    // Buscar el detalle específico que coincida con talla y color
    const detalle = detalles.find(d =>
      d.detalle === talla && d.nombreColor === color
    );

    // Si no hay detalle específico, usar el stock general del producto
    if (!detalle) {
      return product.inventario || product.stock || 0;
    }

    // Usar inventario_d del detalle específico
    return detalle.inventario_d || 0;
  };

  // Función para obtener el código de barras por talla y color
  const getBarcodeBySizeAndColor = (talla, color) => {
    if (!detalles || detalles.length === 0) return null;

    // Buscar el detalle específico que coincida con talla y color
    const detalle = detalles.find(d =>
      d.detalle === talla && d.nombreColor === color
    );

    return detalle ? detalle.codbarra : null;
  };

  // Mostrar todas las tallas, independientemente del stock
  const tallasAMostrar = tallas;

  // Obtener el stock máximo disponible para la talla y color seleccionados
  const stockMaximoDisponible = selectedColor && selectedSize ?
    getStockBySizeAndColor(selectedSize, selectedColor) :
    (product.inventario || product.stock || 99);

  // Función para obtener el stock máximo de una talla específica
  const getStockForSize = (talla) => {
    if (!selectedColor) return product.inventario || product.stock || 99;
    return getStockBySizeAndColor(talla, selectedColor);
  };

  // Función para obtener el código de barras de la talla y color seleccionados
  const getCurrentBarcode = () => {
    if (!selectedSize || !selectedColor) return null;
    return getBarcodeBySizeAndColor(selectedSize, selectedColor);
  };

  // Función para calcular el inventario total del producto
  const getTotalInventory = () => {
    // 🧪 TESTING: Descomenta una línea para simular diferentes estados
    // return 0;  // Simula "Agotado" (producto existente sin inventario)
    // Para simular "Próximamente", usa return 0 + modifica fecha_alta a reciente en la línea de isNewProduct()

    // Si hay detalles, sumar todo el inventario de los detalles
    if (detalles && detalles.length > 0) {
      return detalles.reduce((total, detalle) => {
        return total + (detalle.inventario_d || 0);
      }, 0);
    }

    // Si no hay detalles, usar el inventario general del producto
    return product.inventario || product.stock || 0;
  };


  // Función para determinar el estado del inventario
  const getInventoryStatus = () => {
    const totalInventory = getTotalInventory();

    // Si el producto es nuevo (nunca ha tenido inventario registrado)
    // Consideramos nuevo si fecha_alta es reciente (menos de 30 días) y no tiene inventario
    const isNewProduct = () => {
      if (!fecha_alta) return false;

      const fechaAlta = new Date(fecha_alta);
      const now = new Date();
      const diffDays = Math.floor((now - fechaAlta) / (1000 * 60 * 60 * 24));

      return diffDays <= 30 && totalInventory === 0;
    };

    if (isNewProduct()) {
      return {
        status: 'coming-soon',
        text: 'Próximamente',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 0.25C3.71875 0.25 0.25 3.75 0.25 8C0.25 12.2812 3.71875 15.75 8 15.75C12.25 15.75 15.75 12.2812 15.75 8C15.75 3.75 12.25 0.25 8 0.25ZM8 1.75C11.4375 1.75 14.25 4.5625 14.25 8C14.25 11.4688 11.4375 14.25 8 14.25C4.53125 14.25 1.75 11.4688 1.75 8C1.75 4.5625 4.53125 1.75 8 1.75ZM7.25 4V8.5L10.5 10.5L11 9.75L8.25 8V4H7.25Z" fill="#FF9800" />
          </svg>
        )
      };
    }

    if (totalInventory > 0) {
      return {
        status: 'in-stock',
        text: 'En Stock',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 0.25C3.71875 0.25 0.25 3.75 0.25 8C0.25 12.2812 3.71875 15.75 8 15.75C12.25 15.75 15.75 12.2812 15.75 8C15.75 3.75 12.25 0.25 8 0.25ZM8 1.75C11.4375 1.75 14.25 4.5625 14.25 8C14.25 11.4688 11.4375 14.25 8 14.25C4.53125 14.25 1.75 11.4688 1.75 8C1.75 4.5625 4.53125 1.75 8 1.75ZM12.375 5.84375L11.6562 5.125C11.5312 4.96875 11.2812 4.96875 11.125 5.125L6.71875 9.5L4.84375 7.625C4.6875 7.46875 4.46875 7.46875 4.3125 7.625L3.59375 8.3125C3.46875 8.46875 3.46875 8.71875 3.59375 8.84375L6.4375 11.7188C6.59375 11.875 6.8125 11.875 6.96875 11.7188L12.375 6.375C12.5 6.21875 12.5 5.96875 12.375 5.84375Z" fill="#1DA534" />
          </svg>
        )
      };
    }

    // Sin inventario disponible
    return {
      status: 'out-of-stock',
      text: 'Agotado',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 0.25C3.71875 0.25 0.25 3.75 0.25 8C0.25 12.2812 3.71875 15.75 8 15.75C12.25 15.75 15.75 12.2812 15.75 8C15.75 3.75 12.25 0.25 8 0.25ZM8 1.75C11.4375 1.75 14.25 4.5625 14.25 8C14.25 11.4688 11.4375 14.25 8 14.25C4.53125 14.25 1.75 11.4688 1.75 8C1.75 4.5625 4.53125 1.75 8 1.75ZM5.125 5.125L4.40625 5.84375C4.28125 6 4.28125 6.21875 4.40625 6.375L7.03125 9L4.40625 11.6562C4.28125 11.8125 4.28125 12.0312 4.40625 12.1875L5.125 12.9062C5.25 13.0312 5.5 13.0312 5.65625 12.9062L8.28125 10.2812L10.9062 12.9062C11.0625 13.0312 11.2812 13.0312 11.4375 12.9062L12.1562 12.1875C12.2812 12.0312 12.2812 11.8125 12.1562 11.6562L9.53125 9L12.1562 6.375C12.2812 6.21875 12.2812 6 12.1562 5.84375L11.4375 5.125C11.2812 5 11.0625 5 10.9062 5.125L8.28125 7.75L5.65625 5.125C5.5 5 5.25 5 5.125 5.125Z" fill="#D32F2F" />
        </svg>
      )
    };
  };

  const inventoryStatusData = getInventoryStatus();

  // Función para truncar la descripción
  const truncateDescription = (text, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Función para obtener información expandida del producto
  const getExpandedProductInfo = () => {
    if (!product) return '';

    let info = `Descripción: ${descripcion || 'No disponible'}\n`;

    if (especificaciones) {
      info += `\nEspecificaciones:\n${especificaciones}`;
    }

    if (notas) {
      info += `\n\nNotas: ${notas}`;
    }

    if (temporada) {
      info += `\n\nTemporada: ${temporada}`;
    }

    if (proveedor) {
      info += `\n\nProveedor: ${proveedor}`;
    }

    return info;
  };



  // Función para calcular el total de unidades seleccionadas
  const getTotalUnits = () => {
    return Object.values(quantitiesBySize).reduce((total, cantidad) => total + (cantidad || 0), 0);
  };

  // Función para obtener las tallas con cantidades seleccionadas
  const getSelectedSizesWithQuantities = () => {
    return Object.entries(quantitiesBySize)
      .filter(([talla, cantidad]) => cantidad > 0)
      .map(([talla, cantidad]) => ({ talla, cantidad }));
  };

  // Precios adicionales
  const precios = [precio1, precio2, precio3, precio4, precio5, precio6, precio7, precio8, precio9, precio10]
    .map((p, i) => ({ label: `Precio${i + 1}`, value: p }))
    .filter(p => p.value && p.value > 0);

  return (
    <>
      <Helmet>
        <title>{descripcion} - Cherry</title>
        <meta name="description" content={descripcion} />
      </Helmet>

      <div className="product-page">
        <div className="product-page__container container">
          {/* Breadcrumb and title MOBILE */}
          <div className="product-page__breadcrumb show-mobile">
            <div className="product-page__texts-breadcrumb">
              <span className="product-page__breadcrumb-item">Nuevo</span>
              <span className="product-page__breadcrumb-separator">|</span>
              <span className="product-page__breadcrumb-item">+50 vendido</span>
              <span className="product-page__breadcrumb-separator">|</span>
            </div>

            <CustomButton
              variant="filled"
              size="small"
              iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Comparar clientes" style={{ width: 16, height: 16 }} />}
              onClick={handleShareCatalog}
            >
              <span className="catalog-page__whatsapp-text"></span>
            </CustomButton>
          </div>

          <h1 className="product-page__info-title show-mobile">{descripcion}</h1>

          {/* Product Gallery */}
          <div className="product-page__gallery">
            <ProductGallery
              productId={id_articulo}
              productTitle={descripcion}
              onImageChange={(index) => {
                // Callback para cuando cambia la imagen
              }}
            />
            <FavoriteButton
              productId={id_articulo}
              productTitle={descripcion}
              productImage={generateS3ImageUrl(id_articulo)}
              productPrice={precio1}
              className="product-page__gallery-favorite"
              size="large"
            />
            {/* Product Reviews - Desktop View */}
            <div className="product-page__desktop-reviews show-desktop">
              <ProductReviews productId={productId} />
            </div>
          </div>

          {/* Product Info */}
          <div className="product-page__info">
            {/* Breadcrumb and title DESKTOP */}
            <div className="product-page__breadcrumb show-desktop">
              <div className="product-page__texts-breadcrumb">
                <span className="product-page__breadcrumb-item">Nuevo</span>
                <span className="product-page__breadcrumb-separator">|</span>
                <span className="product-page__breadcrumb-item">+50 vendido</span>
                <span className="product-page__breadcrumb-separator">|</span>
              </div>

              <CustomButton
                variant="filled"
                size="medium"
                iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Comparar clientes" style={{ width: 16, height: 16 }} />}
                onClick={handleShareCatalog}
              >
                <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
              </CustomButton>
            </div>

            <h1 className="product-page__info-title show-desktop">{descripcion}</h1>

            <div className="product-page__info-rating">
              <div className="product-page__container-info-rating">
                <StarRating
                  rating={ratingData.average}
                  size="medium"
                  readonly={true}
                  showAverage={true}
                  averageRating={ratingData.average}
                  totalRatings={ratingData.count}
                />
              </div>
              <div className="product-page__info-stock">
                {inventoryStatusData.icon}
                <span className={`product-page__stock-status product-page__stock-status--${inventoryStatusData.status}`}>
                  {inventoryStatusData.text}
                </span>
              </div>
            </div>

            <div className="product-page__info-price">
              {hasOffer && (
                <div className={`product-page__offer-badge ${hasUserOffer ? 'user-offer' : ''} ${hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' ? 'buy-x-get-y' :
                  hasUserOffer && userOffer && userOffer.discount_category === 'order_discount' ? 'order-discount' :
                    hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping' ? 'free-shipping' : ''
                  }`}>
                  {hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' ?
                    `🎁 Compra ${userOffer.buy_quantity} por el precio de ${userOffer.buy_quantity - userOffer.get_quantity}` :
                    hasUserOffer && userOffer && userOffer.discount_category === 'order_discount' ?
                      `💰 Descuento en pedido ${Math.round(userOffer.discount_percentage)}%` :
                      hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping' ?
                        (discountPercentage > 0 ? `🏷️ ${discountPercentage}% + 🚚 Envío gratis` : `🚚 Envío gratis`) :
                        hasUserOffer && userOffer && userOffer.discount_percentage > 0 ?
                          (<>{!isMobile && "Rebaja "}{Math.round(userOffer.discount_percentage)}%</>) :
                          (<>🏷️ {!isMobile && "Rebaja "}{discountPercentage}%</>)
                  }
                </div>
              )}


              <div className="product-page__price-container">
                {hasOffer && discountPercentage > 0 && (
                  <div className="product-page__original-price">{formatPrice(product?.originalPrice || precio1)}</div>
                )}
                <div className="product-page__final-price">{formatPrice(finalPrice)}</div>
                {hasOffer && discountPercentage > 0 && (
                  <span className="product-page__savings">
                    💰 Ahorras {formatPrice((product?.originalPrice || precio1) - finalPrice)}
                  </span>
                )}
              </div>
              {hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' && (
                <div className="product-page__offer-details">
                  <div className="product-page__buy-x-get-y-info">
                    🎁 <strong>Oferta Especial:</strong> Compra {userOffer.buy_quantity} por el precio de {userOffer.buy_quantity - userOffer.get_quantity}
                    <div className="product-page__offer-example">
                      💡 <em>Ejemplo:</em> Si compras {userOffer.buy_quantity * 2} productos, pagas por {userOffer.buy_quantity * 2 - userOffer.get_quantity * 2}
                    </div>
                    <div className="product-page__offer-note">
                      ℹ️ Los productos gratis se agregarán automáticamente al carrito
                    </div>
                  </div>
                </div>
              )}
              {hasUserOffer && userOffer && userOffer.discount_category === 'order_discount' && (
                <div className="product-page__offer-details">
                  <div className="product-page__order-discount-info">
                    💰 <strong>Descuento en Pedido:</strong> {Math.round(userOffer.discount_percentage)}% de descuento aplicado al total de tu pedido
                    {userOffer.min_purchase_amount && (
                      <div className="product-page__min-purchase">
                        📋 Compra mínima requerida: {formatPrice(userOffer.min_purchase_amount)}
                      </div>
                    )}
                    <div className="product-page__offer-note">
                      ℹ️ El descuento se aplicará automáticamente en el checkout
                    </div>
                  </div>
                </div>
              )}
              {hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping' && (
                <div className="product-page__offer-details">
                  <div className="product-page__free-shipping-info">
                    🚚 <strong>Envío Gratis:</strong> Este producto incluye envío gratuito
                    <div className="product-page__shipping-savings">
                      💰 ¡Ahorra en costos de envío! No se aplicarán cargos adicionales por envío
                    </div>
                    <div className="product-page__offer-note">
                      ℹ️ El envío gratis se aplicará automáticamente en el checkout
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="product-page__container-info-details">
              <div className="product-page__info-sku">
                <strong>SKU:</strong> {sku || id_articulo}
              </div>
              <div className="product-page__info-details">
                <span>Descripción del producto</span>
                <button
                  className="product-page__details-link"
                  onClick={() => setShowSpecifications(!showSpecifications)}
                >
                  {showSpecifications ? 'Ocultar Detalles' : 'Ver Detalles ›'}
                </button>
              </div>
              <div className="product-page__info-meta">
                {url_video && <div><strong>Video:</strong> <a href={url_video} target="_blank" rel="noopener noreferrer">Ver video</a></div>}
              </div>

            </div>

            {/* Product Specifications - Shown when Ver Detalles is clicked */}
            {showSpecifications && especificaciones && (
              <div className="product-page__specifications">
                <h4>Especificaciones del Producto:</h4>
                <div className="product-page__specifications-content">
                  {especificaciones.split(',')
                    .filter(spec => {
                      const specName = spec.split(':')[0]?.trim().toLowerCase();
                      // Filtrar especificaciones que no queremos mostrar
                      return !['tipo artículo', 'tipo articulo', 'activo', 'catalogo', 'shopify', 'proveedor', 'web mayoristas', 'agotado', 'virtual/local'].includes(specName);
                    })
                    .map((spec, index) => (
                      <div key={index} className="product-page__specification-item">
                        <strong>{spec.split(':')[0]}:</strong> {spec.split(':')[1] || ''}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Product Options */}
            <div className="product-page__options">
              <h3 className="product-page__options-title">Selecciona color y talla</h3>

              {/* Color Selection - Step 1 */}
              {coloresFallback.length > 0 && (
                <div className="product-page__option">
                  <div className="product-page__option-header">
                    <span className="product-page__step-number">Paso 1</span>
                    <span className="product-page__step-description">Selecciona el color de tu preferencia</span>
                  </div>
                  <div className="product-page__option-label">
                    Color{selectedColor ? (
                      <>
                        : <span style={{
                          fontWeight: 'bold',
                          color: '#000'
                        }}>
                          {selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1).toLowerCase()}
                        </span> 🎨
                      </>
                    ) : ''}
                  </div>
                  <div className="product-page__color-options">
                    {coloresFallback.map((color, index) => {
                      const hexColor = colorConverter.getColorHex(color);
                      const isLight = colorConverter.isLightColor(hexColor);

                      return (
                        <button
                          key={index}
                          className={`product-page__color-option ${selectedColor === color ? 'product-page__color-option--selected' : ''
                            }`}
                          onClick={() => setSelectedColor(color)}
                          style={{
                            backgroundColor: hexColor,
                            border: `2px solid ${selectedColor === color ? '#333' : 'transparent'}`
                          }}
                          title={`${color} (${hexColor})`}
                        >
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection - Step 2 */}
              {tallasAMostrar.length > 0 && (
                <div className="product-page__option">
                  <div className="product-page__option-header product-page__step-number-border">
                    <span className="product-page__step-number">Paso 2</span>
                    <span className="product-page__step-description">Selecciona la talla y cantidad de piezas</span>
                  </div>
                  <div className="product-page__option-label">Talla</div>

                  <div className="product-page__size-options">
                    {tallasAMostrar.map((talla, index) => (
                      <div key={talla} className={`product-page__size-item ${selectedSize === talla ? 'product-page__size-item--selected' : ''}`}>
                        <button
                          className={`product-page__size-button ${selectedColor && getStockBySizeAndColor(talla, selectedColor) <= 0 ? 'product-page__size-button--out-of-stock' : ''}`}
                          onClick={() => handleSizeSelection(talla)}
                          disabled={selectedColor && getStockBySizeAndColor(talla, selectedColor) <= 0}
                          title={selectedColor && getStockBySizeAndColor(talla, selectedColor) <= 0 ?
                            'Sin stock disponible para este color' :
                            'Seleccionar talla'
                          }
                        >
                          <span className="product-page__size-number">{talla}</span>
                          <span className="product-page__size-availability">
                            {selectedColor ?
                              `${getStockBySizeAndColor(talla, selectedColor)} disponibles` :
                              'Disponibles'
                            }
                          </span>
                        </button>

                        <div className="product-page__size-quantity">
                          <button
                            className={`product-page__quantity-btn ${(quantitiesBySize[talla] || 0) <= 0 ? 'product-page__quantity-btn--disabled' : ''}`}
                            onClick={() => handleQuantityChangeForSize(talla, (quantitiesBySize[talla] || 0) - 1)}
                            disabled={(quantitiesBySize[talla] || 0) <= 0}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                          <span className="product-page__quantity-display">
                            {quantitiesBySize[talla] || 0}
                          </span>
                          <button
                            className={`product-page__quantity-btn ${(quantitiesBySize[talla] || 0) >= getStockForSize(talla) ? 'product-page__quantity-btn--disabled' : ''}`}
                            onClick={() => handleQuantityChangeForSize(talla, (quantitiesBySize[talla] || 0) + 1)}
                            disabled={(quantitiesBySize[talla] || 0) >= getStockForSize(talla)}
                            title={(quantitiesBySize[talla] || 0) >= getStockForSize(talla) ?
                              `Máximo ${getStockForSize(talla)} unidades disponibles` :
                              'Aumentar cantidad'
                            }
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart - Step 3 */}
              <div className="product-page__option">
                <div className="product-page__option-header product-page__step-number-border">
                  <span className="product-page__step-number">Paso 3</span>
                  <span className="product-page__step-description">
                    Agregar al carrito
                    {getTotalUnits() > 0 && (
                      <span className="product-page__total-units-indicator">
                        ({getTotalUnits()} unidad{getTotalUnits() > 1 ? 'es' : ''})
                      </span>
                    )}
                  </span>
                </div>

                <CherryButton
                  variant="red"
                  size="large"
                  fullWidth
                  onClick={handleAddToCart}
                  disabled={!selectedColor || getTotalUnits() === 0 || isAddingToCart}
                  icon={
                    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.349 2.00028H3.75L3.51562 0.854451C3.46354 0.567993 3.20312 0.333618 2.91667 0.333618H0.3125C0.130208 0.333618 0 0.489868 0 0.646118V1.27112C0 1.45341 0.130208 1.58362 0.3125 1.58362H2.39583L4.19271 10.8545C3.90625 11.167 3.75 11.5576 3.75 12.0003C3.75 12.9378 4.47917 13.667 5.41667 13.667C6.32812 13.667 7.08333 12.9378 7.08333 12.0003C7.08333 11.7138 6.97917 11.4274 6.84896 11.167H10.625C10.4948 11.4274 10.4167 11.7138 10.4167 12.0003C10.4167 12.9378 11.1458 13.667 12.0833 13.667C12.9948 12.9378 13.75 12.9378 13.75 12.0003C13.75 11.5315 13.5417 11.1149 13.2292 10.8024L13.2552 10.6982C13.3333 10.3076 13.0469 9.91695 12.6302 9.91695H5.28646L5.05208 8.66695H13.1771C13.4896 8.66695 13.724 8.48466 13.8021 8.1982L14.974 2.78153C15.0521 2.39091 14.7656 2.00028 14.349 2.00028ZM5.41667 12.6253C5.05208 12.6253 4.79167 12.3649 4.79167 12.0003C4.79167 11.6617 5.05208 11.3753 5.41667 11.3753C5.75521 11.3753 6.04167 11.6617 6.04167 12.0003C6.04167 12.3649 5.75521 12.6253 5.41667 12.6253ZM12.0833 12.6253C11.7188 12.6253 11.4583 12.3649 11.4583 12.0003C11.4583 11.6617 11.7188 11.3753 12.0833 11.3753C12.4219 11.3753 12.7083 11.6617 12.7083 12.0003C12.7083 12.3649 12.4219 12.6253 12.0833 12.6253ZM12.6823 7.41695H4.79167L3.98438 3.25028H13.5938L12.6823 7.41695Z" fill="white" />
                    </svg>
                  }
                  iconPosition="left"
                >
                  {isAddingToCart ? 'Agregando...' : `Agregar al carrito (${getTotalUnits()} unidad${getTotalUnits() > 1 ? 'es' : ''})`}
                </CherryButton>

                {selectedColor && (
                  <div className="product-page__stock-summary">
                    <p>Total de unidades seleccionadas: <strong>{getTotalUnits()} unidad{getTotalUnits() > 1 ? 'es' : ''}</strong></p>
                    {getSelectedSizesWithQuantities().length > 0 && (
                      <div className="product-page__selected-sizes">
                        <p>Tallas seleccionadas:</p>
                        <ul>
                          {getSelectedSizesWithQuantities().map(({ talla, cantidad }) => (
                            <li key={talla}>
                              <strong>{talla}</strong>: {cantidad} unidad{cantidad > 1 ? 'es' : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Product Description */}
            <div className="product-page__description">
              <p className="product-page__description-text">
                {descripcion ? (showFullDescription ? descripcion : truncateDescription(descripcion)) : 'No hay descripción disponible'}
              </p>

              {descripcion && descripcion.length > 150 && (
                <button
                  className="product-page__description-toggle"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <FeaturedProducts
          title="Productos diseñados para reflejar tu estilo y personalidad."
          products={relatedProducts}
          viewAllLink="/catalogo"
          viewAllText="Ver Más"
          showViewAllButton={true}
          className="product-page__related-products"
          alwaysShowTitle={true}
        />
      )}

      {/* Product Reviews Section - Mobile View */}
      <div className="container show-mobile">
        <ProductReviews productId={productId} />
      </div>
    </>
  );
};

export default ProductPage;
