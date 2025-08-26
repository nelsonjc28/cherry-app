import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PdfThumbnailsList from '../components/PdfThumbnailsList/PdfThumbnailsList';
import useIsDesktop from '../hooks/useIsDesktop';
import './CatalogPdfPage.css';
import { getIconPath } from '../utils/assetPaths';
import CustomButton from '../components/CustomButton';
import { publicCatalogService } from '../services/api';

/**
 * CatalogPdfPage
 * 
 * Página para visualizar un catálogo tipo PDF con navegación por imágenes, miniaturas y paginación.
 * 
 * - Obtiene el catálogo por ID desde la URL.
 * - Permite navegar entre páginas (imágenes) y ver miniaturas.
 * - Usa IntersectionObserver para detectar la página visible y sincronizar el estado.
 * - Detecta orientación de imágenes para aplicar estilos adecuados.
 * 
 * NOTA: Toda la lógica está contenida aquí porque:
 *   - El proyecto es pequeño y no crecerá mucho.
 *   - Esta lógica no se reutiliza en otros lugares.
 *   - Se prioriza la simplicidad y el fácil mantenimiento.
 */
const CatalogPdfPage = () => {
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const catalogId = queryParams.get('id');
  
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtiene las imágenes del catálogo seleccionado
  const images = useMemo(() => selectedCatalog?.pdf_images?.map(img => `/${img.image_path}`) || [], [selectedCatalog]);
  // Estado para la página (índice de la imagen actual)
  const [pageIndex, setPageIndex] = useState(0);
  // Estado para guardar la orientación de cada imagen
  const [imageOrientations, setImageOrientations] = useState({});
  // Referencias a los elementos DOM de cada imagen (para scroll y observer)
  const imageRefs = useRef([]);
  // Referencia a la lista de miniaturas (para scroll automático)
  const thumbnailListRef = useRef(null);
  // Referencia al IntersectionObserver (para detectar imagen visible)
  const observerRef = useRef(null);

  // Cargar el catálogo al montar el componente
  useEffect(() => {
    if (catalogId) {
      fetchCatalog();
    } else {
      setError('ID de catálogo no proporcionado');
      setLoading(false);
    }
  }, [catalogId]);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await publicCatalogService.getById(catalogId);
      
      if (response.data.success) {
        const catalog = response.data.data;
        
        // Verificar que el catálogo tenga imágenes PDF
        if (!catalog.pdf_images || catalog.pdf_images.length === 0) {
          setError('Este catálogo no tiene imágenes PDF disponibles');
          setLoading(false);
          return;
        }
        
        setSelectedCatalog(catalog);
      } else {
        setError('Error al cargar el catálogo');
      }
    } catch (error) {
      setError('Error al cargar el catálogo. Verifica que el ID sea válido.');
    } finally {
      setLoading(false);
    }
  };

  // Navega a la página anterior
  const handlePrev = () => {
    if (pageIndex > 0) {
      const newIndex = pageIndex - 1;
      setPageIndex(newIndex);
      scrollToImage(newIndex, false);
    }
  };

  // Navega a la página siguiente
  const handleNext = () => {
    if (pageIndex < images.length - 1) {
      const newIndex = pageIndex + 1;
      setPageIndex(newIndex);
      scrollToImage(newIndex, false);
    }
  };

  // Hace scroll a la imagen indicada (opcionalmente actualiza el pageIndex)
  const scrollToImage = (index, shouldSetPageIndex = true) => {
    if (imageRefs.current[index]) {
      if (shouldSetPageIndex) setPageIndex(index);
      setTimeout(() => {
        imageRefs.current[index]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 0);
    }
  };

  // Cuando el usuario selecciona una miniatura
  const handleThumbnailSelect = (index) => {
    setPageIndex(index);
    scrollToImage(index, false);
  };

  // Efecto: mantiene la miniatura seleccionada visible en la lista
  useEffect(() => {
    if (isDesktop && thumbnailListRef.current) {
      const selectedThumbnail = thumbnailListRef.current.querySelector('.pdf-thumbnail.selected');
      if (selectedThumbnail) {
        selectedThumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [pageIndex, isDesktop]);

  // Efecto: observa las imágenes para detectar cuál está visible en el viewport
  useEffect(() => {
    if (!isDesktop || !images || !images.length) return;
    
    // Limpia el observer anterior si existe
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Crea un nuevo observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = imageRefs.current.findIndex(ref => ref === entry.target);
            if (index !== -1 && index !== pageIndex) {
              setPageIndex(index);
            }
          }
        });
      },
      {
        threshold: 0.7, // Imagen debe estar al menos 50% visible
      }
    );

    // Observa todas las imágenes
    const currentRefs = [];
    
    images.forEach((_, index) => {
      const ref = imageRefs.current[index];
      if (ref && observerRef.current) {
        observerRef.current.observe(ref);
        currentRefs.push(ref);
      }
    });
    
    // Update refs
    imageRefs.current = currentRefs;

    // Limpieza al desmontar
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [images, pageIndex, isDesktop]);

  // Cuando una imagen se carga, detecta su orientación y la guarda
  const handleImageLoad = (e, index) => {
    const { naturalWidth, naturalHeight } = e.target;
    const orientation = naturalWidth > naturalHeight ? 'horizontal' : 'vertical';
    setImageOrientations(prev => ({
      ...prev,
      [index]: orientation
    }));
  };

  // Devuelve la orientación de una imagen (por defecto vertical)
  const getImageOrientation = (index) => {
    return imageOrientations[index] || 'vertical';
  };

  // Prepara los datos para la lista de miniaturas
  const pageThumbnails = images.map((img, idx) => ({
    id: `${selectedCatalog?.id}-page-${idx}`,
    image: img,
    title: `${selectedCatalog?.name} página ${idx + 1}`
  }));

  // Mostrar estados de carga y error
  if (loading) {
    return (
      <div className="catalog-pdf-page">
        <div className="container">
          <div className="catalog-pdf__loading">
            <div className="spinner"></div>
            <p>Cargando catálogo PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalog-pdf-page">
        <div className="container">
          <div className="catalog-pdf__error">
            <h2>Error al cargar el catálogo</h2>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="catalog-pdf__back-btn"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCatalog) {
    return (
      <div className="catalog-pdf-page">
        <div className="container">
          <div className="catalog-pdf__error">
            <h2>Catálogo no encontrado</h2>
            <p>El catálogo solicitado no existe o no está disponible.</p>
            <button 
              onClick={() => navigate('/')}
              className="catalog-pdf__back-btn"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`catalog-pdf-page ${isDesktop ? 'desktop' : 'mobile'}`}>
      <div className="container">
        {/* Header section */}
        <header className="catalog-pdf__header">
          <div className="catalog-pdf__title-section">
            <h1 className="catalog-pdf__title">{selectedCatalog?.name || 'Catálogo PDF'}</h1>
            <p className="catalog-pdf__subtitle">
              {selectedCatalog?.description || 'Catálogo de productos'}
            </p>
          </div>
          <div className="catalog-pdf__controls">
            <CustomButton
              variant="filled"
              size="medium"
              iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Comparar clientes" style={{ width: 16, height: 16 }} />}
              className="catalog-pdf__controls-btn"
            >
              <span className="catalog-pdf__whatsapp-text">Compartir a clientes</span>
            </CustomButton>
          </div>
        </header>

        <div className="catalog-pdf__content">
          {isDesktop && (
            <aside className="catalog-pdf__thumbnails">
              <div className="catalog-pdf__thumbnails-header">
                <span className="catalog-pdf__thumbnails-title">Catálogos disponibles</span>
                <div className="catalog-pdf__thumbnails-sort">
                  <label htmlFor="catalog-pdf__sort-select" className="catalog-pdf__sort-label">Ordenar por:</label>
                  <select
                    id="sort-select"
                    className="catalog-pdf__sort-select"
                  >
                    <option value="más recientes">más recientes</option>
                    <option value="precio-menor">Precio: menor a mayor</option>
                    <option value="precio-mayor">Precio: mayor a menor</option>
                    <option value="nombre-az">Nombre: A-Z</option>
                    <option value="nombre-za">Nombre: Z-A</option>
                  </select>
                </div>
              </div>
              <div className="catalog-pdf__thumbnails-list" ref={thumbnailListRef}>
                <PdfThumbnailsList
                  products={pageThumbnails}
                  selectedIndex={pageIndex}
                  onSelect={handleThumbnailSelect}
                />
              </div>
            </aside>
          )}
          {/* Image */}
          <main className="catalog-pdf__main-image" style={{position: 'relative'}}>
  <button className="catalog-pdf__download-btn catalog-pdf__main-download-btn" type="button" aria-label="Descargar PDF" style={{position: 'absolute', top: 0, right: 40, zIndex: 10}}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.0942 6.18543H11.6493V1.95651C11.6493 1.09751 10.9225 0.370667 10.0635 0.370667H6.4623C5.6033 0.370667 4.87646 1.09751 4.87646 1.95651V6.18543H2.46466C1.044 6.18543 0.31716 7.90342 1.34135 8.89457L7.15611 14.7093C7.7508 15.3371 8.77499 15.3371 9.40272 14.7093L15.2175 8.89457C16.2086 7.90342 15.4818 6.18543 14.0942 6.18543ZM8.27941 13.586L2.46466 7.77127H6.4623V1.95651H10.0635V7.77127H14.0942L8.27941 13.586Z" fill="#F9738A" />
    </svg>
  </button>
            <div className="catalog-pdf__pagination">
              <button 
                className="catalog-pdf__pagination-btn"
                onClick={handlePrev}
                disabled={pageIndex === 0}
                aria-label="Previous page"
              >
                {'<<'}
              </button>
              <span className="catalog-pdf__pagination-text">pág {pageIndex + 1} / {images.length}</span>
              <button 
                className="catalog-pdf__pagination-btn"
                onClick={handleNext}
                disabled={pageIndex === images.length - 1}
                aria-label="Next page"
              >
                {'>>'}
              </button>
            </div>
            
            {/* Scrollable images container */}
            <div className="catalog-pdf__image-slider-wrapper">
              {images.map((image, index) => (
                <div 
                  key={index}
                  ref={el => imageRefs.current[index] = el}
                  className="catalog-pdf__image-wrapper"
                >
                  <img
                    src={image}
                    alt={selectedCatalog?.title + ' página ' + (index + 1)}
                    className={`catalog-pdf__image ${getImageOrientation(index)}`}
                    onLoad={(e) => handleImageLoad(e, index)}
                  />
                </div>
              ))}
            </div>
          </main>

          {!isDesktop && (
            <section className="catalog-pdf__thumbnails mobile">
              <div className="catalog-pdf__thumbnails-header">
                <span className="catalog-pdf__thumbnails-title">Catálogos disponibles</span>
                <div className="catalog-pdf__thumbnails-sort">
                  <label htmlFor="catalog-pdf__sort-select" className="catalog-pdf__sort-label">Ordenar por:</label>
                  <select
                    id="sort-select"
                    className="catalog-pdf__sort-select"
                  >
                    <option value="más recientes">más recientes</option>
                    <option value="precio-menor">Precio: menor a mayor</option>
                    <option value="precio-mayor">Precio: mayor a menor</option>
                    <option value="nombre-az">Nombre: A-Z</option>
                    <option value="nombre-za">Nombre: Z-A</option>
                  </select>
                </div>
              </div>
              <div className="catalog-pdf__thumbnails-list" ref={thumbnailListRef}>
                <PdfThumbnailsList
                  products={pageThumbnails}
                  selectedIndex={pageIndex}
                  onSelect={handleThumbnailSelect}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogPdfPage; 