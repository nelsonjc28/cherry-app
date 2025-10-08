import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { mockCatalogs } from '../api/mockCatalogs';
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
  const queryParams = new URLSearchParams(location.search);
  const catalogId = queryParams.get('id');


  // Estados para API
  const [catalogs, setCatalogs] = useState([]);
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [imageGroups, setImageGroups] = useState([]);
  const [selectedImageGroup, setSelectedImageGroup] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [imageGroupsLoading, setImageGroupsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Estado para controlar la vista actual
  const [currentView, setCurrentView] = useState('groups'); // 'groups' | 'images'
  
  // Estado para evitar loops infinitos en el observer
  const [isNavigating, setIsNavigating] = useState(false);

  // Cargar catálogo e imágenes al montar
  useEffect(() => {
    if (catalogId) {
      fetchCatalogAndImages();
      // También cargar la lista de catálogos para navegación
      fetchCatalogs();
    } else {
      fetchCatalogs();
    }
  }, [catalogId]);

  const fetchCatalogAndImages = async () => {
    try {
      setLoading(true);
      
      // Primero obtener el catálogo específico
      const catalogResponse = await publicCatalogService.getById(catalogId);
      if (catalogResponse.data.success) {
        setSelectedCatalog(catalogResponse.data.data);
        
        // Luego cargar los grupos de imágenes del catálogo
        await fetchImageGroups(catalogId);
      } else {
        setError('Error al cargar el catálogo');
      }
    } catch (error) {
      console.error('Error fetching catalog and images:', error);
      setError('Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  const fetchImageGroups = async (catalogId) => {
    try {
      setImageGroupsLoading(true);
      const response = await publicCatalogService.getCatalogImageGroups(catalogId);
      
      if (response.data.success) {
        const groups = response.data.data.image_groups || [];
        setImageGroups(groups);
        // Ya no seleccionamos automáticamente el primer grupo
        // El usuario debe hacer click en un grupo para verlo
        setCurrentView('groups');
      } else {
        setError('Error al cargar los grupos de imágenes');
      }
    } catch (error) {
      console.error('Error fetching image groups:', error);
      setError('Error al cargar los grupos de imágenes');
    } finally {
      setImageGroupsLoading(false);
    }
  };

  const fetchImageGroupImages = async (catalogId, groupId, page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await publicCatalogService.getImageGroupImages(catalogId, groupId, page);
      
      if (response.data.success) {
        const newImages = response.data.data.images || [];
        
        if (page === 1) {
          setImages(newImages);
        } else {
          setImages(prev => [...prev, ...newImages]);
        }
        
        setHasMore(response.data.data.pagination.current_page < response.data.data.pagination.last_page);
        setCurrentPage(page);
        
        // Resetear índice de imagen seleccionada
        if (page === 1) {
          setPageIndex(0);
        }
      } else {
        setError('Error al cargar las imágenes del grupo');
      }
    } catch (error) {
      console.error('Error fetching group images:', error);
      setError('Error al cargar las imágenes del grupo');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      setCatalogsLoading(true);
      const response = await publicCatalogService.getCatalogsWithImages();
      
      if (response.data.success) {
        setCatalogs(response.data.data);
      } else {
        setError('Error al cargar los catálogos');
      }
    } catch (error) {
      console.error('Error fetching catalogs:', error);
      setError('Error al cargar los catálogos');
    } finally {
      setCatalogsLoading(false);
    }
  };

  const fetchImages = async (catalogId, page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await publicCatalogService.getCatalogImages(catalogId, page);
      
      if (response.data.success) {
        const newImages = response.data.data.images || [];
        
        if (page === 1) {
          setImages(newImages);
        } else {
          setImages(prev => [...prev, ...newImages]);
        }
        
        setHasMore(response.data.data.pagination.current_page < response.data.data.pagination.last_page);
        setCurrentPage(page);
        
        // Resetear índice de imagen seleccionada
        if (page === 1) {
          setPageIndex(0);
        }
      } else {
        setError('Error al cargar las imágenes');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      setError('Error al cargar las imágenes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (selectedCatalog && selectedImageGroup && hasMore && !loadingMore) {
      fetchImageGroupImages(selectedCatalog.id, selectedImageGroup.id, currentPage + 1);
    }
  };

  // Función para cambiar de catálogo
  const handleCatalogChange = async (catalog) => {
    if (catalog.id === selectedCatalog?.id) return;
    
    try {
      setSelectedCatalog(catalog);
      setSelectedImageGroup(null);
      setImageGroups([]);
      setImages([]);
      setPageIndex(0);
      setCurrentPage(1);
      setHasMore(false);
      
      // Actualizar URL sin recargar la página
      const newUrl = `${window.location.pathname}?id=${catalog.id}`;
      window.history.pushState({ catalogId: catalog.id }, '', newUrl);
      
      // Cargar los grupos de imágenes del nuevo catálogo
      await fetchImageGroups(catalog.id);
    } catch (error) {
      console.error('Error changing catalog:', error);
      setError('Error al cambiar de catálogo');
    }
  };

  // Función para cambiar de grupo de imágenes
  const handleImageGroupChange = async (imageGroup) => {
    try {
      setSelectedImageGroup(imageGroup);
      setImages([]);
      setPageIndex(0);
      setCurrentPage(1);
      setHasMore(false);
      setCurrentView('images');
      
      // Cargar las imágenes del nuevo grupo
      await fetchImageGroupImages(selectedCatalog.id, imageGroup.id, 1);
    } catch (error) {
      console.error('Error changing image group:', error);
      setError('Error al cambiar de grupo de imágenes');
    }
  };

  // Función para volver a la vista de grupos
  const handleBackToGroups = () => {
    setSelectedImageGroup(null);
    setImages([]);
    setCurrentView('groups');
    setPageIndex(0);
  };
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
  // Referencia para el timer de debounce del observer
  const observerTimerRef = useRef(null);

  // Navega a la página anterior
  const handlePrev = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (pageIndex > 0) {
      // Cancelar cualquier timer pendiente del observer
      if (observerTimerRef.current) {
        clearTimeout(observerTimerRef.current);
        observerTimerRef.current = null;
      }
      
      const newIndex = pageIndex - 1;
      setIsNavigating(true);
      setPageIndex(newIndex);

      // Timeout para compatibilidad con Chrome
      setTimeout(() => {
        scrollToImage(newIndex, false);
        setTimeout(() => setIsNavigating(false), 1000);
      }, 50);
    }
  };

  // Navega a la página siguiente
  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (pageIndex < images.length - 1) {
      // Cancelar cualquier timer pendiente del observer
      if (observerTimerRef.current) {
        clearTimeout(observerTimerRef.current);
        observerTimerRef.current = null;
      }
      
      const newIndex = pageIndex + 1;
      setIsNavigating(true);
      setPageIndex(newIndex);

      // Timeout para compatibilidad con Chrome
      setTimeout(() => {
        scrollToImage(newIndex, false);
        setTimeout(() => setIsNavigating(false), 1000);
      }, 50);
    }
  };

  // Hace scroll a la imagen indicada (opcionalmente actualiza el pageIndex)
  const scrollToImage = (index, shouldSetPageIndex = true) => {
    if (imageRefs.current[index]) {
      if (shouldSetPageIndex) setPageIndex(index);

      // Para todos los navegadores
      const element = imageRefs.current[index];

      // Intentar scrollIntoView con fallback
      try {
        setTimeout(() => {
          if (element && element.scrollIntoView) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          } else {
            // Fallback manual
            const elementTop = element.offsetTop;
            window.scrollTo({
              top: elementTop - 100, // Offset para el header sticky
              behavior: 'smooth'
            });
          }
        }, 100); // Timeout para Chrome
      } catch {
        // Fallback sin smooth scroll
        const elementTop = element.offsetTop;
        window.scrollTo(0, elementTop - 100);
      }
    }
  };

  // Cuando el usuario selecciona una miniatura
  const handleThumbnailSelect = (index) => {
    // Cancelar cualquier timer pendiente del observer
    if (observerTimerRef.current) {
      clearTimeout(observerTimerRef.current);
      observerTimerRef.current = null;
    }
    
    setIsNavigating(true);
    setPageIndex(index);
    scrollToImage(index, false);
    // Aumentar el tiempo para asegurar que el scroll se complete
    setTimeout(() => setIsNavigating(false), 1000);
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
        // Solo actualizar si no estamos navegando manualmente
        if (isNavigating) return;
        
        // Encontrar la entrada más visible
        let mostVisibleEntry = null;
        let maxIntersectionRatio = 0;
        
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxIntersectionRatio) {
            maxIntersectionRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });
        
        // Solo actualizar si hay una imagen claramente más visible
        if (mostVisibleEntry && maxIntersectionRatio > 0.6) {
          const index = imageRefs.current.findIndex(ref => ref === mostVisibleEntry.target);
          if (index !== -1 && index !== pageIndex) {
            // Debounce para evitar cambios muy rápidos
            if (observerTimerRef.current) {
              clearTimeout(observerTimerRef.current);
            }
            observerTimerRef.current = setTimeout(() => {
              if (!isNavigating) { // Verificar nuevamente
                setPageIndex(index);
              }
            }, 200);
          }
        }
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], // Múltiples thresholds
        rootMargin: '-5% 0px -5% 0px' // Margen reducido
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
  }, [images, isDesktop]); // Removido pageIndex e isNavigating de las dependencias

  // Efecto: reiniciar observer cuando termina la navegación manual
  useEffect(() => {
    if (!isNavigating && observerRef.current && images.length > 0) {
      // Pequeño delay para permitir que el scroll se complete
      const timeout = setTimeout(() => {
        // Re-observar todas las imágenes después de la navegación manual
        images.forEach((_, index) => {
          const ref = imageRefs.current[index];
          if (ref && observerRef.current) {
            observerRef.current.unobserve(ref);
            observerRef.current.observe(ref);
          }
        });
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [isNavigating, images]);

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
    title: `${selectedCatalog?.name || 'Catálogo'} página ${idx + 1}`
  }));

  // Estados de carga y error
  if (loading) {
    return (
      <div className="catalog-pdf-page">
        <div className="container">
          <div className="catalog-pdf__loading">
            <div className="spinner"></div>
            <p>Cargando catálogo...</p>
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
            <h2>Error</h2>
            <p>{error}</p>
            <CustomButton onClick={() => window.location.reload()}>
              Reintentar
            </CustomButton>
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
            <CustomButton onClick={() => window.location.href = '/catalogos'}>
              Ver todos los catálogos
            </CustomButton>
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
          {isDesktop && currentView === 'images' && (
            <aside className="catalog-pdf__thumbnails">
              {/* Miniaturas del grupo actual */}
              {selectedImageGroup && (
                <>
                  <div className="catalog-pdf__thumbnails-header">
                    <span className="catalog-pdf__thumbnails-title">Imágenes - {selectedImageGroup.name}</span>
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
                  
                  {/* Botón cargar más */}
                  {hasMore && (
                    <div className="catalog-pdf__load-more">
                      <CustomButton
                        variant="outline"
                        size="medium"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? 'Cargando...' : 'Cargar más imágenes'}
                      </CustomButton>
                    </div>
                  )}
                </>
              )}
            </aside>
          )}
          {/* Main content */}
          <main className="catalog-pdf__main-image">
            {currentView === 'groups' ? (
              /* Vista de grupos como cards */
              <div className="catalog-pdf__groups-main">
                <div className="catalog-pdf__groups-header">
                  <h2>Grupos de Imágenes - {selectedCatalog?.name}</h2>
                  <p>Selecciona un grupo para ver sus imágenes</p>
                </div>
                
                {imageGroupsLoading ? (
                  <div className="catalog-pdf__loading">
                    <div className="spinner"></div>
                    <p>Cargando grupos...</p>
                  </div>
                ) : imageGroups.length === 0 ? (
                  <div className="catalog-pdf__empty">
                    <p>No hay grupos de imágenes en este catálogo</p>
                  </div>
                ) : (
                  <div className="catalog-pdf__groups-grid">
                    {imageGroups.map((group) => (
                      <div
                        key={group.id}
                        className="catalog-pdf__group-card"
                        onClick={() => handleImageGroupChange(group)}
                        title={`Ver imágenes del grupo "${group.name}"`}
                      >
                        {/* Imagen de portada del grupo */}
                        <div className="catalog-pdf__group-image">
                          {group.cover_image && group.cover_image.thumbnail_url ? (
                            <img 
                              src={group.cover_image.thumbnail_url}
                              alt={group.name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="catalog-pdf__group-no-image"
                            style={{ display: (group.cover_image && group.cover_image.thumbnail_url) ? 'none' : 'flex' }}
                          >
                            {group.images_count > 0 ? '📁' : '📂'}
                          </div>
                        </div>

                        {/* Información del grupo */}
                        <div className="catalog-pdf__group-info">
                          <h3 className="catalog-pdf__group-name">{group.name}</h3>
                          <p className="catalog-pdf__group-description">{group.description || 'Sin descripción'}</p>
                          <div className="catalog-pdf__group-stats">
                            <span className="catalog-pdf__group-count">
                              🖼️ {group.images_count} imágenes
                            </span>
                            <span className="catalog-pdf__group-order">
                              📋 Orden: {group.display_order}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Vista de imágenes del grupo seleccionado */
              <>
                {/* Botón para volver a grupos */}
                <div className="catalog-pdf__back-to-groups">
                  <button 
                    className="catalog-pdf__back-btn"
                    onClick={handleBackToGroups}
                    title="Volver a grupos"
                  >
                    ← Volver a grupos
                  </button>
                  <h2>{selectedImageGroup?.name}</h2>
                </div>

                <button className="catalog-pdf__download-btn catalog-pdf__main-download-btn" type="button" aria-label="Descargar PDF">
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
                  {images.length > 0 ? (
                    images.map((image, index) => (
                      <div
                        key={index}
                        ref={el => imageRefs.current[index] = el}
                        className="catalog-pdf__image-wrapper"
                      >
                         <img
                           src={image.image_url || image.thumbnail_url || `${window.location.origin}/${image.image_path}`}
                           alt={image.image_alt || image.image_name || selectedCatalog?.name + ' página ' + (index + 1)}
                           className={`catalog-pdf__image ${getImageOrientation(index)}`}
                           onLoad={(e) => handleImageLoad(e, index)}
                         />
                      </div>
                    ))
                  ) : (
                    <div className="catalog-pdf__empty">
                      <p>No hay imágenes en este grupo</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CatalogPdfPage; 