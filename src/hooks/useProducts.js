import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../api';

/**
 * Custom hook for fetching featured products
 * @param {number} limit - Maximum number of products to fetch
 */
export const useFeaturedProducts = (limit = 8) => {
  return useQuery({
    queryKey: ['featuredProducts', limit],
    queryFn: () => productsApi.getFeaturedProducts(limit)
      .then(response => response.data),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Custom hook for fetching products by category
 * @param {string} categoryId - Category identifier
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 */
export const useProductsByCategory = (categoryId, page = 1, limit = 12) => {
  return useQuery({
    queryKey: ['productsByCategory', categoryId, page, limit],
    queryFn: () => productsApi.getProductsByCategory(categoryId, page, limit)
      .then(response => response.data),
    // Only fetch if we have a categoryId
    enabled: !!categoryId,
    keepPreviousData: true, // Keep previous data while fetching new data for smoother pagination
  });
};

/**
 * Custom hook for fetching product details
 * @param {string} productId - Product identifier
 */
export const useProductDetails = (productId) => {
  return useQuery({
    queryKey: ['productDetails', productId],
    queryFn: () => productsApi.getProductById(productId)
      .then(response => response.data),
    // Only fetch if we have a productId
    enabled: !!productId,
  });
};

/**
 * Custom hook for searching products
 * @param {string} query - Search term
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 */
export const useSearchProducts = (query, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['searchProducts', query, page, limit],
    queryFn: () => productsApi.searchProducts(query, page, limit)
      .then(response => response.data),
    // Only fetch if we have a search query with at least 2 characters
    enabled: !!query && query.length >= 2,
    keepPreviousData: true, // Keep previous data while fetching new data for smoother pagination
  });
};

/**
 * Custom hook for fetching product reviews
 * @param {string} productId - Product identifier
 * @param {number} page - Page number for pagination
 */
export const useProductReviews = (productId, page = 1) => {
  return useQuery({
    queryKey: ['productReviews', productId, page],
    queryFn: () => productsApi.getProductReviews(productId, page)
      .then(response => response.data),
    // Only fetch if we have a productId
    enabled: !!productId,
    keepPreviousData: true, // Keep previous data while fetching new data for smoother pagination
  });
}; 