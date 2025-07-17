import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './ProductPage.css';

// Components
import CherryButton from '../components/CherryButton/CherryButton';
import FavoriteButton from '../components/FavoriteButton/FavoriteButton';
import FeaturedProducts from '../components/sections/FeaturedProducts/FeaturedProducts';
import { toast } from 'react-toastify';

// API and Store
import { getProductById, generateS3ImageUrl } from '../api/cherryApi';
import useCartStore from '../store/cartStore';

// Utils
import { formatPrice } from '../utils/formatters';
import useHorizontalDragScroll from '../hooks/useHorizontalDragScroll';

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

  // Load product data from external API
  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const productData = await getProductById(productId);
        setProduct(productData);
        // Set default color/size if available
        if (productData.detalles && productData.detalles.length > 0) {
          setSelectedColor(productData.detalles[0].nombreColor || '');
          setSelectedSize(productData.detalles[0].detalle || '');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!selectedColor || !selectedSize) {
      toast.error('Por favor selecciona color y talla');
      return;
    }

    try {
      // Mapear los datos del producto a los campos esperados por el store
      const productToAdd = {
        id_articulo: product.id_articulo,
        title: product.descripcion,
        price: product.precio1,
        precio: product.precio1,
        image: generateS3ImageUrl(product.id_articulo),
        selectedColor,
        selectedSize,
        quantity,
        colors: [selectedColor]
      };

      addToCart(productToAdd, quantity);
      toast.success('Producto agregado al carrito');
    } catch (err) {
      console.error('Error adding to cart:', err);
      toast.error('Error al agregar al carrito');
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
            <div className="product-page__gallery-main">
              <img
                src={generateS3ImageUrl(id_articulo)}
                alt={descripcion}
                className="product-page__gallery-main-image"
                style={{ maxWidth: 400, maxHeight: 400, objectFit: 'contain' }}
              />
              <FavoriteButton
                productId={id_articulo}
                className="product-page__gallery-favorite"
                size="large"
              />
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
                <div className="product-page__rating-stars">
                  {renderStars(5)} {/* Assuming a default rating for now */}
                </div>
                <span className="product-page__rating-text">5.0 Rating</span>
              </div>
              <div className="product-page__info-stock">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 0.25C3.71875 0.25 0.25 3.75 0.25 8C0.25 12.2812 3.71875 15.75 8 15.75C12.25 15.75 15.75 12.2812 15.75 8C15.75 3.75 12.25 0.25 8 0.25ZM8 1.75C11.4375 1.75 14.25 4.5625 14.25 8C14.25 11.4688 11.4375 14.25 8 14.25C4.53125 14.25 1.75 11.4688 1.75 8C1.75 4.5625 4.53125 1.75 8 1.75ZM12.375 5.84375L11.6562 5.125C11.5312 4.96875 11.2812 4.96875 11.125 5.125L6.71875 9.5L4.84375 7.625C4.6875 7.46875 4.46875 7.46875 4.3125 7.625L3.59375 8.3125C3.46875 8.46875 3.46875 8.71875 3.59375 8.84375L6.4375 11.7188C6.59375 11.875 6.8125 11.875 6.96875 11.7188L12.375 6.375C12.5 6.21875 12.5 5.96875 12.375 5.84375Z" fill="#1DA534" />
                </svg>
                <span className="product-page__stock-status product-page__stock-status--in-stock">In Stock</span>
              </div>
            </div>

            <div className="product-page__info-price">
              {formatPrice(precio1)}
            </div>

            <div className="product-page__container-info-details">
              <div className="product-page__info-sku">
                <strong>SKU:</strong> {sku || id_articulo}
              </div>
              <div className="product-page__info-details">
                <span>Descripción del producto</span>
                <button className="product-page__details-link">Ver Detalles ›</button>
              </div>
              <div className="product-page__info-meta">
                {marca && <div><strong>Marca:</strong> {marca}</div>}
                {linea?.descripcion && <div><strong>Línea:</strong> {linea.descripcion}</div>}
                {sector?.descripcion && <div><strong>Sector:</strong> {sector.descripcion}</div>}
                {genero?.descripcion && <div><strong>Género:</strong> {genero.descripcion}</div>}
                {piezas && <div><strong>Piezas:</strong> {piezas}</div>}
                {costo && <div><strong>Costo:</strong> ${costo.toFixed(2)}</div>}
                {inventario !== undefined && <div><strong>Inventario:</strong> {inventario}</div>}
                {fecha_alta && <div><strong>Fecha alta:</strong> {fecha_alta}</div>}
                {notas && <div><strong>Notas:</strong> {notas}</div>}
                {especificaciones && <div><strong>Especificaciones:</strong> {especificaciones}</div>}
                {activo !== undefined && <div><strong>Activo:</strong> {activo ? 'Sí' : 'No'}</div>}
                {tipoart && <div><strong>Tipo artículo:</strong> {tipoart}</div>}
                {url_video && <div><strong>Video:</strong> <a href={url_video} target="_blank" rel="noopener noreferrer">Ver video</a></div>}
                {descuento && <div><strong>Descuento:</strong> {descuento}%</div>}
                {catalogoId && <div><strong>ID Catálogo:</strong> {catalogoId}</div>}
                {generoId && <div><strong>ID Género:</strong> {generoId}</div>}
                {sectorId && <div><strong>ID Sector:</strong> {sectorId}</div>}
                {fechaAct && <div><strong>Fecha actualización:</strong> {fechaAct}</div>}
              </div>
              {/* Mostrar todos los precios disponibles */}
              {precios.length > 1 && (
                <div className="product-page__info-prices">
                  <strong>Precios adicionales:</strong>
                  <ul>
                    {precios.slice(1).map((p, idx) => (
                      <li key={idx}>{p.label}: ${p.value.toFixed(2)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Product Options */}
            <div className="product-page__options">
              <h3 className="product-page__options-title">Selecciona color y talla</h3>

              {/* Color Selection - Step 1 */}
              {colores.length > 0 && (
                <div className="product-page__option">
                  <div className="product-page__option-header">
                    <span className="product-page__step-number">Paso 1</span>
                    <span className="product-page__step-description">Selecciona el color de tu preferencia</span>
                  </div>
                  <div className="product-page__option-label">Color</div>
                  <div className="product-page__color-options">
                    {colores.map((color, index) => (
                      <button
                        key={index}
                        className={`product-page__color-option ${selectedColor === color ? 'product-page__color-option--selected' : ''}`}
                        style={{ backgroundColor: '#000' }} // Placeholder for color hex
                        onClick={() => setSelectedColor(color)}
                        title={color}
                      >
                        <span className="product-page__color-option-name">{color}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection - Step 2 */}
              {tallas.length > 0 && (
                <div className="product-page__option">
                  <div className="product-page__option-header product-page__step-number-border">
                    <span className="product-page__step-number">Paso 2</span>
                    <span className="product-page__step-description">Selecciona la talla y cantidad de piezas</span>
                  </div>
                  <div className="product-page__option-label">Talla</div>

                  <div className="product-page__size-options">
                    {tallas.map((talla, index) => (
                      <div key={talla} className={`product-page__size-item ${selectedSize === talla ? 'product-page__size-item--selected' : ''}`}> 
                        <button
                          className={`product-page__size-button`}
                          onClick={() => setSelectedSize(talla)}
                        >
                          <span className="product-page__size-number">{talla}</span>
                          <span className="product-page__size-availability">Disponibles</span>
                        </button>

                        <div className="product-page__size-quantity">
                          <button
                            className={`product-page__quantity-btn ${selectedSize !== talla || quantity <= 1 ? 'product-page__quantity-btn--disabled' : ''}`}
                            onClick={() => handleQuantityChange(quantity - 1)}
                            disabled={selectedSize !== talla || quantity <= 1}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                          <span className="product-page__quantity-display">
                            {selectedSize === talla ? quantity : 0}
                          </span>
                          <button
                            className={`product-page__quantity-btn ${selectedSize !== talla || quantity >= (product.stock || 99) ? 'product-page__quantity-btn--disabled' : ''}`}
                            onClick={() => handleQuantityChange(quantity + 1)}
                            disabled={selectedSize !== talla || quantity >= (product.stock || 99)}
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
                      <path d="M14.349 2.00028H3.75L3.51562 0.854451C3.46354 0.567993 3.20312 0.333618 2.91667 0.333618H0.3125C0.130208 0.333618 0 0.489868 0 0.646118V1.27112C0 1.45341 0.130208 1.58362 0.3125 1.58362H2.39583L4.19271 10.8545C3.90625 11.167 3.75 11.5576 3.75 12.0003C3.75 12.9378 4.47917 13.667 5.41667 13.667C6.32812 13.667 7.08333 12.9378 7.08333 12.0003C7.08333 11.7138 6.97917 11.4274 6.84896 11.167H10.625C10.4948 11.4274 10.4167 11.7138 10.4167 12.0003C10.4167 12.9378 11.1458 13.667 12.0833 13.667C12.9948 12.9378 13.75 12.9378 13.75 12.0003C13.75 11.5315 13.5417 11.1149 13.2292 10.8024L13.2552 10.6982C13.3333 10.3076 13.0469 9.91695 12.6302 9.91695H5.28646L5.05208 8.66695H13.1771C13.4896 8.66695 13.724 8.48466 13.8021 8.1982L14.974 2.78153C15.0521 2.39091 14.7656 2.00028 14.349 2.00028ZM5.41667 12.6253C5.05208 12.6253 4.79167 12.3649 4.79167 12.0003C4.79167 11.6617 5.05208 11.3753 5.41667 11.3753C5.75521 11.3753 6.04167 11.6617 6.04167 12.0003C6.04167 12.3649 5.75521 12.6253 5.41667 12.6253ZM12.0833 12.6253C11.7188 12.6253 11.4583 12.3649 11.4583 12.0003C11.4583 11.6617 11.7188 11.3753 12.0833 11.3753C12.4219 11.3753 12.7083 11.6617 12.7083 12.0003C12.7083 12.3649 12.4219 12.6253 12.0833 12.6253ZM12.6823 7.41695H4.79167L3.98438 3.25028H13.5938L12.6823 7.41695Z" fill="white" />
                    </svg>
                  }
                  iconPosition="left"
                >
                  {isAddingToCart ? 'Agregando...' : 'Agregar al carrito'}
                </CherryButton>
              </div>
            </div>

            {/* Product Description */}
            {descripcion && (
              <div className="product-page__description">
                <p className="product-page__description-text">{descripcion}</p>
              </div>
            )}
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
    </>
  );
};

export default ProductPage; 