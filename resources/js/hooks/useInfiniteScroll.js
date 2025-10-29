import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook personalizado para implementar infinite scroll
 * @param {Array} items - Array completo de items a mostrar
 * @param {number} itemsPerPage - Número de items a cargar por vez (default: 20)
 * @returns {Object} - Estado y funciones para manejar el infinite scroll
 */
const useInfiniteScroll = (items, itemsPerPage = 20) => {
  const [displayedItems, setDisplayedItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef(null);

  // Reset cuando cambian los items
  useEffect(() => {
    const initialItems = items.slice(0, itemsPerPage);
    setDisplayedItems(initialItems);
    setHasMore(items.length > itemsPerPage);
  }, [items, itemsPerPage]);

  // Función para cargar más items
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
      const currentLength = displayedItems.length;
      const nextItems = items.slice(0, currentLength + itemsPerPage);
      
      setDisplayedItems(nextItems);
      setHasMore(nextItems.length < items.length);
      setIsLoading(false);
    }, 300);
  }, [items, displayedItems.length, itemsPerPage, isLoading, hasMore]);

  // Intersection Observer para detectar cuando llegamos al final
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px', // Comenzar a cargar 200px antes de llegar al final
        threshold: 0.1
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, loadMore]);

  // Función para resetear el scroll
  const reset = useCallback(() => {
    const initialItems = items.slice(0, itemsPerPage);
    setDisplayedItems(initialItems);
    setHasMore(items.length > itemsPerPage);
    setIsLoading(false);
  }, [items, itemsPerPage]);

  return {
    displayedItems,
    hasMore,
    isLoading,
    observerTarget,
    reset,
    totalItems: items.length,
    displayedCount: displayedItems.length
  };
};

export default useInfiniteScroll;









