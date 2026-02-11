<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FavoriteController extends Controller
{
    /**
     * Obtener favoritos del usuario con paginación
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            // Obtener favoritos con la relación al producto usando eager loading
            $favorites = Favorite::where('user_id', $user->id)
                ->with('product')
                ->orderBy('created_at', 'desc')
                ->get();

            // Obtener solo los IDs de productos favoritos (para compatibilidad con código existente)
            $favoriteProductIds = $favorites->pluck('product_id')->toArray();

            // Formatear favoritos con información completa del producto
            $favoritesWithProducts = $favorites->map(function ($favorite) {
                $product = $favorite->product;
                return [
                    'id' => $favorite->id,
                    'product_id' => $favorite->product_id,
                    'created_at' => $favorite->created_at,
                    'product' => $product ? [
                        'id' => $product->id,
                        'id_articulo' => $product->id,
                        'descripcion' => $product->descripcion,
                        'title' => $product->descripcion,
                        'imagen' => $this->getProductImageUrl($product->id, $product->imagen),
                        'image' => $this->getProductImageUrl($product->id, $product->imagen),
                        'precio1' => $product->precio1,
                        'price' => (float) ($product->precio1 ?? 0),
                        'precio2' => $product->precio2,
                        'precio3' => $product->precio3,
                        'desc_promo' => $product->desc_promo,
                        'discount' => (float) ($product->desc_promo ?? 0),
                        'marca' => $product->marca,
                        'brand' => $product->marca,
                        'inventario' => (float) ($product->inventario ?? 0),
                        'stock' => (float) ($product->inventario ?? 0),
                        'sku' => $product->sku,
                        'ean' => $product->ean,
                        'fecha_alta' => $product->fecha_alta,
                        'activo' => $product->activo,
                        'opc_nuevo' => $product->opc_nuevo,
                        'opc_promo' => $product->opc_promo,
                        // Agregar más campos según sea necesario
                    ] : null
                ];
            });

            // Si no hay favoritos, retornar array vacío sin mensaje de error
            if (empty($favoriteProductIds)) {
                return response()->json([
                    'success' => true,
                    'favorite_product_ids' => [],
                    'favorites' => []
                ]);
            }

            return response()->json([
                'success' => true,
                'favorite_product_ids' => $favoriteProductIds,
                'favorites' => $favoritesWithProducts
            ]);
            
        } catch (\Exception $e) {
            // En caso de error, retornar array vacío sin mensaje
            return response()->json([
                'success' => true,
                'favorite_product_ids' => [],
                'favorites' => []
            ]);
        }
    }

    /**
     * Agregar producto a favoritos
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            $request->validate([
                'product_id' => 'required|string'
            ]);

            // Consultar el producto completo desde la tabla productos
            $producto = Producto::find($request->product_id);
            
            if (!$producto) {
                return response()->json([
                    'success' => false,
                    'error' => 'Producto no encontrado'
                ], 404);
            }

            // Preparar datos del producto para guardar en favoritos
            $productData = [
                'product_id' => $producto->id,
                'product_title' => $producto->descripcion ?? null,
                'product_image' => $producto->imagen ?? null,
                'product_price' => $producto->precio1 ?? null
            ];

            $favorite = Favorite::addToFavorites($user->id, $productData);

            return response()->json([
                'success' => true,
                'message' => 'Producto agregado a favoritos',
                'favorite' => $favorite
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al agregar a favoritos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar si un producto está en favoritos
     */
    public function check(Request $request): JsonResponse
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            $request->validate([
                'product_id' => 'required|string'
            ]);

            // Sin caché - siempre consultar BD fresca
            $isFavorited = Favorite::where('user_id', $user->id)
                                   ->where('product_id', $request->product_id)
                                   ->exists();

            return response()->json([
                'success' => true,
                'is_favorited' => $isFavorited
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al verificar favorito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remover producto de favoritos
     */
    public function destroy(Request $request): JsonResponse
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            $request->validate([
                'product_id' => 'required|string'
            ]);

            $deleted = Favorite::removeFromFavorites($user->id, $request->product_id);

            return response()->json([
                'success' => true,
                'message' => 'Producto removido de favoritos',
                'deleted' => $deleted > 0
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al remover de favoritos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle favorito (agregar/remover)
     */
    public function toggle(Request $request): JsonResponse
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            $request->validate([
                'product_id' => 'required|string'
            ]);

            // Verificar si ya existe el favorito
            $existingFavorite = Favorite::where('user_id', $user->id)
                ->where('product_id', $request->product_id)
                ->first();

            if ($existingFavorite) {
                // Si ya existe, lo removemos
                $existingFavorite->delete();
                $message = 'Producto removido de favoritos';
                $action = 'removed';
                $isFavorited = false;
            } else {
                // Si no existe, consultar el producto completo desde la tabla productos
                $producto = Producto::find($request->product_id);
                
                if (!$producto) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Producto no encontrado'
                    ], 404);
                }

                // Preparar datos del producto para guardar en favoritos
                $productData = [
                    'product_id' => $producto->id,
                    'product_title' => $producto->descripcion ?? null,
                    'product_image' => $producto->imagen ?? null,
                    'product_price' => $producto->precio1 ?? null
                ];

                // Crear el favorito con toda la información del producto
                $favorite = Favorite::create([
                    'user_id' => $user->id,
                    'product_id' => $productData['product_id'],
                    'product_title' => $productData['product_title'],
                    'product_image' => $productData['product_image'],
                    'product_price' => $productData['product_price']
                ]);

                $message = 'Producto agregado a favoritos';
                $action = 'added';
                $isFavorited = true;
            }

            // Sin caché - no es necesario limpiar

            return response()->json([
                'success' => true,
                'message' => $message,
                'action' => $action,
                'is_favorited' => $isFavorited
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al toggle favorito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generar URL completa de imagen del producto
     */
    private function getProductImageUrl($productId, $imagenFromDb = null): string
    {
        // Si no hay productId, devolver placeholder
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }

        // Convertir a string para manejar correctamente
        $productIdStr = trim((string) $productId);
        
        // Si hay imagen en la BD y no es un placeholder/imagen de prueba, verificar si es válida
        if ($imagenFromDb && trim($imagenFromDb) !== '' && 
            !str_contains(strtolower($imagenFromDb), 'placeholder') && 
            !str_contains($imagenFromDb, 'Rectangle 4922') &&
            !str_contains(strtolower($imagenFromDb), 'test') &&
            !str_contains(strtolower($imagenFromDb), 'prueba')) {
            // Si ya es una URL completa válida (S3), retornarla
            if (filter_var($imagenFromDb, FILTER_VALIDATE_URL) && str_contains($imagenFromDb, 'cherry-fotos.s3')) {
                return $imagenFromDb;
            }
        }

        // Siempre usar S3 para obtener la imagen real del producto
        // Generar URL de S3: https://cherry-fotos.s3.amazonaws.com/shopify/{productId}/{productId}_1.jpg
        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
    }
}
