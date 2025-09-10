import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  // Estado para controlar cuando el iframe está listo para mostrar
  const [iframeReady, setIframeReady] = useState(false);
  // Estado para detectar si el iframe falló en móvil
  const [iframeError, setIframeError] = useState(false);
  // Referencias a los elementos DOM de cada página (para scroll y observer)
  const pageRefs = useRef([]);
  // Referencia a la lista de miniaturas (para scroll automático)
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

      }
      

      
      setTotalPages(pdfPageCount);
      setCurrentPage(1);
      
      // Limpiar las referencias anteriores
      pageRefs.current = [];

    }
  }, [pdfs, currentPdfIndex]);

  // Navega a la página anterior
  const handlePrev = () => {
    if (currentPage > 1) {
      setIframeReady(false); // Reset iframe state
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      scrollToPage(newPage, false);
    }
  };

  // Navega a la página siguiente
  const handleNext = () => {
    if (currentPage < totalPages) {
      setIframeReady(false); // Reset iframe state
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


  // Limpieza del observer al desmontar el componente
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Efecto para precargar la siguiente página (opcional para mejor UX)
  useEffect(() => {
    if (pdfs.length > 0 && currentPage < totalPages) {
      // Precargar la siguiente página en segundo plano para navegación más fluida
      const nextPage = currentPage + 1;
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'prefetch';
      preloadLink.href = `/${pdfs[currentPdfIndex].pdf_path}#page=${nextPage}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
      document.head.appendChild(preloadLink);
      
      // Limpiar el preload después de 5 segundos
        setTimeout(() => {
        if (document.head.contains(preloadLink)) {
          document.head.removeChild(preloadLink);
        }
      }, 5000);
    }
  }, [currentPage, totalPages, pdfs, currentPdfIndex]);

  // Reset iframe state when page changes
  useEffect(() => {
    setIframeReady(false);
    setIframeError(false);
    
    // Timeout de seguridad: más corto en móvil para mejor experiencia
    const timeoutDuration = isDesktop ? 2000 : 1500; // 1.5s en móvil, 2s en desktop
    
    const safetyTimeout = setTimeout(() => {
      if (!iframeReady && !iframeError) {
        console.log('Timeout de seguridad: mostrando iframe');
        setIframeReady(true);
        
        // Buscar y mostrar el iframe manualmente
        const iframe = document.querySelector('.catalog-pdf__pdf-iframe');
        const loadingIndicator = document.querySelector('.catalog-pdf__loading-indicator');
        
        if (iframe) {
          iframe.style.visibility = 'visible';
          iframe.style.opacity = '1';
          // En móvil, forzar estilos adicionales
          if (!isDesktop) {
            iframe.style.display = 'block';
            iframe.style.width = '100%';
            iframe.style.height = '400px';
            
            // En móvil, si después de 3 segundos más el iframe sigue sin contenido,
            // mostrar fallback
            setTimeout(() => {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (!iframeDoc || iframeDoc.body.innerHTML.trim() === '') {
                console.log('Iframe vacío en móvil, mostrando fallback');
                setIframeError(true);
                if (loadingIndicator) {
                  loadingIndicator.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                      <p style="color: #666; margin-bottom: 15px;">📱 Tu navegador no puede mostrar el PDF aquí</p>
                      <a 
                        href="/${pdfs[currentPdfIndex].pdf_path}" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style="
                          background: #EA2630; 
                          color: white; 
                          padding: 12px 24px; 
                          border-radius: 6px; 
                          text-decoration: none; 
                          display: inline-block;
                          font-weight: 600;
                          font-size: 16px;
                        "
                      >
                        🔗 Ver PDF completo
                      </a>
                      <p style="font-size: 12px; color: #999; margin-top: 10px;">Se abrirá en una nueva pestaña</p>
                    </div>
                  `;
                  loadingIndicator.style.display = 'block';
                }
              }
            }, 3000);
          }
        }
        
        if (loadingIndicator && !iframeError) {
          loadingIndicator.style.display = 'none';
        }
      }
    }, timeoutDuration);
    
    return () => clearTimeout(safetyTimeout);
  }, [currentPage, currentPdfIndex, iframeReady, isDesktop]);

  // Navegación con teclado para mejor UX
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return; // No interferir con inputs
      }
      
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          handlePrev();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          handleNext();
          break;
        case 'Home':
          event.preventDefault();
          setIframeReady(false);
          setCurrentPage(1);
          break;
        case 'End':
          event.preventDefault();
          setIframeReady(false);
          setCurrentPage(totalPages);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, totalPages]);



  // Función para descargar un PDF
  const handleDownloadPdf = (pdf) => {
    const link = document.createElement('a');
    link.href = `/${pdf.pdf_path}`;
    link.download = 'catalogo.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


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
            
            {/* PDF Viewer optimizado con una sola página */}
            <div className="catalog-pdf__pdf-viewer">
              {pdfs.length > 0 && (
                <div className="catalog-pdf__pdf-container">
                  {/* Renderizar solo la página actual para optimizar rendimiento */}
                  <div
                    key={`page-${currentPage}`}
                    ref={el => pageRefs.current[currentPage - 1] = el}
                    className="catalog-pdf__pdf-page visible"
                          style={{ 
                      visibility: 'visible',
                      opacity: 1,
                      position: 'relative',
                      minHeight: '600px'
                    }}
                  >
                    {/* Mostrar indicador de carga mientras se carga el iframe */}
                    <div className="catalog-pdf__loading-indicator">
                      <div className="catalog-pdf__loading-spinner"></div>
                      <span>Cargando página {currentPage} de {totalPages}...</span>
                    </div>
                         
                    <iframe
                      key={`iframe-${currentPdfIndex}-${currentPage}`} // Force re-render when page changes
                      src={`/${pdfs[currentPdfIndex].pdf_path}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=${isDesktop ? 'page-fit' : 'page-width'}`}
                      title={`Página ${currentPage} de ${totalPages}`}
                      className="catalog-pdf__pdf-iframe"
                      width="100%"
                      height={isDesktop ? "600" : "400"} // Altura adaptativa según dispositivo
                      frameBorder="0"
                      loading="lazy"
                      allow="fullscreen"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      onLoad={(e) => {
                        // Dar un pequeño delay para asegurar que el PDF se renderice correctamente
                        const delay = isDesktop ? 300 : 200; // Delay más corto en móvil
                        
                        setTimeout(() => {
                          // Verificar que la URL del iframe contenga la página correcta antes de mostrar
                          const iframeSrc = e.target.src;
                          const expectedPage = `page=${currentPage}`;
                          
                          console.log(`Cargando PDF - Dispositivo: ${isDesktop ? 'Desktop' : 'Móvil'}, Página: ${currentPage}`);
                          
                          if (iframeSrc.includes(expectedPage)) {
                            // Marcar el iframe como listo y mostrar
                            setIframeReady(true);
                            
                            // Ocultar indicador de carga
                            const loadingIndicator = e.target.parentElement.querySelector('.catalog-pdf__loading-indicator');
                            if (loadingIndicator) {
                              loadingIndicator.style.display = 'none';
                            }
                            
                            // Mostrar el iframe con transición suave
                            e.target.style.visibility = 'visible';
                            e.target.style.opacity = '1';
                            
                            // En móvil, asegurar estilos adicionales
                            if (!isDesktop) {
                              e.target.style.display = 'block';
                              console.log('PDF cargado en móvil - iframe visible');
                            }
                          } else {
                            // Si no es la página correcta, mantener oculto
                            console.log('Página incorrecta cargada, esperando la correcta...');
                          }
                        }, delay);
                      }}
                      onError={(e) => {
                        console.error('Error cargando iframe PDF en móvil');
                        setIframeError(true);
                        
                        // Mostrar error si no se puede cargar
                        const loadingIndicator = e.target.parentElement.querySelector('.catalog-pdf__loading-indicator');
                        if (loadingIndicator) {
                          loadingIndicator.innerHTML = `
                            <div style="text-align: center; padding: 20px;">
                              <p style="color: #f44336; margin-bottom: 15px;">⚠️ No se puede mostrar el PDF</p>
                              <a 
                                href="/${pdfs[currentPdfIndex].pdf_path}" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style="
                                  background: #EA2630; 
                                  color: white; 
                                  padding: 10px 20px; 
                                  border-radius: 6px; 
                                  text-decoration: none; 
                                  display: inline-block;
                                  font-weight: 600;
                                "
                              >
                                📱 Abrir PDF en nueva pestaña
                              </a>
                            </div>
                          `;
                        }
                      }}
                      style={{ 
                        opacity: 0, 
                        transition: 'opacity 0.5s ease',
                        visibility: 'hidden' // Inicialmente invisible
                      }}
                    />
                    
                           <div className="catalog-pdf__page-indicator">
                             <span className="catalog-pdf__page-indicator-text">
                        Página {currentPage} de {totalPages}
                             </span>
                           </div>
                      </div>
                </div>
              )}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};

export default CatalogPdfPage; 
