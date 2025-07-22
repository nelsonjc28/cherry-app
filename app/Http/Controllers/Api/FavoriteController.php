<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FavoriteController extends Controller
{
    /**
     * Obtener favoritos del usuario
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            $favorites = Favorite::getUserFavorites($user->id);

            return response()->json([
                'success' => true,
                'favorites' => $favorites
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener favoritos: ' . $e->getMessage()
            ], 500);
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

            $isFavorited = Favorite::isFavorited($user->id, $request->product_id);

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

            $isFavorited = Favorite::isFavorited($user->id, $request->product_id);

            if ($isFavorited) {
                // Remover de favoritos
                Favorite::removeFromFavorites($user->id, $request->product_id);
                $message = 'Producto removido de favoritos';
                $action = 'removed';
            } else {
                // Agregar a favoritos
                Favorite::addToFavorites($user->id, $request->all());
                $message = 'Producto agregado a favoritos';
                $action = 'added';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'action' => $action,
                'is_favorited' => !$isFavorited
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al toggle favorito: ' . $e->getMessage()
            ], 500);
        }
    }
}
