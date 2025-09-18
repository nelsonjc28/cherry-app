import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Generate array of page numbers to display
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 4;
    
    // Always show first page
    pages.push(1);
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show ellipsis and selective pages for larger total
      if (currentPage <= 3) {
        // Near beginning
        for (let i = 2; i <= 3; i++) {
          pages.push(i);
        }
        if (totalPages > 4) {
          pages.push('...');
          pages.push(totalPages);
        } else {
          pages.push(4);
        }
      } else if (currentPage >= totalPages - 1) {
        // Near end
        pages.push('...');
        for (let i = totalPages - 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In middle
        pages.push('...');
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Handle page click
  const handlePageClick = (page) => {
    if (page !== '...' && page !== currentPage) {
      onPageChange(page);
    }
  };

  // Handle previous page
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  // Handle next page
  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className="pagination">
      <div className="pagination-container">
        {/* Previous button */}
        <button 
          className={`pagination-btn prev ${currentPage === 1 ? 'disabled' : ''}`}
          onClick={handlePrevious}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <span className="pagination-arrow">‹</span>
        </button>

        {/* Page numbers */}
        <div className="pagination-numbers">
          {pageNumbers.map((page, index) => (
            <button
              key={index}
              className={`pagination-number ${
                page === currentPage ? 'active' : ''
              } ${page === '...' ? 'ellipsis' : ''}`}
              onClick={() => handlePageClick(page)}
              disabled={page === '...'}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next button */}
        <button 
          className={`pagination-btn next ${currentPage === totalPages ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
        >
          <span className="pagination-arrow">›</span>
        </button>
      </div>
    </div>
  );
};

export default Pagination; 
