import React from 'react';
import './PdfThumbnailsList.css';

const PdfThumbnailsList = ({ pages, selectedPage, onSelect, pdfPath }) => {
  // Debug: mostrar información
  console.log('PdfThumbnailsList Debug:', {
    pages: pages,
    selectedPage: selectedPage,
    pdfPath: pdfPath
  });

  return (
    <div className="pdf-thumbnails-list">
      {/* Indicador de páginas */}
      <div className="pdf-thumbnails-header">
        <span className="pdf-thumbnails-count">
          {pages.length} páginas disponibles
        </span>
      </div>
      
      <div className="pdf-thumbnails-scroll-container">
        {pages.map((page) => (
          <div
            key={page.id}
            className={`pdf-thumbnail ${selectedPage === page.pageNumber ? 'selected' : ''}`}
            onClick={() => onSelect(page.pageNumber)}
            title={`Ir a página ${page.pageNumber}`}
          >
            <div className="pdf-thumbnail-page">
              {/* Indicador de carga */}
              <div className="pdf-thumbnail-loading">
                <div className="pdf-thumbnail-loading-spinner"></div>
                <span>Cargando...</span>
              </div>
              
              {/* Miniatura real de la página del PDF */}
              <iframe
                src={`/${pdfPath}#page=${page.pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=25`}
                title={`Página ${page.pageNumber}`}
                className="pdf-thumbnail-iframe"
                width="100%"
                height="60"
                frameBorder="0"
                loading="lazy"
                onLoad={(e) => {
                  // Ocultar indicador de carga y mostrar iframe
                  const loadingEl = e.target.parentElement.querySelector('.pdf-thumbnail-loading');
                  if (loadingEl) {
                    loadingEl.style.display = 'none';
                  }
                  e.target.style.opacity = '1';
                }}
                style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
              />
              
              {/* Número de página superpuesto */}
              <div className="pdf-thumbnail-page-number-overlay">
                {page.pageNumber}
              </div>
            </div>
            <div className="pdf-thumbnail-overlay">
              <span className="pdf-thumbnail-title">{page.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PdfThumbnailsList; 