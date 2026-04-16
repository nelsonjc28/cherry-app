<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Detalle;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Producto;
use App\Models\User;
use App\Models\Notification;
use App\Services\UserSellerCategoryActivityService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AdminOrderController extends Controller
{
    /** @var array<string, Producto|null> */
    private array $orderItemProductCache = [];
    /** @var array<string, float> */
    private array $productStockCache = [];

    /**
     * Get all orders for admin dashboard
     */
    public function index()
    {
        try {
            $orders = Order::with(['user', 'items', 'address'])
                ->orderBy('created_at', 'desc')
                ->get();

            $formattedOrders = $orders->map(function ($order) {
                // Calcular costo de envío
                $paymentData = is_array($order->payment_data) ? $order->payment_data : (is_string($order->payment_data) ? json_decode($order->payment_data, true) : []);
                $deliveryType = $paymentData['delivery_type'] ?? 'envio';
                
                // Subtotal bruto de líneas (catálogo); el total cobrado está en total_amount (neto con descuentos).
                $subtotalProducts = $order->items->sum('subtotal');
                $storedOrderTotal = (float) $order->total_amount;

                // Obtener costo de envío desde el campo dedicado o desde payment_data (fallback para órdenes antiguas)
                $shippingCost = 0;
                if ($order->shipping_amount !== null) {
                    $shippingCost = (float) $order->shipping_amount;
                } elseif (isset($paymentData['shipping_amount'])) {
                    $shippingCost = (float) $paymentData['shipping_amount'];
                } else {
                    // Inferir envío solo cuando total > suma de líneas (órdenes sin descuento global en ítems)
                    if ($storedOrderTotal > $subtotalProducts) {
                        $shippingCost = $storedOrderTotal - $subtotalProducts;
                    }
                }

                // Si es retiro en tienda, el costo de envío es 0
                if ($deliveryType === 'retiro') {
                    $shippingCost = 0;
                }

                // Listado: mostrar el total registrado en la orden (coherente con split crédito/MP y descuentos)
                $totalAmount = $storedOrderTotal;
                
                return [
                    'id' => $order->id,
                    'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'date' => $order->created_at->format('d \d\e F Y'),
                    'status' => $order->status,
                    'statusDisplay' => $this->mapOrderStatus($order->status),
                    'totalAmount' => (float) $totalAmount,
                    'shipping_cost' => (float) $shippingCost,
                    'paymentMethod' => ucfirst($order->payment_method),
                    'paymentId' => $order->mercadopago_payment_id,
                    'customerName' => $order->user ? $order->user->first_name . ' ' . $order->user->last_name : 'Usuario eliminado',
                    'customerEmail' => $order->user ? $order->user->email : 'N/A',
                    'customerPhone' => $order->user ? $order->user->phone : null,
                    'customerFirstName' => $order->user ? $order->user->first_name : null,
                    'customerLastName' => $order->user ? $order->user->last_name : null,
                    'customerMiddleName' => $order->user ? $order->user->middle_name : null,
                    'created_at' => $order->created_at->toISOString(),
                    'shipping_method_label' => $order->shipping_method_label,
                    'address_id' => $order->address_id,
                    // Listado rápido: no enriquecer con consultas extra (se hace en show)
                    'items' => $order->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'title' => $item->name ?? 'Producto',
                            'quantity' => (int) $item->quantity,
                            'price' => (float) $item->price,
                            'subtotal' => (float) $item->subtotal,
                            'image' => $this->getProductImageUrl($item->product_id),
                        ];
                    }),
                    'address' => $order->address ? [
                        'street_address' => $order->address->street_address,
                        'street_number_ext' => $order->address->street_number_ext,
                        'street_number_int' => $order->address->street_number_int,
                        'city' => $order->address->city,
                        'municipality' => $order->address->municipality,
                        'colonia' => $order->address->colonia,
                        'state' => $order->address->state,
                        'postal_code' => $order->address->postal_code,
                        'country' => $order->address->country,
                        'additional_info' => $order->address->additional_info,
                        'full_address' => $order->address->admin_formatted_address,
                    ] : null,
                    'credit_used' => (float) ($order->credit_used ?? 0),
                    'amount_paid' => (float) ($order->amount_paid ?? $order->total_amount),
                    'amount_pending' => (float) ($order->amount_pending ?? 0),
                    'paid_with_credit' => (bool) ($order->paid_with_credit ?? false),
                    'is_advance_order' => (bool) ($order->is_advance_order ?? false),
                    'is_prepared' => (bool) ($order->is_prepared ?? false),
                    'tracking_number' => $order->tracking_number ?? null
                ];
            });

            return response()->json([
                'success' => true,
                'orders' => $formattedOrders
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las órdenes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update order status
     */
    public function updateStatus(Request $request, $orderId)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:pending,pagado,en_espera_envio,enviado,cancelled,failed'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = Order::with('user')->findOrFail($orderId);
            $oldStatus = $order->status;
            $newStatus = $request->status;

            // Actualizar el estado
            $order->status = $newStatus;
            
            // Si el estado es enviado, notificar al cliente que puede calificar
            if ($newStatus === 'enviado') {
                // El cliente ahora puede calificar los productos
                $this->notifyCustomerCanRate($order);
            }

            $order->save();

            // Notificar al cliente sobre el cambio de estado
            $this->notifyCustomerStatusChange($order, $oldStatus, $newStatus);

            if ($newStatus === 'pagado' && $oldStatus !== 'pagado' && $order->user) {
                try {
                    app(UserSellerCategoryActivityService::class)->recordSuccessfulPurchase($order->user, (float) ($order->subtotal ?? $order->total_amount));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('Vigencia categoría: error tras marcar pagado (admin)', [
                        'order_id' => $order->id,
                        'user_id' => $order->user_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Si el estado es 'pagado', notificar al admin
            if ($newStatus === 'pagado') {
                $this->notifyAdminPaymentReceived($order);
                
                // Los pedidos anticipados ya se envían inmediatamente al crearse
                // Solo verificar si es otro tipo de pedido que necesita enviarse cuando se marca como pagado
                if ($oldStatus !== 'pagado' && !$order->is_advance_order) {
                    try {
                        // Verificar si ya se envió antes de enviar
                        $paymentData = $order->payment_data ?? [];
                        if (is_string($paymentData)) {
                            $paymentData = json_decode($paymentData, true) ?? [];
                        }
                        
                        $alreadySent = isset($paymentData['external_api_sent']) && $paymentData['external_api_sent'] === true;
                        
                        if (!$alreadySent) {
                            $externalSalesService = app(\App\Services\ExternalSalesService::class);
                            $externalSalesService->sendSaleToExternalApi($order);
                            
                            // Marcar que ya se envió
                            $paymentData['external_api_sent'] = true;
                            $paymentData['external_api_sent_at'] = now()->toIso8601String();
                            $order->update(['payment_data' => json_encode($paymentData)]);
                            
                            \Illuminate\Support\Facades\Log::info('Pedido enviado a API externa desde AdminOrderController', [
                                'order_id' => $order->id,
                                'is_advance_order' => $order->is_advance_order
                            ]);
                        } else {
                            \Illuminate\Support\Facades\Log::info('Pedido ya fue enviado a API externa anteriormente, omitiendo duplicado', [
                                'order_id' => $order->id
                            ]);
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error('Error al enviar pedido a API externa', [
                            'order_id' => $order->id,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                        // No lanzar excepción para no bloquear la actualización del estado
                    }
                } elseif ($order->is_advance_order) {
                    \Illuminate\Support\Facades\Log::info('Pedido anticipado marcado como pagado - ya fue enviado al crearse', [
                        'order_id' => $order->id
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Estado de la orden actualizado correctamente',
                'statusDisplay' => $this->mapOrderStatus($newStatus),
                'order' => [
                    'id' => $order->id,
                    'status' => $newStatus,
                    'statusDisplay' => $this->mapOrderStatus($newStatus)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific order details
     */
    public function show($orderId)
    {
        try {
            $order = Order::with(['user', 'items', 'address'])->findOrFail($orderId);

            // Calcular costo de envío
            $paymentData = is_array($order->payment_data) ? $order->payment_data : (is_string($order->payment_data) ? json_decode($order->payment_data, true) : []);
            $deliveryType = $paymentData['delivery_type'] ?? 'envio';
            
            // Calcular subtotal de productos
            $subtotalProducts = $order->items->sum('subtotal');
            
            // Obtener el total_amount de la orden (ya incluye descuentos aplicados desde el frontend)
            $totalAmount = (float) $order->total_amount;
            
            // Obtener costo de envío desde el campo dedicado o desde payment_data (fallback para órdenes antiguas)
            $shippingCost = 0;
            if ($order->shipping_amount !== null) {
                $shippingCost = (float) $order->shipping_amount;
            } elseif (isset($paymentData['shipping_amount'])) {
                $shippingCost = (float) $paymentData['shipping_amount'];
            } else {
                // Calcular como diferencia entre total_amount y subtotal de productos (solo si no hay campo)
                if ($totalAmount > $subtotalProducts) {
                    $shippingCost = $totalAmount - $subtotalProducts;
                }
            }
            
            // Si es retiro en tienda, el costo de envío es 0
            if ($deliveryType === 'retiro') {
                $shippingCost = 0;
            }

            $formattedOrder = [
                'id' => $order->id,
                'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                'date' => $order->created_at->format('d \d\e F Y'),
                'status' => $order->status,
                'statusDisplay' => $this->mapOrderStatus($order->status),
                'totalAmount' => $totalAmount,
                'shipping_cost' => (float) $shippingCost,
                'paymentMethod' => ucfirst($order->payment_method),
                'paymentId' => $order->mercadopago_payment_id,
                'customerName' => $order->user ? $order->user->first_name . ' ' . $order->user->last_name : 'Usuario eliminado',
                'customerEmail' => $order->user ? $order->user->email : 'N/A',
                'customerPhone' => $order->user ? $order->user->phone : null,
                'customerFirstName' => $order->user ? $order->user->first_name : null,
                'customerLastName' => $order->user ? $order->user->last_name : null,
                'customerMiddleName' => $order->user ? $order->user->middle_name : null,
                'created_at' => $order->created_at->toISOString(),
                'shipping_method_label' => $order->shipping_method_label,
                'address_id' => $order->address_id,
                'items' => $order->items->map(fn ($item) => $this->formatOrderItemForAdmin($item)),
                'address' => $order->address ? [
                    'street_address' => $order->address->street_address,
                    'street_number_ext' => $order->address->street_number_ext,
                    'street_number_int' => $order->address->street_number_int,
                    'city' => $order->address->city,
                    'municipality' => $order->address->municipality,
                    'colonia' => $order->address->colonia,
                    'state' => $order->address->state,
                    'postal_code' => $order->address->postal_code,
                    'country' => $order->address->country,
                    'additional_info' => $order->address->additional_info,
                    'full_address' => $order->address->admin_formatted_address,
                ] : null,
                'credit_used' => (float) ($order->credit_used ?? 0),
                'amount_paid' => (float) ($order->amount_paid ?? $order->total_amount),
                'amount_pending' => (float) ($order->amount_pending ?? 0),
                'paid_with_credit' => (bool) ($order->paid_with_credit ?? false),
                'is_advance_order' => (bool) ($order->is_advance_order ?? false),
                'is_prepared' => (bool) ($order->is_prepared ?? false),
                'tracking_number' => $order->tracking_number ?? null,
            ];

            return response()->json([
                'success' => true,
                'order' => $formattedOrder
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la orden: ' . $e->getMessage()
            ], 404);
        }
    }

    /**
     * Map order status to display text
     */
    private function mapOrderStatus($status)
    {
        $statusMap = [
            'pending' => 'Pendiente',
            'processing' => 'Procesando',
            'shipped' => 'En vía',
            'delivered' => 'Entregado',
            'cancelled' => 'Cancelado',
            'failed' => 'Fallido',
            'pagado' => 'Pagado',
            'en_espera_envio' => 'En espera de envío',
            'enviado' => 'Enviado',
        ];

        return $statusMap[$status] ?? ucfirst($status);
    }

    /**
     * Get product image URL based on product ID
     * Uses the same logic as frontend productImageUtils.js
     * Simply constructs the URL without HTTP verification (let browser handle fallback)
     */
    private function getProductImageUrl($productId)
    {
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }
        
        // Convertir a string para manejar correctamente
        $productIdStr = (string) $productId;
        
        // Construir URL directamente como en el frontend
        // El frontend usa: https://cherry-fotos.s3.amazonaws.com/shopify/${externalProductId}/${externalProductId}_1.jpg
        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
    }

    private function formatOrderItemForAdmin(OrderItem $item): array
    {
        $product = $this->findProductForOrderItem($item);
        $stockTotal = $this->resolveProductStockTotal($item, $product);

        $originalPrice = $product ? (float) ($product->precio1 ?? 0) : null;
        $finalUnitPrice = (float) $item->price;
        $discountAmount = 0.0;
        $discountPercentage = 0;
        $hasDiscount = false;

        if ($originalPrice !== null && $originalPrice > 0 && $originalPrice > $finalUnitPrice) {
            $hasDiscount = true;
            $discountAmount = round($originalPrice - $finalUnitPrice, 2);
            $discountPercentage = (int) round((($originalPrice - $finalUnitPrice) / $originalPrice) * 100);
        }

        return [
            'id' => $item->id,
            'product_id' => $item->product_id,
            'detalle_id' => $item->detalle_id,
            'title' => $item->name ?? 'Producto',
            'quantity' => (int) $item->quantity,
            'price' => $finalUnitPrice,
            'final_unit_price' => $finalUnitPrice,
            'original_price' => $originalPrice,
            'discount_amount' => $discountAmount,
            'has_discount' => $hasDiscount,
            'discount_percentage' => $hasDiscount ? $discountPercentage : 0,
            'subtotal' => (float) $item->subtotal,
            'image' => $this->getProductImageUrl($item->product_id),
            'size' => $item->size,
            'color' => $item->color,
            'barcode' => $item->barcode,
            'stock_total' => $stockTotal,
            'desc_promo' => $product ? $product->desc_promo : null,
            'opc_nuevo' => $product ? $product->opc_nuevo : null,
            'fecha_alta' => $product && $product->fecha_alta
                ? Carbon::parse($product->fecha_alta)->toDateString()
                : null,
            'product_labels' => $this->buildProductLabelsForOrderItem($product, $stockTotal),
        ];
    }

    private function findProductForOrderItem(OrderItem $item): ?Producto
    {
        $cacheKey = (string) $item->product_id . '|' . (string) ($item->detalle_id ?? '');
        if (array_key_exists($cacheKey, $this->orderItemProductCache)) {
            return $this->orderItemProductCache[$cacheKey];
        }

        // Fast path: detalle_id persistido en la línea
        if (! empty($item->detalle_id)) {
            $detalleById = Detalle::find($item->detalle_id);
            if ($detalleById && ! empty($detalleById->producto_id)) {
                $productByDetalle = Producto::find((string) $detalleById->producto_id);
                if ($productByDetalle) {
                    $this->orderItemProductCache[$cacheKey] = $productByDetalle;
                    return $productByDetalle;
                }
            }
        }

        $product = null;
        $shopifyId = (string) $item->product_id;
        $detalle = Detalle::where('idShopify', $shopifyId)->first();

        if (! $detalle) {
            $detalle = Detalle::whereRaw('CAST(idShopify AS CHAR) = ?', [$shopifyId])->first();
        }
        if (! $detalle) {
            $detalle = Detalle::where('idShopify', 'LIKE', "%{$shopifyId}%")->first();
        }
        if ($detalle && $detalle->producto_id) {
            $product = Producto::find($detalle->producto_id);
        }

        if (! $product) {
            $product = Producto::find((string) $item->product_id);
            if (! $product) {
                $product = Producto::find('0' . (string) $item->product_id);
            }
            if (! $product) {
                $product = Producto::find(str_pad((string) $item->product_id, 6, '0', STR_PAD_LEFT));
            }
            if (! $product) {
                $product = Producto::where('id', 'LIKE', '%' . $item->product_id . '%')->first();
            }
        }

        $this->orderItemProductCache[$cacheKey] = $product;
        return $product;
    }

    private function resolveProductStockTotal(OrderItem $item, ?Producto $product): float
    {
        if ($product) {
            $productCacheKey = (string) $product->id;
            if (array_key_exists($productCacheKey, $this->productStockCache)) {
                return $this->productStockCache[$productCacheKey];
            }

            $sumDetalles = (float) Detalle::where('producto_id', $product->id)->sum('inventario_d');
            if ($sumDetalles > 0.00001) {
                $stock = round($sumDetalles, 2);
                $this->productStockCache[$productCacheKey] = $stock;
                return $stock;
            }

            $stock = round((float) ($product->inventario ?? 0), 2);
            $this->productStockCache[$productCacheKey] = $stock;
            return $stock;
        }

        if (! empty($item->detalle_id)) {
            $detalle = Detalle::find($item->detalle_id);
            if ($detalle) {
                return round((float) ($detalle->inventario_d ?? 0), 2);
            }
        }

        return 0.0;
    }

    private function buildProductLabelsForOrderItem(?Producto $product, float $stockTotal): array
    {
        $labels = [];
        $descPromoRaw = $product?->desc_promo;
        $hasRebaja = $descPromoRaw !== null
            && $descPromoRaw !== ''
            && (float) $descPromoRaw > 0.0001;

        if ($hasRebaja) {
            $labels[] = 'REBAJA';
        }

        $fechaAlta = $product?->fecha_alta ? Carbon::parse($product->fecha_alta) : null;
        $isNuevo = (($product?->opc_nuevo ?? 'N') === 'S')
            || ($fechaAlta && $fechaAlta->greaterThanOrEqualTo(now()->subDays(30)));
        if ($isNuevo) {
            $labels[] = 'NUEVO';
        }

        $isProximamente = ! $hasRebaja && ($fechaAlta === null || $stockTotal <= 0.0001);
        if ($isProximamente) {
            $labels[] = 'PRÓXIMAMENTE';
        }

        return $labels;
    }

    /**
     * Notify customer about status change
     */
    private function notifyCustomerStatusChange($order, $oldStatus, $newStatus)
    {
        try {
            // Crear notificación en la base de datos
            Notification::createOrderStatusNotification($order, $oldStatus, $newStatus);
            
            // TODO: Implementar sistema de notificaciones por email/SMS
            // Por ahora solo logging
            
            if ($newStatus === 'en_espera_envio') {
                // Notificar al cliente que su pedido está en espera de envío
            } elseif ($newStatus === 'enviado') {
                // Notificar al cliente que su pedido ha sido enviado
                // Habilitar opción para marcar como recibido
            }
        } catch (\Exception $e) {
            // Error silencioso
        }
    }

    /**
     * Notify admin about new payment
     */
    private function notifyAdminPaymentReceived($order)
    {
        // TODO: Implementar notificación al admin
        // Por ahora solo logging
    }

    /**
     * Notify customer that they can rate their order
     */
    private function notifyCustomerCanRate($order)
    {
        try {
            // Crear notificación para el cliente
            $order->user->notifications()->create([
                'title' => '¡Tu pedido ha sido enviado!',
                'message' => 'Tu pedido #' . $order->id . ' ha sido enviado. Ahora puedes calificar y comentar sobre los productos.',
                'type' => 'order_shipped',
                'data' => [
                    'order_id' => $order->id,
                    'can_rate' => true
                ]
            ]);
        } catch (\Exception $e) {
            // Error silencioso
        }
    }

    /**
     * Mark credit order as paid and restore credit balance
     */
    public function markCreditOrderAsPaid(Request $request, $orderId)
    {
        try {
            // Verificar que el usuario autenticado no sea operador
            $authUser = auth()->user();
            if ($authUser && $authUser->isOperator()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Los operadores no tienen permiso para aprobar pagos'
                ], 403);
            }

            $order = Order::with('user')->findOrFail($orderId);
            
            // Verificar que la orden sea pagada con crédito O sea un pedido anticipado
            $isAdvanceOrder = (bool) ($order->is_advance_order ?? false);
            $isCreditOrder = (bool) ($order->paid_with_credit ?? false);
            
            if (!$isCreditOrder && !$isAdvanceOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden no es un pedido con crédito ni un pedido anticipado'
                ], 400);
            }
            
            // Verificar que tenga crédito usado (solo para pedidos con crédito)
            $creditUsed = (float) ($order->credit_used ?? 0);
            if ($isCreditOrder && $creditUsed <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden no tiene crédito usado'
                ], 400);
            }
            
            // Verificar que el usuario existe y tiene categoría oro
            $user = $order->user;
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }
            
            if (!in_array($user->seller_category, ['oro', 'diamante'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'El usuario no tiene categoría oro o diamante'
                ], 400);
            }
            
            // Para pedidos anticipados, usar el total_amount como crédito usado si no hay credit_used
            if ($isAdvanceOrder && $creditUsed <= 0) {
                $creditUsed = (float) $order->total_amount;
            }
            
            // Permitir restaurar crédito incluso si la orden ya está marcada como pagada
            // Esto es útil si el crédito no se restauró correctamente antes
            // Solo verificar que realmente haya crédito usado
            if ($creditUsed <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden no tiene crédito usado para restaurar'
                ], 400);
            }

            $previousOrderStatus = $order->status;
            
            \Illuminate\Support\Facades\DB::beginTransaction();
            
            try {
                // Restaurar el crédito usado al crédito disponible del usuario
                $currentCreditBalance = (float) ($user->credit_balance ?? 0);
                $newCreditBalance = $currentCreditBalance + $creditUsed;
                
                // No permitir que el crédito disponible exceda el límite
                $creditLimit = (float) ($user->credit_limit ?? 0);
                $newCreditBalance = min($newCreditBalance, $creditLimit);
                
                $user->credit_balance = $newCreditBalance;
                $user->save();
                
                // Actualizar la orden: marcar como pagada completamente solo si no lo está ya
                if ($order->status !== 'pagado') {
                    $order->status = 'pagado';
                }
                $order->amount_paid = $order->total_amount;
                $order->amount_pending = 0;
                $order->credit_used = 0; // Establecer crédito usado en 0 cuando se marca como pagada
                $order->save();
                
                \Illuminate\Support\Facades\DB::commit();

                if ($previousOrderStatus !== 'pagado' && $order->status === 'pagado') {
                    try {
                        app(UserSellerCategoryActivityService::class)->recordSuccessfulPurchase($user, (float) ($order->subtotal ?? $order->total_amount));
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::error('Vigencia categoría: error tras markCreditOrderAsPaid', [
                            'order_id' => $order->id,
                            'user_id' => $user->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
                
                // Log de la operación
                \Illuminate\Support\Facades\Log::info('Orden a crédito marcada como pagada y crédito restaurado', [
                    'order_id' => $order->id,
                    'user_id' => $user->id,
                    'credit_used' => $creditUsed,
                    'credit_balance_before' => $currentCreditBalance,
                    'credit_balance_after' => $newCreditBalance,
                    'credit_limit' => $creditLimit
                ]);
                
                // Notificar al cliente sobre el cambio de estado
                $oldStatus = $order->getOriginal('status') ?? $order->status;
                $this->notifyCustomerStatusChange($order, $oldStatus, 'pagado');
                
                // Intentar enviar a API externa si no se ha enviado antes
                try {
                    $paymentData = $order->payment_data ?? [];
                    if (is_string($paymentData)) {
                        $paymentData = json_decode($paymentData, true) ?? [];
                    }
                    
                    $alreadySent = isset($paymentData['external_api_sent']) && $paymentData['external_api_sent'] === true;
                    
                    if (!$alreadySent) {
                        $externalSalesService = app(\App\Services\ExternalSalesService::class);
                        $externalSalesService->sendSaleToExternalApi($order);
                        
                        // Marcar que ya se envió
                        $paymentData['external_api_sent'] = true;
                        $paymentData['external_api_sent_at'] = now()->toIso8601String();
                        $order->update(['payment_data' => json_encode($paymentData)]);
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Error al enviar pedido a crédito pagado a API externa', [
                        'order_id' => $order->id,
                        'error' => $e->getMessage()
                    ]);
                    // No bloquear la operación si falla el envío a API externa
                }
                
                return response()->json([
                    'success' => true,
                    'message' => 'Orden marcada como pagada y crédito restaurado exitosamente',
                    'data' => [
                        'order_id' => $order->id,
                        'credit_restored' => $creditUsed,
                        'user_credit_balance' => $newCreditBalance,
                        'order_status' => $order->status
                    ]
                ]);
                
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                throw $e;
            }
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Orden no encontrada'
            ], 404);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error al marcar orden a crédito como pagada', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al marcar la orden como pagada: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update order prepared status
     */
    public function updatePrepared(Request $request, $orderId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'is_prepared' => 'required|boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $order = Order::findOrFail($orderId);
            $order->is_prepared = $request->is_prepared;
            $order->save();

            return response()->json([
                'success' => true,
                'message' => 'Estado de preparado actualizado correctamente',
                'order' => $order
            ], 200);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error al actualizar estado de preparado', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar estado de preparado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update order tracking number
     */
    public function updateTracking(Request $request, $orderId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'tracking_number' => 'nullable|string|max:255'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $order = Order::findOrFail($orderId);
            $order->tracking_number = $request->tracking_number ?: null;
            $order->save();

            return response()->json([
                'success' => true,
                'message' => 'Número de guía actualizado correctamente',
                'order' => $order
            ], 200);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error al actualizar número de guía', [
                'order_id' => $orderId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar número de guía: ' . $e->getMessage()
            ], 500);
        }
    }

}
