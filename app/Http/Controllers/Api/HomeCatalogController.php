<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class HomeCatalogController extends Controller
{
    /**
     * Obtener catálogos para mostrar en el home
     */
    public function index(Request $request): JsonResponse
    {
        try {
            Log::info('🔍 HomeCatalogController - Iniciando consulta de catálogos del home');
            
            $catalogs = Catalog::active()
                ->ordered()
                ->select(['id', 'name', 'description', 'code', 'image', 'display_order'])
                ->with(['pdfImages' => function($query) {
                    $query->select('catalog_id', 'image_path')->orderBy('display_order');
                }])
                ->get();

            Log::info('🔍 HomeCatalogController - Catálogos encontrados:', [
                'total' => $catalogs->count(),
                'catalogs' => $catalogs->toArray()
            ]);

            return response()->json([
                'success' => true,
                'catalogs' => $catalogs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener catálogos del home: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener un catálogo específico del home
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $catalog = Catalog::where('id', $id)
                ->where('is_active', true)
                ->with(['pdfImages' => function($query) {
                    $query->select('catalog_id', 'image_path')->orderBy('display_order');
                }])
                ->first();

            if (!$catalog) {
                return response()->json([
                    'success' => false,
                    'error' => 'Catálogo no encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'catalog' => $catalog
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener catálogo: ' . $e->getMessage()
            ], 500);
        }
    }
}
