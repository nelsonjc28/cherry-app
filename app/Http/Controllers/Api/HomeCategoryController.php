<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderedCategory;
use Illuminate\Http\JsonResponse;

class HomeCategoryController extends Controller
{
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
                'error' => 'Error al obtener categorías del home: ' . $e->getMessage()
            ], 500);
        }
    }
}
