<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;


class HomeCatalogController extends Controller
{
    /**
     * Obtener catálogos para mostrar en el home
     */
    public function index(Request $request): JsonResponse
    {
        try {
    
            
            $catalogs = Catalog::active()
                ->ordered()
                ->select(['id', 'name', 'description', 'code', 'image', 'display_order'])
                ->with(['pdfs' => function($query) {
                    $query->select('catalog_id', 'pdf_path')->orderBy('display_order');
                }])
                ->get();



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
                ->with(['pdfs' => function($query) {
                    $query->select('catalog_id', 'pdf_path')->orderBy('display_order');
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
