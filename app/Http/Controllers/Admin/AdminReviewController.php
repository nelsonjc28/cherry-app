<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Review;
use App\Models\User;

class AdminReviewController extends Controller
{
    /**
     * Get all reviews with filters
     */
    public function index(Request $request)
    {
        try {
            $query = Review::with('user', 'order');
            
            // Apply status filter
            $status = $request->get('status');
            if ($status && in_array($status, ['pending', 'approved', 'rejected'])) {
                if ($status === 'pending') {
                    $query->where('is_approved', null);
                } elseif ($status === 'approved') {
                    $query->where('is_approved', true);
                } elseif ($status === 'rejected') {
                    $query->where('is_approved', false);
                }
            }

            // Apply search filter
            $search = $request->get('search');
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('product_name', 'LIKE', "%{$search}%")
                      ->orWhere('comment', 'LIKE', "%{$search}%")
                      ->orWhereHas('user', function($userQuery) use ($search) {
                          $userQuery->where('first_name', 'LIKE', "%{$search}%")
                                   ->orWhere('last_name', 'LIKE', "%{$search}%");
                      });
                });
            }

            // Apply rating filter
            $rating = $request->get('rating');
            if ($rating && is_numeric($rating) && $rating >= 1 && $rating <= 5) {
                $query->where('rating', $rating);
            }

            // Order by most recent
            $reviews = $query->orderBy('created_at', 'desc')
                           ->paginate(20);

            // Format the response
            $formattedReviews = $reviews->map(function ($review) {
                $status = 'pending';
                if ($review->is_approved === true) {
                    $status = 'approved';
                } elseif ($review->is_approved === false) {
                    $status = 'rejected';
                }

                return [
                    'id' => $review->id,
                    'userName' => $review->user ? $review->user->first_name . ' ' . $review->user->last_name : 'Usuario eliminado',
                    'userEmail' => $review->user ? $review->user->email : 'N/A',
                    'productId' => $review->product_id,
                    'productName' => $review->product_name,
                    'orderId' => $review->order_id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'images' => $review->images ?? [],
                    'date' => $review->created_at->format('Y-m-d'),
                    'status' => $status,
                    'created_at' => $review->created_at->format('d/m/Y H:i'),
                ];
            });

            // Get counts for filters
            $counts = [
                'all' => Review::count(),
                'pending' => Review::whereNull('is_approved')->count(),
                'approved' => Review::where('is_approved', true)->count(),
                'rejected' => Review::where('is_approved', false)->count(),
            ];

            return response()->json([
                'success' => true,
                'reviews' => $formattedReviews,
                'pagination' => [
                    'current_page' => $reviews->currentPage(),
                    'last_page' => $reviews->lastPage(),
                    'per_page' => $reviews->perPage(),
                    'total' => $reviews->total(),
                ],
                'counts' => $counts
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting admin reviews: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las reseñas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve a review
     */
    public function approve($reviewId)
    {
        try {
            $review = Review::findOrFail($reviewId);
            $review->update(['is_approved' => true]);

            Log::info('Review approved', [
                'review_id' => $reviewId,
                'admin_user' => auth('api')->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Reseña aprobada exitosamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error approving review: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al aprobar la reseña: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a review
     */
    public function reject($reviewId)
    {
        try {
            $review = Review::findOrFail($reviewId);
            $review->update(['is_approved' => false]);

            Log::info('Review rejected', [
                'review_id' => $reviewId,
                'admin_user' => auth('api')->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Reseña rechazada exitosamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error rejecting review: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al rechazar la reseña: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a review
     */
    public function destroy($reviewId)
    {
        try {
            $review = Review::findOrFail($reviewId);
            $review->delete();

            Log::info('Review deleted', [
                'review_id' => $reviewId,
                'admin_user' => auth('api')->id()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Reseña eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting review: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la reseña: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get review statistics
     */
    public function getStats()
    {
        try {
            $stats = [
                'total_reviews' => Review::count(),
                'pending_reviews' => Review::whereNull('is_approved')->count(),
                'approved_reviews' => Review::where('is_approved', true)->count(),
                'rejected_reviews' => Review::where('is_approved', false)->count(),
                'average_rating' => Review::where('is_approved', true)->avg('rating') ?? 0,
                'ratings_distribution' => [
                    5 => Review::where('is_approved', true)->where('rating', 5)->count(),
                    4 => Review::where('is_approved', true)->where('rating', 4)->count(),
                    3 => Review::where('is_approved', true)->where('rating', 3)->count(),
                    2 => Review::where('is_approved', true)->where('rating', 2)->count(),
                    1 => Review::where('is_approved', true)->where('rating', 1)->count(),
                ]
            ];

            return response()->json([
                'success' => true,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting review stats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }
}
