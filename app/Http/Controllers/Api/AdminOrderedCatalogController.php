<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\OrderedCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminOrderedCatalogController extends Controller
{
    /**
     * Obtener todos los catálogos y el orden actual
     */
    public function index(): JsonResponse
    {
        try {
            // Obtener todos los catálogos activos
            $allCatalogs = Catalog::active()->get();

            // Obtener los catálogos ordenados
            $orderedCatalogs = OrderedCatalog::with('catalog')
                ->active()
                ->ordered()
                ->get();

            // Si hay catálogos ordenados, devolver solo esos en orden
            if ($orderedCatalogs->isNotEmpty()) {
                $catalogsInOrder = $orderedCatalogs->map(function ($orderedCatalog) {
                    return $orderedCatalog->catalog;
                })->filter()->values();

                return response()->json([
                    'success' => true,
                    'catalogs' => $catalogsInOrder
                ]);
            }

            // Si no hay orden definido, devolver todos los catálogos ordenados por código
            $allCatalogs = $allCatalogs->sortBy(function ($catalog) {
                return (int) $catalog->code;
            })->values();

            return response()->json([
                'success' => true,
                'catalogs' => $allCatalogs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener catálogos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar el orden de los catálogos
     */
    public function updateOrder(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'catalogs' => 'required|array',
                'catalogs.*.id' => 'required|exists:catalogs,id',
                'catalogs.*.display_order' => 'required|integer|min:1'
            ]);

            DB::beginTransaction();

            // Eliminar todos los catálogos ordenados existentes
            OrderedCatalog::query()->delete();

            // Insertar los nuevos catálogos ordenados
            foreach ($request->catalogs as $item) {
                OrderedCatalog::create([
                    'catalog_id' => $item['id'],
                    'display_order' => $item['display_order'],
                    'is_active' => true
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Orden de catálogos actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar orden: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener los catálogos ordenados para mostrar públicamente
     */
    public function getPublicCatalogs(): JsonResponse
    {
        try {
            $orderedCatalogs = OrderedCatalog::with('catalog.pdfs')
                ->active()
                ->ordered()
                ->get();

            if ($orderedCatalogs->isNotEmpty()) {
                $catalogs = $orderedCatalogs->map(function ($orderedCatalog) {
                    return $orderedCatalog->catalog/* ->with('pdfs' )*/;
                })->filter(function ($catalog) {
                    return $catalog && $catalog->is_active;
                })->values();

                return response()->json([
                    'success' => true,
                    'catalogs' => $catalogs
                ]);
            }

            // Si no hay orden definido, devolver todos los catálogos activos ordenados por código
            $catalogs = Catalog::active()->get()->sortBy(function ($catalog) {
                return (int) $catalog->code;
            })->values();

            return response()->json([
                'success' => true,
                'catalogs' => $catalogs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener catálogos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Limpiar todas los catálogos ordenados
     */
    public function clearOrder(): JsonResponse
    {
        try {
            OrderedCatalog::query()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Orden de catálogos limpiado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al limpiar orden: ' . $e->getMessage()
            ], 500);
        }
    }
}
