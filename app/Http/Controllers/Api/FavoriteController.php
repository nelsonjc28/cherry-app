<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
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

            // Obtener solo los IDs de productos favoritos del usuario
            $favoriteProductIds = Favorite::where('user_id', $user->id)
                ->pluck('product_id')
                ->toArray();

            // Si no hay favoritos, retornar array vacío sin mensaje de error
            if (empty($favoriteProductIds)) {
                return response()->json([
                    'success' => true,
                    'favorite_product_ids' => []
                ]);
            }

            return response()->json([
                'success' => true,
                'favorite_product_ids' => $favoriteProductIds
            ]);
            
        } catch (\Exception $e) {
            // En caso de error, retornar array vacío sin mensaje
            return response()->json([
                'success' => true,
                'favorite_product_ids' => []
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
                'product_id' => 'required|string',
                'product_title' => 'nullable|string',
                'product_image' => 'nullable|string',
                'product_price' => 'nullable|numeric'
            ]);

            $favorite = Favorite::addToFavorites($user->id, $request->all());

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

            // Usar caché para mejorar velocidad
            $cacheKey = "favorite_check_{$user->id}_{$request->product_id}";
            $isFavorited = cache()->remember($cacheKey, 60, function () use ($user, $request) {
                return Favorite::where('user_id', $user->id)
                               ->where('product_id', $request->product_id)
                               ->exists();
            });

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
                'product_id' => 'required|string',
                'product_title' => 'nullable|string',
                'product_image' => 'nullable|string',
                'product_price' => 'nullable|numeric'
            ]);

            // Usar updateOrCreate para hacer una sola operación
            $favorite = Favorite::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'product_id' => $request->product_id
                ],
                [
                    'product_title' => $request->product_title ?? null,
                    'product_image' => $request->product_image ?? null,
                    'product_price' => $request->product_price ?? null
                ]
            );

            // Verificar si se creó o actualizó
            $wasRecentlyCreated = $favorite->wasRecentlyCreated;
            
            if ($wasRecentlyCreated) {
                $message = 'Producto agregado a favoritos';
                $action = 'added';
                $isFavorited = true;
            } else {
                // Si ya existía, lo removemos
                $favorite->delete();
                $message = 'Producto removido de favoritos';
                $action = 'removed';
                $isFavorited = false;
            }

            // Limpiar caché relacionado
            $cacheKey = "favorite_check_{$user->id}_{$request->product_id}";
            cache()->forget($cacheKey);

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
}
