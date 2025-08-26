<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryProduct;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    /**
     * Obtener todas las categorías activas
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $categories = Category::active()
                ->ordered()
                ->select(['id', 'name', 'slug', 'code', 'description'])
                ->get();

            return response()->json([
                'success' => true,
                'categories' => $categories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener categorías: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener una categoría específica
     */
    public function show(Request $request, $slug): JsonResponse
    {
        try {
            $category = Category::where('slug', $slug)
                ->where('is_active', true)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'category' => $category
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos de una categoría específica
     */
    public function getCategoryProducts(Request $request, $slug): JsonResponse
    {
        try {
            $category = Category::where('slug', $slug)
                ->where('is_active', true)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], 404);
            }

            // Obtener productos de la categoría con orden
            $products = CategoryProduct::where('category_id', $category->id)
                ->orderBy('display_order', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => $category,
                    'products' => $products
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos de la categoría: ' . $e->getMessage()
            ], 500);
        }
    }
} 