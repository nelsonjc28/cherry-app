import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './ProductPage.css';

// Components
import CherryButton from '../components/CherryButton/CherryButton';
import FavoriteButton from '../components/FavoriteButton/FavoriteButton';
import FeaturedProducts from '../components/sections/FeaturedProducts/FeaturedProducts';

// API and Store
import { productsApi } from '../api';
import { useCartStore } from '../store';

// Temporary mock data for testing
import { getMockProductById, getMockRelatedProducts } from '../api/mockData';

// Utils
import { formatPrice } from '../utils/formatters';
import useHorizontalDragScroll from '../hooks/useHorizontalDragScroll';
import { getIconPath } from '../utils/assetPaths';

const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  // State management
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cart store
  const { addToCart, isLoading: isAddingToCart } = useCartStore();

  // Load product data
  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load product details using mock data (temporary)
      const productResponse = await getMockProductById(productId);
      const productData = productResponse.data;

      setProduct(productData);

      // Set default selections
      if (productData.colors && productData.colors.length > 0) {
        setSelectedColor(productData.colors[0].name);
      }
      if (productData.sizes && productData.sizes.length > 0) {
        setSelectedSize(productData.sizes[0]);
      }

      // Load related products using mock data (temporary)
      if (productData.categoryId) {
        const relatedResponse = await getMockRelatedProducts(
          productData.categoryId,
          productData.id,
          4
        );
        setRelatedProducts(relatedResponse.data.products || []);
      }

    } catch (err) {
      console.error('Error loading product:', err);
      setError('Error cargando el producto');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!selectedColor || !selectedSize) {
      alert('Por favor selecciona color y talla');
      return;
    }

    try {
      const productToAdd = {
        ...product,
        selectedColor,
        selectedSize,
        selectedQuantity: quantity
      };

      await addToCart(productToAdd, quantity);

      // Show success message or redirect
      alert('Producto agregado al carrito');
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Error al agregar al carrito');
    }
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 99)) {
      setQuantity(newQuantity);
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

  return (
    <>
      <Helmet>
        <title>{product.title} - Cherry</title>
        <meta name="description" content={product.description} />
      </Helmet>

      <div className="product-page">
        <div className="product-page__container container">
          {/* Breadcrumb and title MOBILE */}
          <div className="product-page__breadcrumb show-mobile">
            <span className="product-page__breadcrumb-item">Nuevo</span>
            <span className="product-page__breadcrumb-separator">|</span>
            <span className="product-page__breadcrumb-item">+50 vendido</span>
          </div>

          <h1 className="product-page__info-title show-mobile">{product.title}</h1>

          {/* Product Gallery */}
          <div className="product-page__gallery">
            <div className="product-page__gallery-main">
              <img
                src={product.images?.[selectedImage] || product.image}
                alt={product.title}
                className="product-page__gallery-main-image"
              />
              <FavoriteButton
                productId={product.id}
                className="product-page__gallery-favorite"
                size="large"
              />
            </div>

            {product.images && product.images.length > 1 && (
              <div className="product-page__gallery-thumbnails-container">
                <div
                  className={`product-page__gallery-thumbnails${isDragging ? ' dragging' : ''}`}
                  ref={thumbnailsRef}
                  {...eventHandlers}
                >
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      className={`product-page__gallery-thumbnail ${selectedImage === index ? ' product-page__gallery-thumbnail--active' : ''}`}
                      onClick={() => setSelectedImage(index)}
                      type="button"
                    >
                      <img src={image} alt={`${product.title} - Vista ${index + 1}`} />
                      {selectedImage === index && (
                        <div className="product-page__gallery-thumbnail-indicator"></div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Navigation indicators */}
                <div className="product-page__gallery-indicators">
                  {product.images.map((_, index) => (
                    <button
                      key={`indicator-${index}`}
                      className={`product-page__gallery-indicator ${selectedImage === index ? 'product-page__gallery-indicator--active' : ''
                        }`}
                      onClick={() => setSelectedImage(index)}
                      aria-label={`Ver imagen ${index + 1}`}
                    ></button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-page__info">
            {/* Breadcrumb and title DESKTOP */}
            <div className="product-page__breadcrumb show-desktop">
              <span className="product-page__breadcrumb-item">Nuevo</span>
              <span className="product-page__breadcrumb-separator">|</span>
              <span className="product-page__breadcrumb-item">+50 vendido</span>
            </div>

            <h1 className="product-page__info-title show-desktop">{product.title}</h1>

            <div className="product-page__info-rating">
              <div className="product-page__container-info-rating">
                <div className="product-page__rating-stars">
                  {renderStars(product.rating || 5)}
                </div>
                <span className="product-page__rating-text">{(product.rating || 5).toFixed(1)} Rating</span>
              </div>
              <div className="product-page__info-stock">
                <img src={getIconPath('Check Circle.svg')} />
                <span className="product-page__stock-status product-page__stock-status--in-stock">In Stock</span>
              </div>
            </div>

            <div className="product-page__info-price">
              {formatPrice(product.price)}
            </div>

            <div className="product-page__container-info-details">
              <div className="product-page__info-sku">
                {product.sku || product.id}
              </div>
              <div className="product-page__info-details">
                <span>Descripción del producto</span>
                <button className="product-page__details-link">Ver Detalles ›</button>
              </div>
            </div>

            {/* Product Options */}
            <div className="product-page__options">
              <h3 className="product-page__options-title">Selecciona color y talla</h3>

              {/* Color Selection - Step 1 */}
              {product.colors && product.colors.length > 0 && (
                <div className="product-page__option">
                  <div className="product-page__option-header">
                    <span className="product-page__step-number">Paso 1</span>
                    <span className="product-page__step-description">Selecciona el color de tu preferencia</span>
                  </div>
                  <div className="product-page__option-label">Color</div>
                  <div className="product-page__color-options">
                    {product.colors.map((color) => (
                      <button
                        key={color.name}
                        className={`product-page__color-option ${selectedColor === color.name ? 'product-page__color-option--selected' : ''
                          }`}
                        style={{ backgroundColor: color.hex }}
                        onClick={() => setSelectedColor(color.name)}
                        title={color.name}
                      >
                        <span className="product-page__color-option-name">{color.displayName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection - Step 2 */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="product-page__option">
                  <div className="product-page__option-header product-page__step-number-border">
                    <span className="product-page__step-number">Paso 2</span>
                    <span className="product-page__step-description">Selecciona la talla y cantidad de piezas</span>
                  </div>
                  <div className="product-page__option-label">Talla</div>

                  <div className="product-page__size-options">
                    {product.sizes.map((size) => (
                      <div key={size} className={`product-page__size-item ${selectedSize === size ? 'product-page__size-item--selected' : ''
                        }`}>
                        <button
                          className={`product-page__size-button`}
                          onClick={() => setSelectedSize(size)}
                        >
                          <span className="product-page__size-number">{size}</span>
                          <span className="product-page__size-availability">Disponibles</span>
                        </button>

                        <div className="product-page__size-quantity">
                          <button
                            className={`product-page__quantity-btn ${selectedSize !== size || quantity <= 1 ? 'product-page__quantity-btn--disabled' : ''
                              }`}
                            onClick={() => handleQuantityChange(quantity - 1)}
                            disabled={selectedSize !== size || quantity <= 1}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                          <span className="product-page__quantity-display">
                            {selectedSize === size ? quantity : 0}
                          </span>
                          <button
                            className={`product-page__quantity-btn ${selectedSize !== size || quantity >= (product.stock || 99) ? 'product-page__quantity-btn--disabled' : ''
                              }`}
                            onClick={() => handleQuantityChange(quantity + 1)}
                            disabled={selectedSize !== size || quantity >= (product.stock || 99)}
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
                  <span className="product-page__step-description">Agregar al carrito</span>
                </div>

                <CherryButton
                  variant="red"
                  size="large"
                  fullWidth
                  onClick={handleAddToCart}
                  disabled={!selectedColor || !selectedSize || isAddingToCart}
                  icon={
                    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.349 2.00028H3.75L3.51562 0.854451C3.46354 0.567993 3.20312 0.333618 2.91667 0.333618H0.3125C0.130208 0.333618 0 0.489868 0 0.646118V1.27112C0 1.45341 0.130208 1.58362 0.3125 1.58362H2.39583L4.19271 10.8545C3.90625 11.167 3.75 11.5576 3.75 12.0003C3.75 12.9378 4.47917 13.667 5.41667 13.667C6.32812 13.667 7.08333 12.9378 7.08333 12.0003C7.08333 11.7138 6.97917 11.4274 6.84896 11.167H10.625C10.4948 11.4274 10.4167 11.7138 10.4167 12.0003C10.4167 12.9378 11.1458 13.667 12.0833 13.667C12.9948 13.667 13.75 12.9378 13.75 12.0003C13.75 11.5315 13.5417 11.1149 13.2292 10.8024L13.2552 10.6982C13.3333 10.3076 13.0469 9.91695 12.6302 9.91695H5.28646L5.05208 8.66695H13.1771C13.4896 8.66695 13.724 8.48466 13.8021 8.1982L14.974 2.78153C15.0521 2.39091 14.7656 2.00028 14.349 2.00028ZM5.41667 12.6253C5.05208 12.6253 4.79167 12.3649 4.79167 12.0003C4.79167 11.6617 5.05208 11.3753 5.41667 11.3753C5.75521 11.3753 6.04167 11.6617 6.04167 12.0003C6.04167 12.3649 5.75521 12.6253 5.41667 12.6253ZM12.0833 12.6253C11.7188 12.6253 11.4583 12.3649 11.4583 12.0003C11.4583 11.6617 11.7188 11.3753 12.0833 11.3753C12.4219 11.3753 12.7083 11.6617 12.7083 12.0003C12.7083 12.3649 12.4219 12.6253 12.0833 12.6253ZM12.6823 7.41695H4.79167L3.98438 3.25028H13.5938L12.6823 7.41695Z" fill="white" />
                    </svg>
                  }
                  iconPosition="left"
                >
                  {isAddingToCart ? 'Agregando...' : 'Agregar al carrito'}
                </CherryButton>
              </div>
            </div>

            {/* Product Description */}
            {product.description && (
              <div className="product-page__description">
                <p className="product-page__description-text">{product.description}</p>
              </div>
            )}
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
      </div>
    </>
  );
};

export default ProductPage; 