<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
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

            // Crear la reseña (pendiente de aprobación por defecto)
            $review = Review::create([
                'user_id' => $user->id,
                'order_id' => $orderId,
                'product_id' => $productId,
                'product_name' => $orderItem->name,
                'rating' => $request->rating,
                'comment' => $request->comment,
                'images' => $imageUrls,
                'is_approved' => null // Pendiente de aprobación
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
            Log::info('canReview called', [
                'order_id' => $orderId,
                'product_id' => $productId,
                'user_id' => Auth::id()
            ]);

            $user = Auth::user();
            
            if (!$user) {
                Log::error('User not authenticated in canReview');
                return response()->json([
                    'success' => false,
                    'can_review' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Verificar que la orden pertenece al usuario (temporalmente sin verificar estado)
            $order = Order::where('id', $orderId)
                          ->where('user_id', $user->id)
                          ->first();
                          
            Log::info('Order search result', [
                'order_found' => $order ? true : false,
                'order_id' => $orderId,
                'user_id' => $user->id
            ]);

            if (!$order) {
                Log::warning('Order not found', [
                    'order_id' => $orderId,
                    'user_id' => $user->id
                ]);
                
                return response()->json([
                    'success' => false,
                    'can_review' => false,
                    'message' => 'Orden no encontrada o no autorizada'
                ]);
            }
            
            Log::info('Order found', [
                'order_id' => $order->id,
                'order_status' => $order->status,
                'user_id' => $order->user_id
            ]);

            // Verificar que el producto está en la orden
            $orderItem = OrderItem::where('order_id', $orderId)
                                  ->where('product_id', $productId)
                                  ->first();
                                  
            Log::info('OrderItem search result', [
                'order_item_found' => $orderItem ? true : false,
                'order_id' => $orderId,
                'product_id' => $productId,
                'order_item_product_id' => $orderItem ? $orderItem->product_id : null
            ]);

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

            $imageUrl = $this->getProductImageUrl($orderItem->product_id);
            
            // Debug: Log para ver la URL de la imagen generada
            Log::info('Review product image URL', [
                'product_id_param' => $productId,
                'order_item_product_id' => $orderItem->product_id,
                'image_url' => $imageUrl,
                'order_item_name' => $orderItem->name
            ]);

            // Buscar información adicional del producto en el catálogo
            $catalogProduct = \App\Models\CatalogProduct::where('external_product_id', $orderItem->product_id)->first();
            
            return response()->json([
                'success' => true,
                'can_review' => !$existingReview,
                'message' => $existingReview ? 'Ya has escrito una reseña para este producto' : 'Puedes escribir una reseña',
                'product' => [
                    'id' => $orderItem->product_id,
                    'title' => $orderItem->name,
                    'image' => $imageUrl,
                    'price' => (float) $orderItem->price,
                    'quantity' => (int) $orderItem->quantity,
                    'subtotal' => (float) $orderItem->subtotal,
                    'description' => $catalogProduct ? $catalogProduct->product_description : null,
                    'category' => $catalogProduct ? $catalogProduct->product_category : null,
                    'metadata' => $catalogProduct ? $catalogProduct->product_metadata : null
                ],
                'order' => [
                    'id' => $order->id,
                    'order_number' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'date' => $order->created_at->format('d/m/Y'),
                    'status' => $order->status
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in canReview method', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'order_id' => $orderId,
                'product_id' => $productId
            ]);
            
            return response()->json([
                'success' => false,
                'can_review' => false,
                'message' => 'Error al verificar permisos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get product image URL based on product ID
     * Tries both formatted and original ID formats to find the correct image
     */
    private function getProductImageUrl($productId)
    {
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }
        
        // Convertir a string para manejar correctamente
        $productIdStr = (string) $productId;
        
        // Si el ID ya tiene 11 dígitos (como 07512592401), usarlo directamente
        if (strlen($productIdStr) === 11) {
            $directUrl = "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
            
            Log::info('Using direct product image URL (11 digits)', [
                'product_id' => $productId,
                'product_id_str' => $productIdStr,
                'image_url' => $directUrl
            ]);
            
            return $directUrl;
        }
        
        // Si es un ID corto, probar primero con el ID original
        $originalUrl = "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
        
        // Verificar rápidamente si la imagen original existe
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $originalUrl);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Si la imagen original existe, usarla
        if ($httpCode === 200) {
            Log::info('Using original product image URL', [
                'product_id' => $productId,
                'image_url' => $originalUrl
            ]);
            return $originalUrl;
        }
        
        // Si no existe, probar con formato con ceros a la izquierda (solo para IDs cortos)
        $formattedId = str_pad($productIdStr, 11, '0', STR_PAD_LEFT);
        $formattedUrl = "https://cherry-fotos.s3.amazonaws.com/shopify/{$formattedId}/{$formattedId}_1.jpg";
        
        // Verificar si la imagen formateada existe
        $ch2 = curl_init();
        curl_setopt($ch2, CURLOPT_URL, $formattedUrl);
        curl_setopt($ch2, CURLOPT_NOBODY, true);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
        
        curl_exec($ch2);
        $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);
        
        // Si la imagen formateada existe, usarla
        if ($httpCode2 === 200) {
            Log::info('Using formatted product image URL', [
                'product_id' => $productId,
                'formatted_id' => $formattedId,
                'image_url' => $formattedUrl
            ]);
            return $formattedUrl;
        }
        
        // Si ninguna existe, devolver la original (será manejada por el fallback del frontend)
        Log::info('No product image found, using fallback', [
            'product_id' => $productId,
            'original_url' => $originalUrl,
            'formatted_url' => $formattedUrl
        ]);
        return $originalUrl;
    }
}
