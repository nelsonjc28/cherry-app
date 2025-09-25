<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rating;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RatingController extends Controller
{
    /**
     * Obtener calificaciones de un producto
     */
    public function getProductRatings(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'product_id' => 'required|string'
            ]);

            $productId = $request->product_id;
            
            // Obtener calificaciones desde las reseñas aprobadas
            $reviewRating = \App\Models\Review::getRatingDistribution($productId);
            
            // Obtener reseñas recientes aprobadas
            $recentReviews = \App\Models\Review::forProduct($productId)
                ->approved()
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'average_rating' => [
                    'average' => $reviewRating['average'],
                    'count' => $reviewRating['total'],
                    'distribution' => $reviewRating['distribution']
                ],
                'recent_ratings' => $recentReviews
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener calificaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener calificación del usuario para un producto
     */
    public function getUserRating(Request $request): JsonResponse
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            $request->validate([
                'product_id' => 'required|string'
            ]);

            $rating = Rating::getUserRating($user->id, $request->product_id);

            return response()->json([
                'success' => true,
                'rating' => $rating
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener calificación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Agregar o actualizar calificación
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
                'rating' => 'required|integer|min:1|max:5',
                'comment' => 'nullable|string|max:500'
            ]);

            $rating = Rating::addOrUpdateRating(
                $user->id,
                $request->product_id,
                $request->rating,
                $request->comment
            );

            // Obtener calificación promedio actualizada
            $averageRating = Rating::getAverageRating($request->product_id);

            return response()->json([
                'success' => true,
                'message' => 'Calificación guardada exitosamente',
                'rating' => $rating,
                'average_rating' => $averageRating
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al guardar calificación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de calificaciones para múltiples productos
     */
    public function getBulkRatings(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'product_ids' => 'required|array',
                'product_ids.*' => 'string'
            ]);

            $ratings = [];
            foreach ($request->product_ids as $productId) {
                // Obtener calificaciones desde las reseñas aprobadas
                $reviewRating = \App\Models\Review::getRatingDistribution($productId);
                $ratings[$productId] = [
                    'average' => $reviewRating['average'],
                    'count' => $reviewRating['total']
                ];
            }

            return response()->json([
                'success' => true,
                'ratings' => $ratings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener calificaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar si el usuario ya calificó un producto
     */
    public function checkUserRating(Request $request): JsonResponse
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            $request->validate([
                'product_id' => 'required|string'
            ]);

            $hasRated = Rating::hasUserRated($user->id, $request->product_id);
            $userRating = null;

            if ($hasRated) {
                $userRating = Rating::getUserRating($user->id, $request->product_id);
            }

            return response()->json([
                'success' => true,
                'has_rated' => $hasRated,
                'user_rating' => $userRating
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al verificar calificación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener calificaciones de múltiples productos
     */
    public function getMultipleProductsRatings(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'product_ids' => 'required|array',
                'product_ids.*' => 'required|string'
            ]);

            $productIds = $request->input('product_ids');
            $ratings = Rating::getMultipleProductsRatings($productIds);

            return response()->json([
                'success' => true,
                'data' => [
                    'ratings' => $ratings
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener calificaciones: ' . $e->getMessage()
            ], 500);
        }
    }
}
