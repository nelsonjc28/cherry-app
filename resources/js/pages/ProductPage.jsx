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
import RecentlyViewedSection from '../components/RecentlyViewedSection/RecentlyViewedSection';


// Hooks
import { useUserDiscounts } from '../hooks/useUserDiscounts';

// API and Store
import { getProductById, generateS3ImageUrl, isUserSessionActive } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import useCartStore from '../store/cartStore';
import useUserStore from '../store/userStore';
import useRecentProductsStore from '../store/recentProductsStore';
import api from '../services/api';
import { favoriteService } from '../services/api';

// Utils
import { formatPrice } from '../utils/formatters';
import { getTotalInventoryFromProduct, getProductInventoryStatusKind, effectiveDetailInventoryContribution } from '../utils/productUtils';
import { isProductNewLikeNuevosPage } from '../utils/productNewRules';
import useHorizontalDragScroll from '../hooks/useHorizontalDragScroll';
import colorConverter from '../services/colorConverter';
import { validateStock, getProductStock } from '../services/inventoryService';
import { getVolumeDiscountMainTier, getSellerCategoryFromUser, hasApiVolumeMainPercent, isOroDiamanteSeller, canApplyMainDiscount } from '../utils/sellerVolumeDiscount';
import { canEncargoSinStock } from '../utils/encargoUtils';
import { summarizeVolumeFromCartItems } from '../utils/cartVolumePricing';

