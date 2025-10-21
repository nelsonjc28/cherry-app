import React from 'react';
import './InfiniteScrollLoader.css';

const InfiniteScrollLoader = ({ isLoading, hasMore, observerTarget }) => {
  return (
    <div className="infinite-scroll-loader" ref={observerTarget}>
      {isLoading && (
        <div className="infinite-scroll-loader__spinner">
          <div className="spinner"></div>
          <p>Cargando más productos...</p>
        </div>
      )}
      {!hasMore && (
        <div className="infinite-scroll-loader__end">
          <p>Has visto todos los productos disponibles</p>
        </div>
      )}
    </div>
  );
};

export default InfiniteScrollLoader;





