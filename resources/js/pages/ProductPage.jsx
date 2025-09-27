import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './ProductPage.css';
import './ProductPageOfferIndicators.css';

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
  
  // Rating states
  const [ratingData, setRatingData] = useState({
    average: 0,
    count: 0,
    distribution: [0, 0, 0, 0, 0]
  });
  const [userRating, setUserRating] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingComment, setRatingComment] = useState('');
  
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
        let productWithOffer = productData;
        
        console.log('📊 ProductPage: Datos del producto recibidos:', {
          id: productData.id_articulo,
          desc_promo: productData.desc_promo,
          precio1: productData.precio1,
          price: productData.price,
          discount: productData.discount,
          originalPrice: productData.originalPrice
        });
        
        if (hasActiveSession) {
          // Si hay sesión activa, aplicar ofertas personalizadas
          console.log('🔐 ProductPage: Sesión activa - aplicando ofertas personalizadas');
          const productsWithOffers = await applyUserOffersToProducts([productData]);
          productWithOffer = productsWithOffers[0] || productData;
          
          console.log('✅ ProductPage: Producto después de aplicar ofertas:', {
            id: productWithOffer.id_articulo,
            price: productWithOffer.price,
            originalPrice: productWithOffer.originalPrice,
            discount: productWithOffer.discount,
            hasUserOffer: productWithOffer.hasUserOffer,
            userOffer: productWithOffer.userOffer
          });
        } else {
          // Si no hay sesión, usar solo las ofertas externas (ya incluidas en getProductById)
          console.log('🔓 ProductPage: Sin sesión - usando solo ofertas externas');
          productWithOffer = productData;
          
          console.log('✅ ProductPage: Producto sin ofertas personalizadas:', {
            id: productWithOffer.id_articulo,
            price: productWithOffer.price,
            originalPrice: productWithOffer.originalPrice,
            discount: productWithOffer.discount
          });
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
        if (user) {
          fetchUserRating();
        }
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

  // Fetch user's rating for the product
  const fetchUserRating = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch(`/api/ratings/user?product_id=${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.rating) {
          setUserRating(data.rating.rating);
        }
      }
    } catch (error) {
      // Error fetching user rating
    }
  };

  // Handle rating submission
  const handleRatingSubmit = async (rating) => {
    if (!user) {
      if (window.showToast) {
        window.showToast('Debes iniciar sesión para calificar productos', 'error');
      }
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: productId,
          rating: rating,
          comment: ratingComment
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUserRating(rating);
        setRatingData(data.average_rating);
        setRatingComment('');
        setShowRatingModal(false);
        if (window.showToast) {
          window.showToast('Gracias por calificar el producto', 'success');
        }
      } else {
        throw new Error('Error al enviar calificación');
      }
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al enviar calificación', 'error');
      }
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

        addToCart(productToAdd, cantidad);
        
        // Para ofertas Buy X Get Y, agregar productos gratis
        if (hasUserOffer && userOffer.discount_category === 'buy_x_get_y') {
          const buyQuantity = userOffer.buy_quantity || 1;
          const getQuantity = userOffer.get_quantity || 1;
          
          // Calcular cuántos productos gratis corresponden
          const freeItems = Math.floor(cantidad / buyQuantity) * getQuantity;
          
          if (freeItems > 0) {
            const freeProductToAdd = {
              ...productToAdd,
              price: 0, // Producto gratis
              precio: 0,
              originalPrice: finalPrice,
              quantity: freeItems,
              isFreeItem: true, // Marcar como producto gratis
              freeItemReason: `🎁 Gratis por oferta: Compra ${buyQuantity} lleva ${getQuantity}`
            };
            
            addToCart(freeProductToAdd, freeItems);
          }
        }
      }

      if (window.showToast) {
        const totalUnidades = getTotalUnits();
        let message = `${totalUnidades} unidad${totalUnidades > 1 ? 'es' : ''} agregada${totalUnidades > 1 ? 's' : ''} al carrito`;
        
        if (hasOffer) {
          if (hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y') {
            const totalFreeItems = tallasConCantidades.reduce((total, { cantidad }) => {
              const buyQuantity = userOffer.buy_quantity || 1;
              const getQuantity = userOffer.get_quantity || 1;
              return total + Math.floor(cantidad / buyQuantity) * getQuantity;
            }, 0);
            message += ` 🎁 Oferta: Compra ${userOffer.buy_quantity} lleva ${userOffer.get_quantity}`;
            if (totalFreeItems > 0) {
              message += ` - ¡${totalFreeItems} producto${totalFreeItems > 1 ? 's' : ''} gratis agregado${totalFreeItems > 1 ? 's' : ''}!`;
            }
          } else if (hasUserOffer && userOffer && userOffer.discount_category === 'order_discount') {
            message += ` 💰 Descuento del ${Math.round(userOffer.discount_percentage)}% se aplicará al total del pedido`;
          } else if (hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping') {
            message += ` 🚚 ¡Envío gratis incluido!`;
          } else if (discountPercentage > 0) {
          message += ` 🏷️ Con ${discountPercentage}% de descuento - Ahorras ${formatPrice(precio1 - finalPrice)}`;
          }
        }
        
        window.showToast(message, 'success');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al agregar al carrito', 'error');
      }
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
    if (!selectedColor || getStockBySizeAndColor(talla, selectedColor) > 0) {
      setSelectedSize(talla);
      
      // Si la talla no tiene cantidad o tiene 0, inicializar con 1
      const cantidadActual = quantitiesBySize[talla] || 0;
      if (cantidadActual <= 0) {
        const stockDisponible = getStockForSize(talla);
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
      <div className="product-page">
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
    console.log('🔍 calculateDiscountPercentage - Datos disponibles:', {
      hasUserOffer,
      userOffer,
      productDiscount: product?.discount,
      descPromo: product?.desc_promo,
      originalPrice: product?.originalPrice,
      price: product?.price,
      precio1: product?.precio1
    });
    
    // PRIORIDAD 1: Descuento personalizado del usuario (ya procesado)
    if (hasUserOffer && userOffer && userOffer.discount_percentage > 0) {
      console.log('✅ Usando descuento personalizado:', userOffer.discount_percentage);
      return Math.round(userOffer.discount_percentage);
    }
    
    // PRIORIDAD 2: Descuento general desde la API (desc_promo) - usar directamente desc_promo
    if (product?.desc_promo && product.desc_promo > 0) {
      console.log('✅ Usando desc_promo de la API:', product.desc_promo);
      return Math.round(product.desc_promo);
    }
    
    // PRIORIDAD 3: Descuento ya procesado en product.discount
    if (product?.discount && product.discount > 0) {
      console.log('✅ Usando product.discount:', product.discount);
      return Math.round(product.discount);
    }
    
    // PRIORIDAD 4: Fallback usando originalPrice vs price
    if (product?.originalPrice && product?.price && product.originalPrice > product.price) {
      const calculatedDiscount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
      console.log('✅ Usando descuento calculado:', calculatedDiscount);
      return calculatedDiscount;
    }
    
    console.log('❌ No se encontró descuento');
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
      console.log('✅ Usando precio ya procesado:', product.price);
      return product.price;
    }
    
    // Si hay descuento, calcularlo
    if (discountPercentage > 0 && basePrice > 0) {
      const discountedPrice = basePrice - (basePrice * (discountPercentage / 100));
      console.log('✅ Calculando precio con descuento:', {
        basePrice,
        discountPercentage,
        discountedPrice
      });
      return discountedPrice;
    }
    
    console.log('✅ Usando precio base:', basePrice);
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
    
    // Si el detalle tiene stock específico, usarlo
    if (detalle.piezas !== undefined && detalle.piezas > 0) {
      return detalle.piezas;
    }
    
    // Si no, usar el stock general
    return product.inventario || product.stock || 0;
  };

  // Filtrar solo tallas con stock disponible para el color seleccionado
  const tallasDisponibles = tallas.filter(talla => {
    if (!selectedColor) return true; // Si no hay color seleccionado, mostrar todas
    const stock = getStockBySizeAndColor(talla, selectedColor);
    return stock > 0;
  });

  // Si no hay tallas disponibles para el color seleccionado, mostrar todas
  const tallasAMostrar = tallasDisponibles.length > 0 ? tallasDisponibles : tallas;

  // Obtener el stock máximo disponible para la talla y color seleccionados
  const stockMaximoDisponible = selectedColor && selectedSize ? 
    getStockBySizeAndColor(selectedSize, selectedColor) : 
    (product.inventario || product.stock || 99);

  // Función para obtener el stock máximo de una talla específica
  const getStockForSize = (talla) => {
    if (!selectedColor) return product.inventario || product.stock || 99;
    return getStockBySizeAndColor(talla, selectedColor);
  };

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
    .map((p, i) => ({ label: `Precio${i+1}`, value: p }))
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
            <span className="product-page__breadcrumb-item">Nuevo</span>
            <span className="product-page__breadcrumb-separator">|</span>
            <span className="product-page__breadcrumb-item">+50 vendido</span>
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
              <span className="product-page__breadcrumb-item">Nuevo</span>
              <span className="product-page__breadcrumb-separator">|</span>
              <span className="product-page__breadcrumb-item">+50 vendido</span>
            </div>

            <h1 className="product-page__info-title show-desktop">{descripcion}</h1>

            <div className="product-page__info-rating">
              <div className="product-page__container-info-rating">
                <StarRating
                  rating={ratingData.average}
                  size="medium"
                  readonly={false}
                  showAverage={true}
                  averageRating={ratingData.average}
                  totalRatings={ratingData.count}
                  onRatingChange={handleRatingSubmit}
                />
              </div>
              <div className="product-page__info-stock">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 0.25C3.71875 0.25 0.25 3.75 0.25 8C0.25 12.2812 3.71875 15.75 8 15.75C12.25 15.75 15.75 12.2812 15.75 8C15.75 3.75 12.25 0.25 8 0.25ZM8 1.75C11.4375 1.75 14.25 4.5625 14.25 8C14.25 11.4688 11.4375 14.25 8 14.25C4.53125 14.25 1.75 11.4688 1.75 8C1.75 4.5625 4.53125 1.75 8 1.75ZM12.375 5.84375L11.6562 5.125C11.5312 4.96875 11.2812 4.96875 11.125 5.125L6.71875 9.5L4.84375 7.625C4.6875 7.46875 4.46875 7.46875 4.3125 7.625L3.59375 8.3125C3.46875 8.46875 3.46875 8.71875 3.59375 8.84375L6.4375 11.7188C6.59375 11.875 6.8125 11.875 6.96875 11.7188L12.375 6.375C12.5 6.21875 12.5 5.96875 12.375 5.84375Z" fill="#1DA534" />
                </svg>
                <span className="product-page__stock-status product-page__stock-status--in-stock">In Stock</span>
              </div>
            </div>

            <div className="product-page__info-price">
              {hasOffer && (
                <div className={`product-page__offer-badge ${hasUserOffer ? 'user-offer' : ''} ${
                  hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' ? 'buy-x-get-y' : 
                  hasUserOffer && userOffer && userOffer.discount_category === 'order_discount' ? 'order-discount' : 
                  hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping' ? 'free-shipping' : ''
                }`}>
                  {hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' ? 
                    `🎁 Compra ${userOffer.buy_quantity} lleva ${userOffer.get_quantity}` :
                    hasUserOffer && userOffer && userOffer.discount_category === 'order_discount' ? 
                      `💰 Descuento en pedido ${Math.round(userOffer.discount_percentage)}%` :
                    hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping' ? 
                      `🚚 Envío gratis` :
                    hasUserOffer && userOffer && userOffer.discount_percentage > 0 ? 
                      `Oferta ${Math.round(userOffer.discount_percentage)}%` :
                      `🏷️ Oferta ${discountPercentage}%`
                  }
                </div>
              )}
              
              
              <div className="product-page__price-container">
                {hasOffer && discountPercentage > 0 && (
                  <>
                    <div className="product-page__original-price">{formatPrice(product?.originalPrice || precio1)}</div>
                    <div className="product-page__savings">
                      💰 Ahorras {formatPrice((product?.originalPrice || precio1) - finalPrice)}
                    </div>
                  </>
                )}
                <div className="product-page__final-price">{formatPrice(finalPrice)}</div>
              </div>
              {hasOffer && discountPercentage > 0 && (
                <div className="product-page__offer-details">
                  <div className="product-page__calculation">
                    📊 Precio original: {formatPrice(precio1)} - {discountPercentage}% = {formatPrice(finalPrice)}
                  </div>
                </div>
              )}
              {hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' && (
                <div className="product-page__offer-details">
                  <div className="product-page__buy-x-get-y-info">
                    🎁 <strong>Oferta Especial:</strong> Por cada {userOffer.buy_quantity} producto{userOffer.buy_quantity > 1 ? 's' : ''} que compres, recibirás {userOffer.get_quantity} gratis
                    <div className="product-page__offer-example">
                      💡 <em>Ejemplo:</em> Si compras {userOffer.buy_quantity * 2} productos, recibirás {userOffer.get_quantity * 2} gratis
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
                  {especificaciones.split(',').map((spec, index) => (
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
                          color: colorConverter.getColorHex(selectedColor), 
                          fontWeight: 'bold',
                          textShadow: colorConverter.isLightColor(colorConverter.getColorHex(selectedColor)) 
                            ? '1px 1px 2px rgba(0,0,0,0.3)' 
                            : '1px 1px 2px rgba(255,255,255,0.3)'
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
                          className={`product-page__color-option ${
                            selectedColor === color ? 'product-page__color-option--selected' : ''
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

                  {selectedColor && tallasDisponibles.length === 0 && (
                    <div className="product-page__no-stock-message">
                      <p>No hay tallas disponibles para el color seleccionado</p>
                    </div>
                  )}

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
