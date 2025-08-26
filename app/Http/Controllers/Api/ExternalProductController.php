<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryProduct;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExternalProductController extends Controller
{
    /**
     * Obtener productos externos filtrados por código de categoría
     */
    public function getProductsByCategoryCode(Request $request, $categoryCode): JsonResponse
    {
        try {
            Log::info('🚀 ExternalProductController - Iniciando búsqueda de productos', [
                'category_code' => $categoryCode,
                'category_code_type' => gettype($categoryCode)
            ]);

            // Buscar la categoría por código
            $category = Category::where('code', $categoryCode)
                ->where('is_active', true)
                ->first();

            if (!$category) {
                Log::warning('❌ Categoría no encontrada por código', [
                    'category_code' => $categoryCode
                ]);
                return response()->json([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], 404);
            }

            Log::info('✅ Categoría encontrada', [
                'category_id' => $category->id,
                'category_name' => $category->name,
                'category_code' => $category->code
            ]);

            // Obtener productos locales de la categoría
            $localProducts = CategoryProduct::where('category_id', $category->id)
                ->orderBy('display_order', 'asc')
                ->get();

            // Obtener IDs de productos locales para evitar duplicados
            $localProductIds = $localProducts->pluck('external_product_id')->toArray();

            Log::info('📋 Productos locales encontrados', [
                'category_id' => $category->id,
                'local_products_count' => $localProducts->count(),
                'local_product_ids' => $localProductIds
            ]);

            // Obtener productos externos de la API
            Log::info('🌐 Obteniendo productos externos de la API', [
                'category_code' => $categoryCode
            ]);
            
            $externalProducts = $this->fetchExternalProducts($categoryCode);

            // Filtrar productos externos que no estén en la categoría local
            Log::info('🔍 Filtrando productos externos para evitar duplicados', [
                'external_products_count' => count($externalProducts),
                'local_product_ids' => $localProductIds
            ]);

            $availableExternalProducts = collect($externalProducts)->filter(function ($product) use ($localProductIds) {
                $isDuplicate = in_array($product['id_articulo'] ?? null, $localProductIds);
                if ($isDuplicate) {
                    Log::info('🔄 Producto duplicado encontrado', [
                        'product_id' => $product['id_articulo'] ?? 'unknown',
                        'product_name' => $product['nombre_articulo'] ?? 'Sin nombre'
                    ]);
                }
                return !$isDuplicate;
            })->values();

            Log::info('✅ Filtrado de duplicados completado', [
                'external_products_original' => count($externalProducts),
                'external_products_after_filter' => $availableExternalProducts->count(),
                'duplicates_removed' => count($externalProducts) - $availableExternalProducts->count()
            ]);

            // Combinar productos locales con externos disponibles
            $combinedProducts = [
                'local' => $localProducts,
                'external' => $availableExternalProducts,
                'total_local' => $localProducts->count(),
                'total_external' => $availableExternalProducts->count(),
                'total_combined' => $localProducts->count() + $availableExternalProducts->count()
            ];

            Log::info('🎯 Productos combinados exitosamente', [
                'total_local' => $localProducts->count(),
                'total_external' => $availableExternalProducts->count(),
                'total_combined' => $localProducts->count() + $availableExternalProducts->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => $category,
                    'products' => $combinedProducts
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al obtener productos externos por categoría: ' . $e->getMessage(), [
                'category_code' => $categoryCode,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

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
                Log::warning('API externa no respondió correctamente', [
                    'status' => $response->status(),
                    'category_code' => $categoryCode
                ]);
                return [];
            }

            $products = $response->json();

            if (!is_array($products)) {
                Log::warning('API externa no devolvió un array', [
                    'response_type' => gettype($products),
                    'category_code' => $categoryCode
                ]);
                return [];
            }

            // Log del código de categoría que estamos buscando
            Log::info('🔍 ExternalProductController - Comparando códigos de categoría', [
                'category_code' => $categoryCode,
                'category_code_type' => gettype($categoryCode),
                'total_products_from_api' => count($products)
            ]);

            // Filtrar productos por código de categoría
            $filteredProducts = collect($products)->filter(function ($product) use ($categoryCode) {
                // Verificar si el producto tiene la estructura esperada
                if (!isset($product['linea']) || !isset($product['linea']['id_linea'])) {
                    Log::warning('Producto sin estructura linea.id_linea', [
                        'product_id' => $product['id_articulo'] ?? 'unknown',
                        'product_structure' => array_keys($product)
                    ]);
                    return false;
                }

                $idLinea = $product['linea']['id_linea'];
                $comparacion = $categoryCode == $idLinea; // Usando == como solicitaste

                // Log detallado de la comparación
                Log::info('📦 Comparando producto', [
                    'product_id' => $product['id_articulo'] ?? 'unknown',
                    'product_name' => $product['nombre_articulo'] ?? 'Sin nombre',
                    'id_linea' => $idLinea,
                    'id_linea_type' => gettype($idLinea),
                    'category_code' => $categoryCode,
                    'category_code_type' => gettype($categoryCode),
                    'comparacion' => $comparacion,
                    'resultado' => $comparacion ? '✅ COINCIDE' : '❌ NO COINCIDE'
                ]);

                return $comparacion;
            })->values();

            Log::info('🎯 Productos externos filtrados exitosamente', [
                'category_code' => $categoryCode,
                'total_products' => count($products),
                'filtered_products' => $filteredProducts->count(),
                'filtered_product_ids' => $filteredProducts->pluck('id_articulo')->toArray()
            ]);

            return $filteredProducts->toArray();

        } catch (\Exception $e) {
            Log::error('Error al obtener productos de la API externa: ' . $e->getMessage(), [
                'category_code' => $categoryCode,
                'error' => $e->getMessage()
            ]);
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
            Log::error('Error al obtener productos disponibles para categoría: ' . $e->getMessage(), [
                'category_id' => $categoryId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos disponibles: ' . $e->getMessage()
            ], 500);
        }
    }
}
