<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use App\Models\Review;
use App\Models\Order;
use App\Models\OrderItem;

class ReviewController extends Controller
{
    /**
     * Store a new review
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|integer|exists:orders,id',
            'product_id' => 'required|integer',
            'rating' => 'required|integer|between:1,5',
            'comment' => 'nullable|string|max:1000',
            'images.*' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();
            $orderId = $request->order_id;
            $productId = $request->product_id;

            // Verificar que la orden pertenece al usuario
            $order = Order::where('id', $orderId)
                          ->where('user_id', $user->id)
                          ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada o no autorizada'
                ], 404);
            }

            // Verificar que el producto está en la orden
            $orderItem = OrderItem::where('order_id', $orderId)
                                  ->where('product_id', $productId)
                                  ->first();

            if (!$orderItem) {
                return response()->json([
                    'success' => false,
                    'message' => 'Producto no encontrado en esta orden'
                ], 404);
            }

            // Verificar que la orden está entregada
            if ($order->status !== 'entregado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo puedes escribir reseñas de productos entregados'
                ], 400);
            }

            // Verificar si ya existe una reseña para este producto en esta orden
            $existingReview = Review::where('user_id', $user->id)
                                   ->where('order_id', $orderId)
                                   ->where('product_id', $productId)
                                   ->first();

            if ($existingReview) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya has escrito una reseña para este producto'
                ], 400);
            }

            // Procesar imágenes si las hay
            $imageUrls = [];
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    $filename = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
                    $path = $image->storeAs('reviews', $filename, 'public');
                    $imageUrls[] = Storage::url($path);
                }
            }

            // Crear la reseña
            $review = Review::create([
                'user_id' => $user->id,
                'order_id' => $orderId,
                'product_id' => $productId,
                'product_name' => $orderItem->name,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'images' => $imageUrls
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Reseña creada exitosamente',
                'review' => [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'images' => $review->images,
                    'created_at' => $review->created_at->format('d/m/Y')
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la reseña: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get reviews for a specific product
     */
    public function getProductReviews($productId)
    {
        try {
            $reviews = Review::forProduct($productId)
                            ->approved()
                            ->with('user')
                            ->orderBy('created_at', 'desc')
                            ->get();

            $formattedReviews = $reviews->map(function ($review) {
                return [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'images' => $review->images,
                    'created_at' => $review->created_at->format('d/m/Y'),
                    'user' => [
                        'name' => $review->user->first_name . ' ' . substr($review->user->last_name, 0, 1) . '.',
                        'avatar' => null // Implementar si se necesita
                    ]
                ];
            });

            $ratingStats = Review::getRatingDistribution($productId);

            return response()->json([
                'success' => true,
                'reviews' => $formattedReviews,
                'stats' => $ratingStats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener reseñas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's reviews
     */
    public function getUserReviews()
    {
        try {
            $user = Auth::user();
            
            $reviews = Review::where('user_id', $user->id)
                            ->with('order')
                            ->orderBy('created_at', 'desc')
                            ->get();

            $formattedReviews = $reviews->map(function ($review) {
                return [
                    'id' => $review->id,
                    'product_id' => $review->product_id,
                    'product_name' => $review->product_name,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'images' => $review->images,
                    'created_at' => $review->created_at->format('d/m/Y'),
                    'order' => [
                        'id' => $review->order->id,
                        'number' => str_pad($review->order->id, 8, '0', STR_PAD_LEFT)
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'reviews' => $formattedReviews
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener tus reseñas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check if user can review a specific product from an order
     */
    public function canReview($orderId, $productId)
    {
        try {
            $user = Auth::user();

            // Verificar que la orden pertenece al usuario y está entregada
            $order = Order::where('id', $orderId)
                          ->where('user_id', $user->id)
                          ->where('status', 'entregado')
                          ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'can_review' => false,
                    'message' => 'Orden no encontrada, no autorizada o no entregada'
                ]);
            }

            // Verificar que el producto está en la orden
            $orderItem = OrderItem::where('order_id', $orderId)
                                  ->where('product_id', $productId)
                                  ->first();

            if (!$orderItem) {
                return response()->json([
                    'success' => false,
                    'can_review' => false,
                    'message' => 'Producto no encontrado en esta orden'
                ]);
            }

            // Verificar si ya existe una reseña
            $existingReview = Review::where('user_id', $user->id)
                                   ->where('order_id', $orderId)
                                   ->where('product_id', $productId)
                                   ->first();

            return response()->json([
                'success' => true,
                'can_review' => !$existingReview,
                'message' => $existingReview ? 'Ya has escrito una reseña para este producto' : 'Puedes escribir una reseña',
                'product' => [
                    'id' => $productId,
                    'name' => $orderItem->name
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'can_review' => false,
                'message' => 'Error al verificar permisos: ' . $e->getMessage()
            ], 500);
        }
    }
}
