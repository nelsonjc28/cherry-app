<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryProduct;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;


class ExternalProductController extends Controller
{
    /**
     * Obtener productos externos filtrados por código de categoría
     */
    public function getProductsByCategoryCode(Request $request, $categoryCode): JsonResponse
    {
        try {
            // Buscar la categoría por código
            $category = Category::where('code', $categoryCode)
                ->where('is_active', true)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], 404);
            }

            // Obtener productos locales de la categoría
            $localProducts = CategoryProduct::where('category_id', $category->id)
                ->orderBy('display_order', 'asc')
                ->get();

            // Obtener IDs de productos locales para evitar duplicados
            $localProductIds = $localProducts->pluck('external_product_id')->toArray();

            // Obtener productos externos de la API
            $externalProducts = $this->fetchExternalProducts($categoryCode);

            // Filtrar productos externos que no estén en la categoría local
            $availableExternalProducts = collect($externalProducts)->filter(function ($product) use ($localProductIds) {
                $isDuplicate = in_array($product['id_articulo'] ?? null, $localProductIds);
                return !$isDuplicate;
            })->values();

            // Combinar productos locales con externos disponibles
            $combinedProducts = [
                'local' => $localProducts,
                'external' => $availableExternalProducts,
                'total_local' => $localProducts->count(),
                'total_external' => $availableExternalProducts->count(),
                'total_combined' => $localProducts->count() + $availableExternalProducts->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => $category,
                    'products' => $combinedProducts
                ]
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos externos de la API
     */
    private function fetchExternalProducts($categoryCode): array
    {
        try {
            $response = Http::timeout(30)
                ->get('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');

            if (!$response->successful()) {
                return [];
            }

            $products = $response->json();

            if (!is_array($products)) {
                return [];
            }



            // Filtrar productos por código de categoría
            $filteredProducts = collect($products)->filter(function ($product) use ($categoryCode) {
                // Verificar si el producto tiene la estructura esperada
                if (!isset($product['linea']) || !isset($product['linea']['id_linea'])) {
                    return false;
                }

                $idLinea = $product['linea']['id_linea'];
                $comparacion = $categoryCode == $idLinea; // Usando == como solicitaste

                return $comparacion;
            })->values();



            return $filteredProducts->toArray();

        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Obtener productos externos disponibles para agregar a una categoría
     */
    public function getAvailableProductsForCategory(Request $request, $categoryId): JsonResponse
    {
        try {
            $category = Category::findOrFail($categoryId);

            // Obtener productos externos
            $externalProducts = $this->fetchExternalProducts($category->code);

            // Obtener IDs de productos que ya están en esta categoría
            $categoryProductIds = CategoryProduct::where('category_id', $categoryId)
                ->pluck('external_product_id')
                ->toArray();

            // Filtrar productos externos que no estén en la categoría
            $availableProducts = collect($externalProducts)->filter(function ($product) use ($categoryProductIds) {
                return !in_array($product['id_articulo'] ?? null, $categoryProductIds);
            })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => $category,
                    'available_products' => $availableProducts,
                    'total_available' => $availableProducts->count()
                ]
            ]);

        } catch (\Exception $e) {

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos disponibles: ' . $e->getMessage()
            ], 500);
        }
    }
}
