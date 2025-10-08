<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Notification;

class NotificationController extends Controller
{
    /**
     * Get notifications for admin
     */
    public function getAdminNotifications()
    {
        try {
            $notifications = Notification::forAdmin()
                ->with('relatedOrder.user')
                ->orderBy('created_at', 'desc')
                ->take(50)
                ->get();

            $formattedNotifications = $notifications->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'data' => $notification->data,
                    'is_read' => $notification->is_read,
                    'created_at' => $notification->created_at->diffForHumans(),
                    'order' => $notification->relatedOrder ? [
                        'id' => $notification->relatedOrder->id,
                        'number' => str_pad($notification->relatedOrder->id, 8, '0', STR_PAD_LEFT),
                        'customer_name' => $notification->relatedOrder->user ? 
                            $notification->relatedOrder->user->first_name . ' ' . $notification->relatedOrder->user->last_name : 
                            'Usuario eliminado'
                    ] : null
                ];
            });

            return response()->json([
                'success' => true,
                'notifications' => $formattedNotifications,
                'unread_count' => Notification::forAdmin()->unread()->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener notificaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get notifications for specific user
     */
    public function getUserNotifications()
    {
        try {
            $user = Auth::user();
            
            $notifications = Notification::forUser($user->id)
                ->with('relatedOrder')
                ->orderBy('created_at', 'desc')
                ->take(50)
                ->get();

            // Verificar si hay compras pendientes de calificar
            $pendingReviews = $this->getPendingReviewsForUser($user->id);
            
            // Si hay compras pendientes, agregar notificación de calificación
            if ($pendingReviews->count() > 0) {
                $reviewNotification = $this->createReviewNotification($pendingReviews);
                $notifications->prepend($reviewNotification);
            }

            $formattedNotifications = $notifications->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'data' => $notification->data,
                    'is_read' => $notification->is_read,
                    'created_at' => $notification->created_at->diffForHumans(),
                    'order' => $notification->relatedOrder ? [
                        'id' => $notification->relatedOrder->id,
                        'number' => str_pad($notification->relatedOrder->id, 8, '0', STR_PAD_LEFT),
                        'status' => $notification->relatedOrder->status
                    ] : null
                ];
            });

            return response()->json([
                'success' => true,
                'notifications' => $formattedNotifications,
                'unread_count' => Notification::forUser($user->id)->unread()->count() + ($pendingReviews->count() > 0 ? 1 : 0)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener notificaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark notification as read
     */
    public function markAsRead($notificationId)
    {
        try {
            $user = Auth::user();
            
            $notification = Notification::findOrFail($notificationId);
            
            // Verificar que el usuario tenga permiso para marcar esta notificación
            if ($notification->target_user_role === 'admin' && !$user->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para marcar esta notificación'
                ], 403);
            }
            
            if ($notification->target_user_role === 'user' && $notification->target_user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para marcar esta notificación'
                ], 403);
            }

            $notification->markAsRead();

            return response()->json([
                'success' => true,
                'message' => 'Notificación marcada como leída'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al marcar notificación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead()
    {
        try {
            $user = Auth::user();
            
            if ($user->is_admin) {
                Notification::forAdmin()->unread()->update(['is_read' => true]);
            } else {
                Notification::forUser($user->id)->unread()->update(['is_read' => true]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Todas las notificaciones marcadas como leídas'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al marcar notificaciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get unread notifications count
     */
    public function getUnreadCount()
    {
        try {
            $user = Auth::user();
            
            // Verificar si es admin por el campo is_admin
            if ($user->is_admin) {
                $count = Notification::forAdmin()->unread()->count();
            } else {
                $count = Notification::forUser($user->id)->unread()->count();
                
                // Agregar notificación de calificación si hay compras pendientes
                $pendingReviews = $this->getPendingReviewsForUser($user->id);
                if ($pendingReviews->count() > 0) {
                    $count += 1; // Agregar 1 por la notificación de calificación
                }
            }

            return response()->json([
                'success' => true,
                'unread_count' => $count
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener contador: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener compras pendientes de calificar para un usuario
     */
    private function getPendingReviewsForUser($userId)
    {
        try {
            $orders = \App\Models\Order::where('user_id', $userId)
                ->where('status', 'entregado')
                ->with(['items'])
                ->get();

            $pendingOrders = $orders->filter(function ($order) {
                // Verificar si hay productos sin calificar
                return $order->items->some(function ($item) use ($order) {
                    $hasReview = \App\Models\Review::where('user_id', $order->user_id)
                        ->where('product_id', $item->product_id)
                        ->exists();
                    return !$hasReview;
                });
            });

            return $pendingOrders;
        } catch (\Exception $e) {
            return collect();
        }
    }

    /**
     * Crear notificación de calificación
     */
    private function createReviewNotification($pendingOrders)
    {
        $totalOrders = $pendingOrders->count();
        $firstOrder = $pendingOrders->first();
        
        return (object) [
            'id' => 'review_notification_' . $firstOrder->id,
            'type' => 'review_request',
            'title' => '¡Califica tu compra!',
            'message' => "Tienes {$totalOrders} compra" . ($totalOrders > 1 ? 's' : '') . " pendiente" . ($totalOrders > 1 ? 's' : '') . " de calificar. Tu opinión nos ayuda a mejorar.",
            'data' => json_encode([
                'action' => 'review_order',
                'redirect_to' => '/perfil/mis-pedidos',
                'pending_orders' => $pendingOrders->pluck('id')->toArray()
            ]),
            'is_read' => false,
            'created_at' => now(),
            'relatedOrder' => $firstOrder
        ];
    }
}
