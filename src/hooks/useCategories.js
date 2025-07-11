import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api';

/**
 * Custom hook for fetching all categories
 */
export const useAllCategories = () => {
  return useQuery({
    queryKey: ['allCategories'],
    queryFn: () => categoriesApi.getAllCategories()
      .then(response => response.data),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

/**
 * Custom hook for fetching category details
 * @param {string} categoryId - Category identifier
 */
export const useCategoryDetails = (categoryId) => {
  return useQuery({
    queryKey: ['categoryDetails', categoryId],
    queryFn: () => categoriesApi.getCategoryById(categoryId)
      .then(response => response.data),
    // Only fetch if we have a categoryId
    enabled: !!categoryId,
  });
};

/**
 * Custom hook for fetching featured categories
 * @param {number} limit - Maximum number of categories to fetch
 */
export const useFeaturedCategories = (limit = 6) => {
  return useQuery({
    queryKey: ['featuredCategories', limit],
    queryFn: () => categoriesApi.getFeaturedCategories(limit)
      .then(response => response.data),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

/**
 * Custom hook for fetching subcategories for a parent category
 * @param {string} parentCategoryId - Parent category identifier
 */
export const useSubcategories = (parentCategoryId) => {
  return useQuery({
    queryKey: ['subcategories', parentCategoryId],
    queryFn: () => categoriesApi.getSubcategories(parentCategoryId)
      .then(response => response.data),
    // Only fetch if we have a parentCategoryId
    enabled: !!parentCategoryId,
  });
}; 