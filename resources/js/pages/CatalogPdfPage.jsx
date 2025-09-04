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
 * Página para visualizar un catálogo con navegación por PDFs, miniaturas y paginación.
 * 
 * - Obtiene el catálogo por ID desde la URL.
 * - Permite navegar entre PDFs y ver miniaturas.
 * - Usa IntersectionObserver para detectar el PDF visible y sincronizar el estado.
 * - Muestra PDFs en iframes con controles de navegación.
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

  // Obtiene los PDFs del catálogo seleccionado
  const pdfs = useMemo(() => selectedCatalog?.pdfs || [], [selectedCatalog]);
  // Estado para la página actual del PDF (índice de la página)
  const [currentPage, setCurrentPage] = useState(1);
  // Estado para el PDF actual seleccionado
  const [currentPdfIndex, setCurrentPdfIndex] = useState(0);
  // Estado para el número total de páginas del PDF actual
  const [totalPages, setTotalPages] = useState(1);
  // Referencias a los elementos DOM de cada página (para scroll y observer)
  const pageRefs = useRef([]);
  // Referencia a la lista de miniaturas (para scroll automático)
  const thumbnailListRef = useRef(null);
  // Referencia al IntersectionObserver (para detectar página visible)
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
        
        // Verificar que el catálogo tenga PDFs
        if (!catalog.pdfs || catalog.pdfs.length === 0) {
          setError('Este catálogo no tiene PDFs disponibles');
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

  // Efecto para establecer el número total de páginas cuando se carga un PDF
  useEffect(() => {
    if (pdfs.length > 0 && pdfs[currentPdfIndex]) {
      // Usar el número real de páginas del PDF
      let pdfPageCount = pdfs[currentPdfIndex].page_count || 1;
      
      // Si el page_count es 1 o no está disponible, usar un número por defecto más alto
      if (pdfPageCount <= 1) {
        pdfPageCount = 20; // Número por defecto para PDFs largos
        console.log('Page count no disponible, usando valor por defecto:', pdfPageCount);
      }
      
      console.log('PDF encontrado:', pdfs[currentPdfIndex].pdf_name, 'Páginas:', pdfPageCount);
      
      setTotalPages(pdfPageCount);
      setCurrentPage(1);
      
      // Limpiar las referencias anteriores
      pageRefs.current = [];
      console.log('TotalPages establecido a:', pdfPageCount);
    }
  }, [pdfs, currentPdfIndex]);

  // Navega a la página anterior
  const handlePrev = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      scrollToPage(newPage, false);
    }
  };

  // Navega a la página siguiente
  const handleNext = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      scrollToPage(newPage, false);
    }
  };

  // Hace scroll a la página indicada (opcionalmente actualiza el currentPage)
  const scrollToPage = (page, shouldSetCurrentPage = true) => {
    const pageIndex = page - 1; // Convertir a índice base 0
    if (pageRefs.current[pageIndex]) {
      if (shouldSetCurrentPage) setCurrentPage(page);
      setTimeout(() => {
        pageRefs.current[pageIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 0);
    }
  };

  // Cuando el usuario selecciona una página desde las miniaturas
  const handlePageSelect = (page) => {
    setCurrentPage(page);
    
    // Hacer scroll suave a la página seleccionada
    const pageIndex = page - 1;
    
    if (pageRefs.current[pageIndex]) {
      setTimeout(() => {
        pageRefs.current[pageIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  };

  // Efecto: mantiene la página seleccionada visible en la lista
  useEffect(() => {
    if (isDesktop && thumbnailListRef.current) {
      const selectedPage = thumbnailListRef.current.querySelector('.pdf-page-thumbnail.selected');
      if (selectedPage) {
        selectedPage.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentPage, isDesktop]);

  // Efecto: observa las páginas para detectar cuál está visible en el viewport
  useEffect(() => {
    if (!isDesktop || !totalPages || totalPages < 1) return;
    
    // Limpia el observer anterior si existe
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Crea un nuevo observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = pageRefs.current.findIndex(ref => ref === entry.target);
            if (index !== -1) {
              const pageNumber = index + 1; // Convertir a número de página base 1
              if (pageNumber !== currentPage) {
                setCurrentPage(pageNumber);
              }
            }
          }
        });
      },
      {
        threshold: 0.7, // Página debe estar al menos 50% visible
      }
    );

    // Observa todas las páginas
    const currentRefs = [];
    
    for (let i = 0; i < totalPages; i++) {
      const ref = pageRefs.current[i];
      if (ref && observerRef.current) {
        observerRef.current.observe(ref);
        currentRefs.push(ref);
      }
    }
    
    // Update refs
    pageRefs.current = currentRefs;

    // Limpieza al desmontar
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [totalPages, currentPage, isDesktop]);

  // Efecto para hacer scroll automático cuando cambia la página
  useEffect(() => {
    if (currentPage > 0 && pageRefs.current.length > 0) {
      const pageIndex = currentPage - 1;
      const targetRef = pageRefs.current[pageIndex];
      
      if (targetRef) {
        setTimeout(() => {
          targetRef.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 100);
      }
    }
  }, [currentPage]);



  // Función para descargar un PDF
  const handleDownloadPdf = (pdf) => {
    const link = document.createElement('a');
    link.href = `/${pdf.pdf_path}`;
    link.download = 'catalogo.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepara los datos para la lista de miniaturas de páginas
  const pageThumbnails = Array.from({ length: totalPages }, (_, idx) => {
    const pageNumber = idx + 1;
    return {
      id: `${selectedCatalog?.id}-page-${pageNumber}`,
      pageNumber: pageNumber,
      title: `Página ${pageNumber}`,
      isSelected: pageNumber === currentPage
    };
  });

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
                <span className="catalog-pdf__thumbnails-title">Páginas del PDF</span>
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
                  pages={pageThumbnails}
                  selectedPage={currentPage}
                  onSelect={handlePageSelect}
                  pdfPath={pdfs[currentPdfIndex]?.pdf_path}
                />
              </div>
            </aside>
          )}
                  {/* PDF Viewer */}
        <main className="catalog-pdf__main-pdf" style={{position: 'relative'}}>
  <button 
    className="catalog-pdf__download-btn catalog-pdf__main-download-btn" 
    type="button" 
    aria-label="Descargar PDF" 
    style={{position: 'absolute', top: 0, right: 40, zIndex: 10}}
    onClick={() => handleDownloadPdf(pdfs[currentPdfIndex])}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.0942 6.18543H11.6493V1.95651C11.6493 1.09751 10.9225 0.370667 10.0635 0.370667H6.4623C5.6033 0.370667 4.87646 1.09751 4.87646 1.95651V6.18543H2.46466C1.044 6.18543 0.31716 7.90342 1.34135 8.89457L7.15611 14.7093C7.7508 15.3371 8.77499 15.3371 9.40272 14.7093L15.2175 8.89457C16.2086 7.90342 15.4818 6.18543 14.0942 6.18543ZM8.27941 13.586L2.46466 7.77127H6.4623V1.95651H10.0635V7.77127H14.0942L8.27941 13.586Z" fill="#F9738A" />
    </svg>
  </button>
            <div className="catalog-pdf__pagination">
              <button 
                className="catalog-pdf__pagination-btn"
                onClick={handlePrev}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                {'<<'}
              </button>
              <span className="catalog-pdf__pagination-text">Página {currentPage} / {totalPages}</span>
              <button 
                className="catalog-pdf__pagination-btn"
                onClick={handleNext}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                {'>>'}
              </button>

            </div>
            
            {/* PDF Viewer con páginas individuales */}
            <div className="catalog-pdf__pdf-viewer">
              {pdfs.length > 0 && (
                <div className="catalog-pdf__pdf-container">
                  {/* Renderizar un iframe para cada página */}
                  {Array.from({ length: totalPages }, (_, index) => {
                    const pageNumber = index + 1;
                    const isVisible = pageNumber === currentPage;
                    
                    return (
                                              <div
                          key={`page-${pageNumber}`}
                          ref={el => pageRefs.current[index] = el}
                          className={`catalog-pdf__pdf-page ${isVisible ? 'visible' : 'hidden'}`}
                          style={{ 
                            visibility: isVisible ? 'visible' : 'hidden',
                            opacity: isVisible ? 1 : 0,
                            position: isVisible ? 'relative' : 'absolute',
                            top: isVisible ? '0' : '-9999px'
                          }}
                        >
                        
                         
                         <iframe
                           src={`/${pdfs[currentPdfIndex].pdf_path}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                           title={`Página ${pageNumber}`}
                           className="catalog-pdf__pdf-iframe"
                           width="100%"
                           height="600"
                           frameBorder="0"
                         />
                         
                         {isVisible && (
                           <div className="catalog-pdf__page-indicator">
                             <span className="catalog-pdf__page-indicator-text">
                               Página {pageNumber} de {totalPages}
                             </span>
                           </div>
                         )}
                      </div>
                    );
                  })}
                  
                  
                </div>
              )}
            </div>
          </main>

          {!isDesktop && (
            <section className="catalog-pdf__thumbnails mobile">
              <div className="catalog-pdf__thumbnails-header">
                <span className="catalog-pdf__thumbnails-title">Páginas del PDF</span>
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
                  pages={pageThumbnails}
                  selectedPage={currentPage}
                  onSelect={handlePageSelect}
                  pdfPath={pdfs[currentPdfIndex]?.pdf_path}
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