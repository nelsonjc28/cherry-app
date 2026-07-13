<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\VendorBuyer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Endpoints accesibles por un vendedor autenticado para consultar las órdenes
 * de SUS compradores asociados. La tabla orders queda vacía por ahora
 * (requisito #1), pero el módulo queda funcional.
 */
class OrderController extends Controller
{
    /**
     * GET /api/vendor/orders
     * Lista órdenes de los compradores asociados al vendedor.
     * Filtros opcionales:
     *   - status=pendiente_pago|pagado|...
     *   - buyer_id=id     sólo órdenes de un comprador específico
     *   - per_page=20
     */
    public function index(Request $request)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            // IDs de compradores activamente asociados al vendor
            $buyerIds = $vendor->buyers()
                ->wherePivot('is_active', true)
                ->pluck('users.id')
                ->all();

            if (empty($buyerIds)) {
                return response()->json([
                    'success' => true,
                    'orders' => [],
                    'pagination' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => (int) $request->input('per_page', 20),
                        'total' => 0,
                    ],
                ]);
            }

            // Filtro dinámico: aunque el id esté en buyerIds, si el cliente ya no es
            // oro/diamante, lo excluimos (requisito #4).
            $query = Order::with(['user', 'items', 'address'])
                ->whereIn('user_id', $buyerIds)
                ->whereHas('user', function ($q) {
                    $q->whereIn('seller_category', VendorBuyer::ALLOWED_BUYER_CATEGORIES);
                });

            if ($buyerId = $request->query('buyer_id')) {
                $query->where('user_id', $buyerId);
            }

            if ($status = $request->query('status')) {
                $query->where('status', $status);
            }

            $perPage = (int) $request->input('per_page', 20);
            $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

            $formatted = collect($orders->items())->map(function (Order $order) {
                return [
                    'id' => $order->id,
                    'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'date' => $order->created_at->format('d/m/Y H:i'),
                    'status' => $order->status,
                    'payment_method' => $order->payment_method,
                    'total_amount' => (float) $order->total_amount,
                    'subtotal' => (float) ($order->subtotal ?? 0),
                    'discounted_total' => (float) ($order->discounted_total ?? 0),
                    'shipping_amount' => (float) ($order->shipping_amount ?? 0),
                    'buyer' => $order->user ? [
                        'id' => $order->user->id,
                        'name' => trim(($order->user->first_name ?? '') . ' ' . ($order->user->last_name ?? '')),
                        'seller_category' => $order->user->seller_category,
                    ] : null,
                    'items_count' => $order->items->count(),
                ];
            });

            return response()->json([
                'success' => true,
                'orders' => $formatted,
                'pagination' => [
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                    'per_page' => $orders->perPage(),
                    'total' => $orders->total(),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener órdenes: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/vendor/orders/{id}
     * Muestra el detalle de una orden, validando que pertenezca a un comprador del vendor.
     */
    public function show($id)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            $order = Order::with(['user', 'items.producto', 'address'])->find($id);
            if (! $order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada',
                ], 404);
            }

            $isMine = $vendor->buyers()
                ->wherePivot('is_active', true)
                ->where('users.id', $order->user_id)
                ->exists();

            if (! $isMine) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permiso para ver esta orden',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'order' => $order,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener orden: ' . $e->getMessage(),
            ], 500);
        }
    }
}