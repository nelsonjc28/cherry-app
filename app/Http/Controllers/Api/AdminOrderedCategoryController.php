<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\OrderedCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminOrderedCategoryController extends Controller
{
    /**
     * Obtener todas las categorías disponibles y las ordenadas
     */
    public function index(): JsonResponse
    {
        try {
            // Obtener todas las categorías activas
            $allCategories = Category::active()->ordered()->get();
            
            // Obtener las categorías que ya están ordenadas
            $orderedCategories = OrderedCategory::with('category')
                ->active()
                ->ordered()
                ->get();

            // Obtener IDs de categorías ya ordenadas
            $orderedCategoryIds = $orderedCategories->pluck('category_id')->toArray();

            // Filtrar categorías disponibles (las que no están ordenadas)
            $availableCategories = $allCategories->filter(function ($category) use ($orderedCategoryIds) {
                return !in_array($category->id, $orderedCategoryIds);
            })->values();

            return response()->json([
                'success' => true,
                'available_categories' => $availableCategories,
                'ordered_categories' => $orderedCategories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener categorías: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar el orden de las categorías
     */
    public function updateOrder(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'ordered_categories' => 'required|array',
                'ordered_categories.*.category_id' => 'required|exists:categories,id',
                'ordered_categories.*.display_order' => 'required|integer|min:0'
            ]);

            // Eliminar todas las categorías ordenadas existentes
            OrderedCategory::query()->delete();

            // Insertar las nuevas categorías ordenadas
            foreach ($request->ordered_categories as $item) {
                OrderedCategory::create([
                    'category_id' => $item['category_id'],
                    'display_order' => $item['display_order'],
                    'is_active' => true
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Orden de categorías actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar orden: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener las categorías ordenadas para mostrar en el home
     */
    public function getHomeCategories(): JsonResponse
    {
        try {
            $categories = OrderedCategory::getOrderedCategories();
            
            return response()->json([
                'success' => true,
                'categories' => $categories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener categorías del home: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Limpiar todas las categorías ordenadas
     */
    public function clearOrder(): JsonResponse
    {
        try {
            OrderedCategory::query()->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Orden de categorías limpiado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al limpiar orden: ' . $e->getMessage()
            ], 500);
        }
    }
}
