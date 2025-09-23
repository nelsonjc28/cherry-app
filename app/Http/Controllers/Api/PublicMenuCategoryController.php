<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class PublicMenuCategoryController extends Controller
{
    /**
     * Obtener categorías del menú (versión pública)
     */
    public function index()
    {
        try {
            // Verificar si la tabla existe
            if (!Schema::hasTable('menu_categories')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tabla menu_categories no existe'
                ], 500);
            }

            // Obtener categorías del menú sin relaciones
            $menuCategories = DB::table('menu_categories')
                ->join('categories', 'menu_categories.category_id', '=', 'categories.id')
                ->orderBy('menu_categories.order')
                ->select('categories.*')
                ->get();

            // Verificar si hay categorías
            if ($menuCategories->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'No hay categorías del menú configuradas'
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $menuCategories,
                'count' => $menuCategories->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las categorías del menú: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }
}