// Función para formatear montos con separador de miles
const formatMoneyWithCommas = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const { registerProduct } = useRecentProductsStore();

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

  // User discounts hook - debe estar antes de handleShareCatalog
  const { userDiscounts, loading: discountsLoading } = useUserDiscounts(product ? [product.id_articulo] : []);
  const [isSharing, setIsSharing] = useState(false);

  const handleShareCatalog = useCallback(async () => {
    // Prevenir múltiples clics
    if (isSharing) {
      return;
    }

    try {
      setIsSharing(true);

      // Validar que el producto existe
      if (!product) {
        throw new Error("No hay información del producto disponible");
      }

      // Compartir usando las imágenes del producto en S3 (todas las disponibles)
      const { shareProductWithImages } = await import('../utils/shareProductUtils');

      // Calcular información de precio y descuento directamente
      const basePrice = product?.precio1 || 0;

      // Calcular descuento con la misma lógica que calculateDiscountPercentage
      let discountPercentage = 0;
      const userOffer = product?.userOffer || userDiscounts[product.id_articulo];
      const hasUserOffer = Boolean(product?.hasUserOffer || userOffer);

      if (hasUserOffer && userOffer && userOffer.discount_percentage > 0) {
        discountPercentage = Math.round(userOffer.discount_percentage);
      } else if (product?.desc_promo && product.desc_promo > 0) {
        const reducedDiscount = Math.max(0, product.desc_promo - 10);
        discountPercentage = Math.round(reducedDiscount);
      } else if (product?.discount && product.discount > 0) {
        discountPercentage = Math.round(product.discount);
      } else if (product?.originalPrice && product?.price && product.originalPrice > product.price) {
        discountPercentage = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
      }

      // Calcular precio final con la misma lógica que calculateFinalPrice
      let finalPrice = basePrice;
      if (product?.price && product.price !== basePrice) {
        finalPrice = product.price;
      } else if (discountPercentage > 0 && basePrice > 0) {
        finalPrice = basePrice - (basePrice * (discountPercentage / 100));
      }

      const hasDiscount = discountPercentage > 0 && basePrice > finalPrice;

      await shareProductWithImages({
        id: product.id_articulo || product.id || product.codigo,
        title: product.descripcion || 'Producto Cherry',
        price: basePrice,
        finalPrice: finalPrice,
        discountPercentage: hasDiscount ? discountPercentage : 0,
        hasDiscount: hasDiscount
      });
    } catch (error) {

      let errorMessage = "No se pudo compartir el producto.";

      if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      if (window.showToast) {
        window.showToast(errorMessage, "error");
      }
    } finally {
      setIsSharing(false);
    }
  }, [product, userDiscounts, isSharing]);

  const handleShareImage = useCallback(async () => {
    try {
      // Validar que el producto existe
      if (!product) {
        throw new Error("No hay información del producto disponible");
      }

      // Mostrar mensaje de carga
      if (window.showToast) {
        window.showToast('Generando imagen del producto...', 'info');
      }

      // Obtener la URL de la imagen del producto
      const productImageUrl = generateS3ImageUrl(product.id_articulo);

      // Crear un canvas personalizado con la imagen y el texto
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Dimensiones del canvas
      const canvasWidth = 800;
      const canvasHeight = 1000;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Definir padding y dimensiones máximas
      const imagePadding = 40;
      const imageMaxWidth = canvasWidth - (imagePadding * 2);
      const imageMaxHeight = 500;

      // Variables para almacenar las dimensiones finales de la imagen
      let finalImageHeight = 0;

      // Cargar y dibujar la imagen del producto
      const productImage = new Image();
      productImage.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        productImage.onload = () => {
          // Calcular dimensiones de la imagen (mantener proporción)
          let imageWidth = productImage.naturalWidth;
          let imageHeight = productImage.naturalHeight;

          // Ajustar tamaño manteniendo proporción
          const aspectRatio = imageWidth / imageHeight;
          if (imageWidth > imageMaxWidth) {
            imageWidth = imageMaxWidth;
            imageHeight = imageWidth / aspectRatio;
          }
          if (imageHeight > imageMaxHeight) {
            imageHeight = imageMaxHeight;
            imageWidth = imageHeight * aspectRatio;
          }

          // Guardar la altura final para calcular la posición del texto
          finalImageHeight = imageHeight;

          // Centrar la imagen horizontalmente
          const imageX = (canvasWidth - imageWidth) / 2;
          const imageY = imagePadding;

          // Dibujar la imagen
          ctx.drawImage(productImage, imageX, imageY, imageWidth, imageHeight);

          resolve();
        };

        productImage.onerror = () => {
          // Si falla, usar altura por defecto
          finalImageHeight = 500;
          resolve();
        };

        productImage.src = productImageUrl;
      });

      // Calcular posición Y para el texto (después de la imagen)
      const textStartY = imagePadding + finalImageHeight + 60;

      // Configurar estilos de texto
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Dibujar título
      ctx.font = 'bold 32px Arial, sans-serif';
      const productName = product?.descripcion || 'Producto';
      const maxTitleWidth = canvasWidth - (imagePadding * 2);
      ctx.fillText(productName, canvasWidth / 2, textStartY, maxTitleWidth);

      // Calcular precios
      const basePrice = product?.precio1 || 0;
      let discount = 0;
      let finalPrice = basePrice;

      if (product?.userOffer?.discount_percentage > 0) {
        discount = Math.round(product.userOffer.discount_percentage);
      } else if (product?.desc_promo && product.desc_promo > 0) {
        // Restar 10% al descuento de la API externa (solo si NO es oferta de usuario)
        const reducedDiscount = Math.max(0, product.desc_promo - 10);
        discount = Math.round(reducedDiscount);
      } else if (product?.discount && product.discount > 0) {
        discount = Math.round(product.discount);
      }

      if (discount > 0 && basePrice > 0) {
        finalPrice = basePrice - (basePrice * (discount / 100));
      } else if (product?.price && product.price !== basePrice) {
        finalPrice = product.price;
      }

      // Dibujar precios
      let priceY = textStartY + 60;

      if (discount > 0) {
        // Precio tachado
        ctx.fillStyle = '#999999';
        ctx.font = '24px Arial, sans-serif';
        const strikethroughText = `$${basePrice.toFixed(2)}`;
        const strikethroughWidth = ctx.measureText(strikethroughText).width;
        ctx.fillText(strikethroughText, canvasWidth / 2, priceY);

        // Dibujar línea tachada
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((canvasWidth / 2) - (strikethroughWidth / 2), priceY + 12);
        ctx.lineTo((canvasWidth / 2) + (strikethroughWidth / 2), priceY + 12);
        ctx.stroke();

        // Precio con descuento
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.fillText(`$${finalPrice.toFixed(2)}`, canvasWidth / 2, priceY + 30);

        // Descuento
        ctx.fillStyle = '#27ae60';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.fillText(`-${discount}%`, canvasWidth / 2, priceY + 75);
      } else {
        // Solo precio sin descuento
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.fillText(`$${basePrice.toFixed(2)}`, canvasWidth / 2, priceY);
      }

      // Dibujar texto de llamada a la acción
      ctx.fillStyle = '#666666';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('Pregunta por colores y tallas disponibles', canvasWidth / 2, priceY + (discount > 0 ? 120 : 60));

      // Convertir canvas a blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("No se pudo convertir el canvas a blob"));
          }
        }, "image/png", 0.95);
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

        let text = `Checa este nuevo producto que tenemos para ti!!\n\n`;
        text += `${productName}\n\n`;
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
  }, [product, userDiscounts]);

  // Rating states
  // Rating data ahora viene del producto directamente
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
  const { addToCart, isLoading: isAddingToCart, items: cartItems, totalPrice: cartTotalPrice } = useCartStore();

  // Load product data from local database
  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Llamar al nuevo endpoint del backend
        const response = await api.get(`/products/${productId}`);

        if (!response.data.success || !response.data.data) {
          throw new Error('Producto no encontrado');
        }

        // Obtener datos del producto desde la respuesta del backend
        const productData = response.data.data;

        // Aplicar ofertas usando el sistema inteligente (con o sin sesión)
        const hasActiveSession = isUserSessionActive();
        let productWithOffer = productData;

        if (hasActiveSession) {
          // Si hay sesión activa, aplicar ofertas personalizadas
          const productsWithOffers = await applyUserOffersToProducts([productData]);
          productWithOffer = productsWithOffers[0] || productData;
        } else {
          // Si no hay sesión, usar solo las ofertas externas (ya incluidas en la respuesta)
          productWithOffer = productData;
        }

        setProduct(productWithOffer);

        // Registrar producto en "Vistos Recientemente" si el usuario está autenticado
        const productIdToSave = productData.id || productData.id_articulo || productId;
        if (productIdToSave && user) {
          registerProduct(String(productIdToSave));
        }

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

        // Rating data ahora viene del producto directamente
      } catch (err) {
        setError(err.message || 'Error al cargar el producto');
        if (window.showToast) {
          window.showToast('Error al cargar el producto', 'error');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [productId, user]);

  // Load suggested products when product is loaded
  useEffect(() => {
    if (!productId || !product) return;

    const fetchSuggestedProducts = async () => {
      try {
        // Encode productId to handle special characters
        const encodedProductId = encodeURIComponent(productId);
        const response = await api.get(`/products/${encodedProductId}/suggested?limit=8`);

        if (response.data.success && response.data.data) {
          // Apply user offers if user is logged in
          const hasActiveSession = isUserSessionActive();
          let suggestedProducts = response.data.data;

          if (hasActiveSession && suggestedProducts.length > 0) {
            const productIds = suggestedProducts.map(p => p.id || p.id_articulo);
            const productsWithOffers = await applyUserOffersToProducts(suggestedProducts);
            suggestedProducts = productsWithOffers;
          }

          setRelatedProducts(suggestedProducts);
        }
      } catch (err) {
        // Silently fail - don't show error for suggested products
        setRelatedProducts([]);
      }
    };

    fetchSuggestedProducts();
  }, [productId, product]);



  // Efecto para resetear la cantidad cuando cambie la talla o color
  useEffect(() => {
    if (selectedColor && selectedSize) {
      // Verificar si el producto está "próximamente" y el usuario es "oro"
      const inventoryStatus = getInventoryStatus();
      const canEncargo = canEncargoSinStock(user, inventoryStatus.status);

      const stockDisponible = getStockBySizeAndColor(selectedSize, selectedColor);
      if (quantity > stockDisponible && !canEncargo) {
        setQuantity(Math.max(1, stockDisponible));
      }
    }
  }, [selectedColor, selectedSize, product, user]);

  // Efecto para ajustar la cantidad cuando se seleccione una talla diferente
  useEffect(() => {
    if (selectedColor && selectedSize) {
      // Verificar si el producto está "próximamente" y el usuario es "oro"
      const inventoryStatus = getInventoryStatus();
      const canEncargo = canEncargoSinStock(user, inventoryStatus.status);

      const stockDisponible = getStockBySizeAndColor(selectedSize, selectedColor);
      if (quantity > stockDisponible && !canEncargo) {
        setQuantity(Math.max(1, stockDisponible));
      }
    }
  }, [selectedSize, selectedColor, user]);

  // Efecto para resetear la talla seleccionada cuando cambie el color
  useEffect(() => {
    if (selectedColor && selectedSize) {
      // Verificar si el producto está "próximamente" y el usuario es "oro"
      const inventoryStatus = getInventoryStatus();
      const canEncargo = canEncargoSinStock(user, inventoryStatus.status);

      const stockDisponible = getStockBySizeAndColor(selectedSize, selectedColor);
      if (stockDisponible <= 0 && !canEncargo) {
        setSelectedSize('');
        setQuantity(1);
        setQuantitiesBySize({});
      }
    }
  }, [selectedColor, selectedSize, user]);

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


  // Rating data ahora viene del producto directamente, no necesita fetch separado


  // Handle add to cart
  const handleNotifyProductInterest = async () => {
    if (!user) {
      if (window.showToast) {
        window.showToast('Debes iniciar sesión para registrarte.', 'error');
      }
      return;
    }

    if (!product || !product.id_articulo) {
      if (window.showToast) {
        window.showToast('Error: Información del producto no disponible.', 'error');
      }
      return;
    }

    try {
      // Notificar al admin
      const response = await api.post('/notify-product-interest', {
        product_id: product.id_articulo,
        product_title: product.descripcion || 'Producto sin nombre',
        user_id: user.id,
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        user_email: user.email
      });

      if (response.data && response.data.success) {
        if (window.showToast) {
          window.showToast('✅ Te avisaremos cuando este producto esté disponible.', 'success');
        }
      } else {
        throw new Error(response.data?.message || 'Error desconocido');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error al registrar tu interés. Por favor intenta nuevamente.';
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    }
  };

  const handleAddToCart = async () => {
    // Validar que el producto tenga precio mayor a 0
    const basePrice = precio1 || 0;
    if (basePrice <= 0) {
      if (window.showToast) {
        window.showToast('Este producto no está disponible para compra. El precio no está configurado.', 'error');
      }
      return;
    }

    const inventoryStatus = getInventoryStatus();
    const statusKind = inventoryStatus.status;
    const isComingSoon = statusKind === 'coming-soon';
    const isOutOfStock = statusKind === 'out-of-stock';
    const canEncargo = canEncargoSinStock(user, statusKind);

    if (isOutOfStock && canEncargo && !user) {
      if (window.showToast) {
        window.showToast('Debes iniciar sesión para hacer encargos de productos agotados.', 'error');
      }
      return;
    }

    // Si el producto está "próximamente", manejar según categoría del usuario
    if (isComingSoon) {
      if (!user) {
        if (window.showToast) {
          window.showToast('Debes iniciar sesión para hacer encargos de productos próximamente.', 'error');
        }
        return;
      }

      // Sin categoría Oro/Diamante: solo avisar interés (no encargo al carrito)
      if (!isOroDiamanteSeller(user)) {
        try {
          // Notificar al admin
          await api.post('/api/notify-product-interest', {
            product_id: product.id_articulo,
            product_title: product.descripcion,
            user_id: user.id,
            user_name: `${user.first_name} ${user.last_name}`,
            user_email: user.email
          });

          if (window.showToast) {
            window.showToast('✅ Te avisaremos cuando este producto esté disponible.', 'success');
          }
        } catch (error) {
          if (window.showToast) {
            window.showToast('Error al registrar tu interés. Por favor intenta nuevamente.', 'error');
          }
        }
        return;
      }
      // Con descuento API: continuar y agregar al carrito
    }

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

    if (!canEncargo) {
      for (const { talla, cantidad } of tallasConCantidades) {
        const stockDisponible = getStockBySizeAndColor(talla, selectedColor);

        if (cantidad > stockDisponible) {
          if (window.showToast) {
            window.showToast(`Solo hay ${stockDisponible} unidades disponibles para la talla ${talla}`, 'error');
          }
          return;
        }
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
          precio1: precio1, // Precio original (precio1) - siempre guardarlo para cálculos de descuentos
          originalPrice: hasOffer ? precio1 : null, // Precio original solo si hay descuento (para display)
          discount: hasOffer ? discountPercentage : null, // Porcentaje de descuento
          savings: hasOffer ? (precio1 - finalPrice) : null, // Cantidad ahorrada
          image: generateS3ImageUrl(product.id_articulo),
          selectedColor,
          selectedSize: talla,
          quantity: cantidad,
          colors: [selectedColor],
          barcode: getBarcodeBySizeAndColor(talla, selectedColor) || product.ean || product.sku || product.codigo_barras || product.id_articulo, // Código de barras específico por talla/color
          isComingSoon: isComingSoon,
          isOutOfStockEncargo: isOutOfStock && canEncargo,
          // Información de ofertas especiales
          userOffer: hasUserOffer ? {
            discount_category: userOffer.discount_category, // IMPORTANTE: incluir discount_category
            type: userOffer.discount_category,
            title: userOffer.title,
            discount_percentage: userOffer.discount_percentage,
            buy_quantity: userOffer.buy_quantity,
            get_quantity: userOffer.get_quantity,
            min_purchase_amount: userOffer.min_purchase_amount
          } : null
        };

        await addToCart(productToAdd, cantidad, product);

        // La lógica de Buy X Get Y ahora se maneja automáticamente en el cartStore
      }

      if (window.showToast) {
        const totalUnidades = getTotalUnits();
        let message = `${totalUnidades} unidad${totalUnidades > 1 ? 'es' : ''} agregada${totalUnidades > 1 ? 's' : ''} al carrito`;

        if (isComingSoon) {
          message += ' 📦 (Encargo - Próximamente)';
        } else if (isOutOfStock && canEncargo) {
          message += ' 📦 (Encargo - Agotado)';
        }

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
    // Verificar si el producto está "próximamente" y el usuario es "oro"
    const inventoryStatus = getInventoryStatus();
    const canEncargo = canEncargoSinStock(user, inventoryStatus.status);

    const stockMaximo = getStockForSize(talla);

    const maxAllowed = canEncargo ? 9999 : stockMaximo;

    if (newQuantity >= 0 && newQuantity <= maxAllowed) {
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
    // Verificar si el producto está "próximamente" y el usuario es "oro"
    const inventoryStatus = getInventoryStatus();
    const canEncargo = canEncargoSinStock(user, inventoryStatus.status);

    const stockDisponible = selectedColor ? getStockBySizeAndColor(talla, selectedColor) : getStockForSize(talla);

    if (stockDisponible <= 0 && !canEncargo) {
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
      if (stockDisponible > 0 || canEncargo) {
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

  // ===== ALERTAS DE DESCUENTO PARA PÁGINA DE PRODUCTO =====
  const DISCOUNT_30_THRESHOLD = 7000;
  const DISCOUNT_40_THRESHOLD = 15000;
  const NEAR_THRESHOLD_PERCENT = 0.7;

  // Calcular total elegible del carrito (productos sin rebaja)
  const eligibleCartTotal = (cartItems || []).reduce((sum, item) => {
    const hasNoPromo = item.desc_promo === 0 || item.desc_promo === null || item.desc_promo === undefined;
    const hasNoUserOffer = !item.userOffer || item.userOffer.discount_category === null;
    if (hasNoPromo && hasNoUserOffer) {
      const itemPrice = item.precio || item.price || 0;
      const itemQuantity = item.quantity || 0;
      return sum + (itemPrice * itemQuantity);
    }
    return sum;
  }, 0);

  // Calcular total del carrito para envío
  const cartTotal = cartTotalPrice || 0;
  const freeShippingMin = user?.free_shipping_min_amount || 3000;

  const getProductPageAlerts = () => {
    const alerts = [];
    const isDiamanteUser = getSellerCategoryFromUser(user) === 'diamante';
    const { mainPercent: volMainPercent } = getVolumeDiscountMainTier(user);

    // Alertas para descuentos (solo si hay items elegibles o el producto actual es elegible)
    const productHasNoPromo = !product?.desc_promo || product.desc_promo === 0;

    const volSummary = user && (cartItems || []).length
      ? summarizeVolumeFromCartItems(user, cartItems)
      : null;
    const desc2 = volSummary ? Number(volSummary.descuento2) : 0;
    const apiSecondTierActive = hasApiVolumeMainPercent(user)
      && canApplyMainDiscount(user, eligibleCartTotal)
      && desc2 > 0
      && eligibleCartTotal < DISCOUNT_40_THRESHOLD;

    if (productHasNoPromo || eligibleCartTotal > 0) {
      if (eligibleCartTotal < DISCOUNT_30_THRESHOLD) {
        const remaining = DISCOUNT_30_THRESHOLD - eligibleCartTotal;
        const isNear = eligibleCartTotal >= (DISCOUNT_30_THRESHOLD * NEAR_THRESHOLD_PERCENT);

        if (isNear && eligibleCartTotal > 0) {
          alerts.push({
            type: 'near',
            icon: '🔥',
            message: isDiamanteUser
              ? `¡Ya casi! Te faltan $${formatMoneyWithCommas(remaining)} para activar tu descuento por volumen`
              : `¡Ya casi! Te faltan $${formatMoneyWithCommas(remaining)} para obtener tu descuento del ${volMainPercent}%`,
            color: '#ff9800'
          });
        } else {
          alerts.push({
            type: 'info',
            icon: '💰',
            message: eligibleCartTotal > 0
              ? (isDiamanteUser
                ? `Te faltan $${formatMoneyWithCommas(remaining)} para activar tu descuento por volumen`
                : `Te faltan $${formatMoneyWithCommas(remaining)} para obtener un descuento del ${volMainPercent}%`)
              : (isDiamanteUser
                ? `Agrega $${DISCOUNT_30_THRESHOLD.toLocaleString()} en productos elegibles para activar tu descuento por volumen`
                : `Agrega $${DISCOUNT_30_THRESHOLD.toLocaleString()} en productos para obtener ${volMainPercent}% de descuento`),
            color: '#2196f3'
          });
        }
      } else if (eligibleCartTotal >= DISCOUNT_30_THRESHOLD && eligibleCartTotal < DISCOUNT_40_THRESHOLD) {
        const remaining = DISCOUNT_40_THRESHOLD - eligibleCartTotal;
        const isNear = eligibleCartTotal >= (DISCOUNT_40_THRESHOLD * NEAR_THRESHOLD_PERCENT);

        if (apiSecondTierActive) {
          alerts.push({
            type: 'success',
            icon: '🎉',
            message: isDiamanteUser
              ? '¡Tienes el descuento máximo por volumen (incluye 10% adicional)!'
              : `¡Tienes el descuento máximo del ${volMainPercent}% + 10% adicional!`,
            color: '#4caf50',
          });
        } else {
          alerts.push({
            type: 'success',
            icon: '✅',
            message: isDiamanteUser
              ? '¡Tienes tu descuento por volumen activado!'
              : `¡Tienes ${volMainPercent}% de descuento!`,
            color: '#4caf50',
          });

          if (isNear) {
            alerts.push({
              type: 'near',
              icon: '🔥',
              message: `¡Ya casi! Te faltan $${formatMoneyWithCommas(remaining)} para un 10% adicional`,
              color: '#ff9800',
            });
          } else {
            alerts.push({
              type: 'info',
              icon: '🎯',
              message: `Te faltan $${formatMoneyWithCommas(remaining)} para un 10% adicional`,
              color: '#2196f3',
            });
          }
        }
      } else if (eligibleCartTotal >= DISCOUNT_40_THRESHOLD) {
        alerts.push({
          type: 'success',
          icon: '🎉',
          message: isDiamanteUser
            ? '¡Tienes el descuento máximo por volumen (incluye 10% adicional)!'
            : `¡Tienes el descuento máximo del ${volMainPercent}% + 10% adicional!`,
          color: '#4caf50'
        });
      }
    }

    // Alertas para envío gratis
    if (cartTotal < freeShippingMin) {
      const remaining = freeShippingMin - cartTotal;
      const isNear = cartTotal >= (freeShippingMin * NEAR_THRESHOLD_PERCENT);

      if (isNear && cartTotal > 0) {
        alerts.push({
          type: 'near',
          icon: '🚚',
          message: `¡Ya casi! Te faltan $${formatMoneyWithCommas(remaining)} para envío gratis`,
          color: '#ff9800'
        });
      } else if (cartTotal > 0) {
        alerts.push({
          type: 'info',
          icon: '📦',
          message: `Te faltan $${formatMoneyWithCommas(remaining)} para envío gratis`,
          color: '#9c27b0'
        });
      }
    } else if (cartTotal > 0) {
      alerts.push({
        type: 'success',
        icon: '🚚',
        message: `¡Tienes envío gratis!`,
        color: '#4caf50'
      });
    }

    return alerts;
  };

  // Calcular alertas base
  const baseAlerts = getProductPageAlerts();

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
    // PRIORIDAD 1: Descuento personalizado del usuario (ya procesado) - NO reducir
    if (hasUserOffer && userOffer && userOffer.discount_percentage > 0) {
      return Math.round(userOffer.discount_percentage);
    }
    // PRIORIDAD 2: Descuento general desde la API (desc_promo) - reducir 10% a descuentos de API externa
    if (product?.desc_promo && product.desc_promo > 0) {
      // Restar 10% al descuento de la API externa (solo si NO es oferta de usuario)
      const reducedDiscount = Math.max(0, product.desc_promo - 10);
      return Math.round(reducedDiscount);
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
  const hasOffer = discountPercentage > 0 || (hasUserOffer && userOffer && (userOffer.discount_category === 'buy_x_get_y' || userOffer.discount_category === 'order_discount'));

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

    return effectiveDetailInventoryContribution(detalle.inventario_d);
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

  // Estado de inventario (misma regla que tarjetas: {@link getProductInventoryStatusKind})
  const getInventoryStatus = () => {
    const kind = getProductInventoryStatusKind(product);

    if (kind === 'in-stock') {
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

    if (kind === 'coming-soon') {
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

  const isNewProduct = isProductNewLikeNuevosPage(product);

  // Agregar alerta de "próximamente" si aplica (después de que getInventoryStatus esté definida)
  const isComingSoon = inventoryStatusData.status === 'coming-soon';
  const canEncargo = canEncargoSinStock(user, inventoryStatusData.status);
  const showNotifyAlert = isComingSoon && (!user || !canEncargo);

  const productPageAlerts = [...baseAlerts];
  if (showNotifyAlert) {
    productPageAlerts.push({
      type: 'warning',
      icon: 'ℹ️',
      message: 'Si te interesa este producto da click aquí para avisarte cuando llegue',
      color: '#ff9800',
      isComingSoonAlert: true // Flag para identificar esta alerta especial
    });
  }

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

  // Construir URL completa del producto para el schema
  const productUrl = `${window.location.origin}/producto/${id_articulo}`;
  const productImageUrl = generateS3ImageUrl(id_articulo);

  // Construir schema JSON-LD para SEO (requerido por Google)
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": descripcion,
    "description": descripcion,
    "image": productImageUrl,
    "brand": {
      "@type": "Brand",
      "name": marca || "Cherry Central"
    },
    "sku": sku || id_articulo,
    "mpn": id_articulo,
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "MXN",
      "price": finalPrice || precio1 || 0,
      "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 año desde ahora
      "availability": getTotalInventoryFromProduct(product) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "Organization",
        "name": "Cherry Central"
      }
    }
  };

  // Agregar aggregateRating si hay calificaciones
  if (ratingData && ratingData.count > 0 && ratingData.average > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": ratingData.average,
      "reviewCount": ratingData.count,
      "bestRating": 5,
      "worstRating": 1
    };
  }

  const canonicalUrl = `https://cherrydistribuidores.com.mx${location.pathname}`;

  return (
    <>
      <Helmet>
        <title>{descripcion} - Cherry</title>
        <meta name="description" content={descripcion} />
        <link rel="canonical" href={canonicalUrl} />
        {/* Schema.org structured data for Product - Required by Google */}
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      </Helmet>

      <div className="product-page">
        <div className="product-page__container container">
          {/* Badges and share button MOBILE */}
          <div className="product-page__breadcrumb show-mobile">
            <div className="product-page__detail-badges">
              {inventoryStatusData.status === 'coming-soon' ? (
                <span className="catalog-offer-badge catalog-out-of-stock-badge catalog-coming-soon-badge" style={{ backgroundColor: 'rgb(255, 152, 0)', color: 'rgb(255, 255, 255)' }}>Próximamente</span>
              ) : (
                <>
                  {isNewProduct && (
                    <span className="catalog-offer-badge catalog-new-badge">Nuevo</span>
                  )}
                  {inventoryStatusData.status === 'out-of-stock' && (
                    <span className="product-page__badge product-page__badge--out-of-stock">Agotado</span>
                  )}
                  {hasOffer && discountPercentage > 0 && (
                    <span className="product-page__badge product-page__badge--discount">-{discountPercentage}%</span>
                  )}
                </>
              )}
            </div>

            <CustomButton
              variant="filled"
              size="small"
              onClick={handleShareCatalog}
            >
              <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
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
              <ProductReviews productId={productId} reviews={product?.reviews} ratingData={ratingData} />
            </div>
          </div>

          {/* Product Info */}
          <div className="product-page__info">
            {/* Badges and share button DESKTOP */}
            <div className="product-page__breadcrumb show-desktop">
              <div className="product-page__detail-badges">
                {inventoryStatusData.status === 'coming-soon' ? (
                  <span className="catalog-offer-badge catalog-out-of-stock-badge catalog-coming-soon-badge" style={{ backgroundColor: 'rgb(255, 152, 0)', color: 'rgb(255, 255, 255)' }}>Próximamente</span>
                ) : (
                  <>
                    {isNewProduct && (
                      <span className="catalog-offer-badge catalog-new-badge">Nuevo</span>
                    )}
                    {inventoryStatusData.status === 'out-of-stock' && (
                      <span className="product-page__badge product-page__badge--out-of-stock">Agotado</span>
                    )}
                    {hasOffer && discountPercentage > 0 && (
                      <span className="product-page__badge product-page__badge--discount">-{discountPercentage}%</span>
                    )}
                  </>
                )}
              </div>

              <CustomButton
                variant="filled"
                size="medium"
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
                <>
                  {inventoryStatusData.icon}
                  <span className={`product-page__stock-status product-page__stock-status--${inventoryStatusData.status}`}>
                    {inventoryStatusData.text}
                  </span>
                </>
              </div>
            </div>

            <div className="product-page__info-price">
              {hasOffer && !isComingSoon && (
                <div className={`product-page__offer-badge ${hasUserOffer ? 'user-offer' : ''} ${hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' ? 'buy-x-get-y' :
                  hasUserOffer && userOffer && userOffer.discount_category === 'order_discount' ? 'order-discount' :
                    hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping' ? 'free-shipping' : ''
                  }`}>
                  {hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' ?
                    `🎁 Compra ${userOffer.buy_quantity} por el precio de ${userOffer.buy_quantity - userOffer.get_quantity}` :
                    hasUserOffer && userOffer && userOffer.discount_category === 'order_discount' ?
                      `💰 Descuento en pedido ${Math.round(userOffer.discount_percentage)}%` :
                      hasUserOffer && userOffer && userOffer.discount_percentage > 0 ?
                        (<>{!isMobile && "Rebaja "}{Math.round(userOffer.discount_percentage)}%</>) :
                        (<>🏷️ {!isMobile && "Rebaja "}{discountPercentage}%</>)
                  }
                </div>
              )}


              <div className="product-page__price-container">
                {/* Si es "próximamente", solo mostrar el precio original sin descuento */}
                {isComingSoon ? (
                  <div className="product-page__final-price">{formatPrice(precio1)}</div>
                ) : (
                  <>
                    {hasOffer && discountPercentage > 0 && (
                      <div className="product-page__original-price">{formatPrice(precio1)}</div>
                    )}
                    <div className="product-page__final-price">{formatPrice(finalPrice)}</div>
                    {hasOffer && discountPercentage > 0 && (
                      <span className="product-page__savings">
                        💰 Ahorras {formatPrice(precio1 - finalPrice)}
                      </span>
                    )}
                  </>
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

            {/* Product Notes - Shown when Ver Detalles is clicked */}
            {showSpecifications && notas && (
              <div className="product-page__specifications">
                <h4>Detalles del Producto:</h4>
                <div className="product-page__specifications-content">
                  <div className="product-page__specification-item">
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{notas}</p>
                  </div>
                </div>
              </div>
            )}
            {showSpecifications && !notas && (
              <div className="product-page__specifications">
                <div className="product-page__specifications-content">
                  <p>No hay detalles disponibles para este producto.</p>
                </div>
              </div>
            )}

            {/* Alertas de descuento y envío (excluyendo alerta de próximamente que se muestra en paso 2) */}
            {productPageAlerts.filter(alert => !alert.isComingSoonAlert).length > 0 && (
              <div className="product-page__alerts">
                {productPageAlerts.filter(alert => !alert.isComingSoonAlert).map((alert, index) => (
                  <div
                    key={index}
                    className={`product-page__alert product-page__alert--${alert.type}`}
                    style={{
                      borderLeftColor: alert.color,
                      backgroundColor: `${alert.color}15`
                    }}
                  >
                    <span className="product-page__alert-icon">{alert.icon}</span>
                    <span className="product-page__alert-message">{alert.message}</span>
                  </div>
                ))}
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
                        </span>
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
              {tallasAMostrar.length > 0 && (() => {
                // Verificar si el producto está "próximamente" y el usuario es "oro" (fuera del map para usar en el mensaje)
                const inventoryStatus = getInventoryStatus();
                const statusKind = inventoryStatus.status;
                const isComingSoon = statusKind === 'coming-soon';
                const isOutOfStock = statusKind === 'out-of-stock';
                const canEncargo = canEncargoSinStock(user, statusKind);
                const showNotifyAlert = isComingSoon && (!user || !canEncargo);
                const encargoLabel = isComingSoon
                  ? 'Encargo - Próximamente'
                  : (isOutOfStock && canEncargo ? 'Encargo - Agotado' : null);

                return (
                  <div className="product-page__option">
                    <div className="product-page__option-header product-page__step-number-border">
                      <span className="product-page__step-number">Paso 2</span>
                      <span className="product-page__step-description">Selecciona la talla y cantidad de piezas</span>
                    </div>
                    <div className="product-page__option-label">Talla</div>

                    {/* Mensaje de próximamente - Solo mostrar si es producto próximamente y no es usuario oro */}
                    {showNotifyAlert && (
                      <div className="product-page__coming-soon-alert">
                        <div className="product-page__coming-soon-alert-row1">
                          <span className="product-page__coming-soon-alert-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D2042D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                          </span>
                          <span className="product-page__coming-soon-alert-line1">Muy pronto disponible</span>
                        </div>
                        <div className="product-page__coming-soon-alert-row2">
                          <span className="product-page__coming-soon-alert-line2">Te avisamos en cuanto vuelva a estar disponible.</span>
                          <button
                            type="button"
                            className="product-page__coming-soon-alert-btn"
                            onClick={handleNotifyProductInterest}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            Notificarme
                          </button>
                        </div>
                      </div>
                    )}


                    <div className="product-page__size-options">
                      {tallasAMostrar.map((talla, index) => {
                        const stockDisponible = selectedColor ? getStockBySizeAndColor(talla, selectedColor) : getStockForSize(talla);
                        const isDisabled = selectedColor && stockDisponible <= 0 && !canEncargo;
                        const maxStock = getStockForSize(talla);
                        const maxAllowed = canEncargo ? 9999 : maxStock;
                        const canIncrease = (quantitiesBySize[talla] || 0) < maxAllowed;

                        return (
                          <div key={talla} className={`product-page__size-item ${selectedSize === talla ? 'product-page__size-item--selected' : ''}`}>
                            <button
                              className={`product-page__size-button ${isDisabled ? 'product-page__size-button--out-of-stock' : ''}`}
                              onClick={() => handleSizeSelection(talla)}
                              disabled={isDisabled}
                              title={isDisabled ?
                                'Sin stock disponible para este color' :
                                (encargoLabel ? `Seleccionar talla (${encargoLabel})` : 'Seleccionar talla')
                              }
                            >
                              <span className="product-page__size-number">{talla}</span>
                              <span className="product-page__size-availability">
                                {canEncargo ?
                                  'Disponible para encargo' :
                                  (selectedColor ?
                                    `${stockDisponible} disponibles` :
                                    'Disponibles'
                                  )
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
                                className={`product-page__quantity-btn ${!canIncrease ? 'product-page__quantity-btn--disabled' : ''}`}
                                onClick={() => handleQuantityChangeForSize(talla, (quantitiesBySize[talla] || 0) + 1)}
                                disabled={!canIncrease}
                                title={!canIncrease ?
                                  (canEncargo ? '' : `Máximo ${maxStock} unidades disponibles`) :
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
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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

                {(() => {
                  const inventoryStatus = getInventoryStatus();
                  const isComingSoon = inventoryStatus.status === 'coming-soon';
                  const canEncargo = canEncargoSinStock(user, inventoryStatus.status);
                  const showNotifyAlert = isComingSoon && (!user || !canEncargo);

                  // Si es "próximamente" y no puede encargar, no mostrar botón de agregar al carrito
                  // (la alerta ya se muestra arriba)
                  if (showNotifyAlert) {
                    return null;
                  }

                  return (
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
                  );
                })()}

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

      {/* Recently Viewed Section */}
      <RecentlyViewedSection currentProductId={productId} />

      {/* Suggested Products Section */}
      {relatedProducts.length > 0 && (
        <FeaturedProducts
          title="También te podría gustar"
          products={relatedProducts}
          viewAllLink="/catalogo"
          viewAllText="Ver Más"
          showViewAllButton={true}
          className="product-page__related-products"
          alwaysShowTitle={true}
          useApi={false}
        />
      )}

      {/* Product Reviews Section - Mobile View */}
      <div className="container show-mobile">
        <ProductReviews productId={productId} reviews={product?.reviews} ratingData={ratingData} />
      </div>
    </>
  );
};

export default ProductPage;
