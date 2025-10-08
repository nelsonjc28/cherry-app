<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\MercadoPagoService;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Address;
use App\Models\PaymentCard;
use App\Models\User;
use App\Models\Notification;

class PaymentController extends Controller
{
    protected $mercadoPagoService;

    public function __construct(MercadoPagoService $mercadoPagoService)
    {
        $this->mercadoPagoService = $mercadoPagoService;
    }

    /**
     * Crear una preferencia de pago con MercadoPago
     */
    public function createPaymentPreference(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.barcode' => 'nullable|string',
            'address_id' => 'required|exists:addresses,id',
            'total_amount' => 'required|numeric|min:0.01'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        /** @var User $user */
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

       /*  try { */
            // Verificar que la dirección pertenece al usuario
            $address = $user->addresses()->find($request->address_id);
            if (!$address) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dirección no encontrada o no pertenece al usuario'
                ], 404);
            }

            DB::beginTransaction();

            // Crear el pedido en la base de datos
            $order = Order::create([
                'user_id' => $user->id,
                'address_id' => $request->address_id,
                'total_amount' => $request->total_amount,
                'status' => 'pending',
                'payment_method' => 'mercadopago',
                'external_reference' => uniqid('order_' . $user->id . '_')
            ]);

            // Crear los items del pedido
            foreach ($request->items as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'name' => $item['name'],
                    'size' => $item['size'] ?? null,
                    'color' => $item['color'] ?? null,
                    'barcode' => $item['barcode'] ?? null,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['quantity'] * $item['price']
                ]);
            }

            // Preparar datos para MercadoPago
            $orderData = [
                'order_id' => $order->external_reference,
                'user' => [
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone
                ],
                'address' => [
                    'street_address' => $address->street_address,
                    'city' => $address->city,
                    'state' => $address->state,
                    'postal_code' => $address->postal_code,
                    'country' => $address->country
                ],
                'items' => $request->items
            ];

            // Crear preferencia en MercadoPago
            $preference = $this->mercadoPagoService->createPreference($orderData);
            // Actualizar el pedido con el ID de preferencia
            $order->update([
                'mercadopago_preference_id' => $preference->id
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Preferencia de pago creada correctamente',
                'data' => [
                    'order_id' => $order->id,
                    'external_reference' => $order->external_reference,
                    'preference_id' => $preference->id,
                    'payment_url' => $this->mercadoPagoService->getPaymentUrl($preference->id),
                    'sandbox_payment_url' => $this->mercadoPagoService->getSandboxPaymentUrl($preference->id),
                    'init_point' => $preference->init_point,
                    'sandbox_init_point' => $preference->sandbox_init_point
                ]
            ]);

       /*  } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la preferencia de pago: ' . $e->getMessage()
            ], 500);
        } */
    }

    /**
     * Webhook de MercadoPago
     */
    public function webhook(Request $request)
    {
        try {
            $data = $request->all();
            
            $result = $this->mercadoPagoService->processWebhook($data);
            
            if ($result && isset($result['external_reference'])) {
                // Buscar el pedido por external_reference
                $order = Order::where('external_reference', $result['external_reference'])->first();
                
                if ($order) {
                    // Actualizar estado del pedido según el estado del pago
                    $newStatus = $this->mapPaymentStatus($result['status']);
                    
                    $order->update([
                        'status' => $newStatus,
                        'mercadopago_payment_id' => $result['payment_id'],
                        'payment_data' => json_encode($result['payment_data'])
                    ]);
                }
            }

            return response()->json(['status' => 'ok'], 200);
            
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Mapear estados de MercadoPago a estados internos
     */
    private function mapPaymentStatus($mercadoPagoStatus)
    {
        return match($mercadoPagoStatus) {
            'approved' => 'completed',
            'pending' => 'pending',
            'in_process' => 'processing',
            'rejected' => 'failed',
            'cancelled' => 'cancelled',
            default => 'pending'
        };
    }

    /**
     * Procesar pago integrado (sin redirección)
     */
    public function processIntegratedPayment(Request $request)
    {
        // Convertir product_id a entero si viene como string
        $requestData = $request->all();
        if (isset($requestData['items'])) {
            foreach ($requestData['items'] as $index => $item) {
                if (isset($item['product_id'])) {
                    $requestData['items'][$index]['product_id'] = (int) $item['product_id'];
                }
                if (isset($item['quantity'])) {
                    $requestData['items'][$index]['quantity'] = (int) $item['quantity'];
                }
                if (isset($item['price'])) {
                    $requestData['items'][$index]['price'] = (float) $item['price'];
                }
            }
        }
        if (isset($requestData['address_id'])) {
            $requestData['address_id'] = (int) $requestData['address_id'];
        }
        
       

        $validator = Validator::make($requestData, [
            'token' => 'required|string',
            'payment_method_id' => 'required|string',
            'transaction_amount' => 'required|numeric|min:0.01',
            'installments' => 'integer|min:1',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.barcode' => 'nullable|string',
            'address_id' => 'required|exists:addresses,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        /** @var User $user */
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        try {
            // Verificar que la dirección pertenece al usuario
            $address = $user->addresses()->find($requestData['address_id']);
            if (!$address) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dirección no encontrada o no pertenece al usuario'
                ], 404);
            }

            // Generar referencia externa antes de crear el pago
            $externalReference = uniqid('payment_' . $user->id . '_');

            // Preparar datos para MercadoPago (SIN crear orden aún)
            $paymentData = [
                'token' => $requestData['token'],
                'payment_method_id' => $requestData['payment_method_id'],
                'transaction_amount' => $requestData['transaction_amount'],
                'installments' => $requestData['installments'] ?? 1,
                'description' => 'Compra en Cherry Central - Usuario #' . $user->id,
                'external_reference' => $externalReference,
                'payer' => [
                    'email' => $user->email,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name
                ]
            ];


            // Crear pago en MercadoPago
            $payment = $this->mercadoPagoService->createPayment($paymentData);


            // Solo crear orden si el pago es exitoso (ignorando rejected para pruebas)
            if ($payment->status === 'approved' || $payment->status === 'rejected') {
                DB::beginTransaction();

                // Crear el pedido en la base de datos
                $order = Order::create([
                    'user_id' => $user->id,
                    'address_id' => $requestData['address_id'],
                    'total_amount' => $requestData['transaction_amount'],
                    'status' => 'pagado', // Estado inicial: pagado
                    'payment_method' => 'mercadopago_integrated',
                    'external_reference' => $externalReference,
                    'mercadopago_payment_id' => $payment->id,
                    'payment_data' => json_encode($payment)
                ]);

                // Crear los items del pedido
                foreach ($requestData['items'] as $item) {
                    // DEBUG: Log de datos recibidos
                    Log::info('PaymentController - Item data received:', [
                        'product_id' => $item['product_id'],
                        'name' => $item['name'],
                        'size' => $item['size'] ?? 'NULL',
                        'color' => $item['color'] ?? 'NULL',
                        'barcode' => $item['barcode'] ?? 'NULL',
                        'quantity' => $item['quantity'],
                        'price' => $item['price']
                    ]);
                    
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item['product_id'],
                        'name' => $item['name'],
                        'size' => $item['size'] ?? null,
                        'color' => $item['color'] ?? null,
                        'barcode' => $item['barcode'] ?? null,
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                        'subtotal' => $item['quantity'] * $item['price']
                    ]);
                }

                DB::commit();


                // Notificar al admin del pago realizado
                $this->notifyAdminPaymentReceived($order, $user);

                $message = $payment->status === 'approved' 
                    ? '¡Pago procesado exitosamente! Tu pedido ha sido creado.'
                    : '⚠️ Pago en estado "rejected" pero orden creada para pruebas.';

                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'data' => [
                        'order_id' => $order->id,
                        'payment_id' => $payment->id,
                        'payment_status' => $payment->status,
                        'order_status' => 'pagado',
                        'external_reference' => $externalReference,
                        'test_mode' => $payment->status === 'rejected' ? true : false
                    ]
                ]);

            } else {
                // Pago no aprobado

                return response()->json([
                    'success' => false,
                    'message' => 'El pago no fue aprobado. ' . ($payment->status_detail ?? 'Intenta nuevamente.'),
                    'data' => [
                        'payment_id' => $payment->id,
                        'payment_status' => $payment->status,
                        'status_detail' => $payment->status_detail ?? null
                    ]
                ], 422);
            }

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Notificar al admin sobre pago recibido
     */
    private function notifyAdminPaymentReceived(Order $order, User $customer)
    {
        try {
            // Crear notificación en la base de datos
            Notification::createPaymentNotification($order);
            
            // Aquí puedes implementar el envío de email, SMS, o notificación push
            
            // Ejemplo de estructura para futuro email:
            /*
            Mail::to('admin@cherrycentral.com')->send(new PaymentReceivedMail([
                'order' => $order,
                'customer' => $customer,
                'items' => $order->items,
                'address' => $order->address
            ]));
            */
            
        } catch (\Exception $e) {
            // Error silencioso
        }
    }

    /**
     * Notificar al cliente sobre cambio de estado
     */
    private function notifyCustomerStatusChange(Order $order, string $newStatus, string $message = null)
    {
        try {
            // Crear notificación en la base de datos
            Notification::createOrderStatusNotification($order, $order->status, $newStatus);
            
            // Aquí puedes implementar el envío de email, SMS, o notificación push
            
            // Ejemplo de estructura para futuro email:
            /*
            Mail::to($order->user->email)->send(new OrderStatusChangeMail([
                'order' => $order,
                'status' => $newStatus,
                'message' => $message,
                'customer' => $order->user
            ]));
            */
            
        } catch (\Exception $e) {
            // Error silencioso
        }
    }


    /**
     * Obtener estado del pago
     */
    public function getPaymentStatus($orderId)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $order = Order::where('id', $orderId)
            ->where('user_id', $user->id)
            ->with(['items', 'address'])
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pedido no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'order' => $order
        ]);
    }

    /**
     * Cambiar estado de orden (solo admin)
     */
    public function updateOrderStatus(Request $request, $orderId)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:pagado,en_espera_envio,enviado,entregado',
            'message' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        /** @var User $user */
        $user = Auth::user();
        
        if (!$user || $user->role->name !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para cambiar el estado de órdenes'
            ], 403);
        }

        $order = Order::find($orderId);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Orden no encontrada'
            ], 404);
        }

        $newStatus = $request->status;
        $oldStatus = $order->status;

        // Validar transiciones de estado válidas
        if (!$this->isValidStatusTransition($oldStatus, $newStatus)) {
            return response()->json([
                'success' => false,
                'message' => "No se puede cambiar de '$oldStatus' a '$newStatus'"
            ], 422);
        }

        try {
            DB::beginTransaction();

            $order->update([
                'status' => $newStatus,
                'updated_at' => now()
            ]);


            // Notificar al cliente según el nuevo estado
            if ($newStatus === 'en_espera_envio') {
                $this->notifyCustomerStatusChange($order, $newStatus, 
                    'Tu pedido ha sido confirmado y está siendo preparado para envío.');
            } elseif ($newStatus === 'enviado') {
                $this->notifyCustomerStatusChange($order, $newStatus, 
                    'Tu pedido ha sido enviado. Podrás marcarlo como entregado cuando lo recibas.');
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Estado de orden actualizado correctamente',
                'data' => [
                    'order_id' => $order->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el estado de la orden'
            ], 500);
        }
    }

    /**
     * Cliente marca orden como entregada
     */
    public function markAsDelivered(Request $request, $orderId)
    {
        /** @var User $user */
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $order = Order::where('id', $orderId)
                     ->where('user_id', $user->id)
                     ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Orden no encontrada o no pertenece al usuario'
            ], 404);
        }

        if ($order->status !== 'enviado') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden marcar como entregadas las órdenes enviadas'
            ], 422);
        }

        try {
            DB::beginTransaction();

            $order->update([
                'status' => 'entregado',
                'delivered_at' => now()
            ]);


            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '¡Perfecto! Has confirmado la entrega de tu pedido.',
                'data' => [
                    'order_id' => $order->id,
                    'status' => 'entregado',
                    'delivered_at' => $order->delivered_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al confirmar la entrega'
            ], 500);
        }
    }

    /**
     * Validar si la transición de estado es válida
     */
    private function isValidStatusTransition(string $oldStatus, string $newStatus): bool
    {
        $validTransitions = [
            'pagado' => ['en_espera_envio'],
            'en_espera_envio' => ['enviado'],
            'enviado' => ['entregado'], // Solo el cliente puede hacer esta transición
            'entregado' => [] // Estado final
        ];

        return in_array($newStatus, $validTransitions[$oldStatus] ?? []);
    }

    /**
     * Get user orders
     */
    public function getUserOrders(Request $request)
    {
        try {
            /** @var User $user */
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Obtener órdenes del usuario con items relacionados
            $orders = Order::where('user_id', $user->id)
                ->with(['items', 'address'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Mapear órdenes al formato esperado por el frontend
            $formattedOrders = $orders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'date' => $order->created_at->format('d \d\e F Y'),
                    'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'status' => $this->mapOrderStatus($order->status),
                    'statusRaw' => $order->status, // Estado original para comparaciones en el frontend
                    'statusColor' => $this->getStatusColor($order->status),
                    'items' => $order->items->map(function ($item) {
                        // Generar URL de imagen basada en el product_id
                        $imageUrl = $this->getProductImageUrl($item->product_id);
                        
                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'title' => $item->name ?? 'Producto',
                            'quantity' => (int) $item->quantity,
                            'price' => (float) $item->price,
                            'subtotal' => (float) $item->subtotal,
                            'image' => $imageUrl,
                            'size' => $item->size,
                            'color' => $item->color,
                            'barcode' => $item->barcode
                        ];
                    }),
                    'totalAmount' => (float) $order->total_amount,
                    'address' => $order->address ? [
                        'street' => $order->address->street_address,
                        'city' => $order->address->city,
                        'state' => $order->address->state,
                        'postal_code' => $order->address->postal_code
                    ] : null
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
            'pagado' => 'Pagado',
            'en_espera_envio' => 'En espera de envío',
            'enviado' => 'Enviado',
            'entregado' => 'Entregado'
        ];

        return $statusMap[$status] ?? ucfirst($status);
    }

    /**
     * Get status color for display
     */
    private function getStatusColor($status)
    {
        $colorMap = [
            'pending' => 'yellow',
            'processing' => 'blue',
            'shipped' => 'orange',
            'delivered' => 'green',
            'cancelled' => 'red',
            'pagado' => 'blue',
            'en_espera_envio' => 'blue',
            'enviado' => 'orange',
            'entregado' => 'green'
        ];

        return $colorMap[$status] ?? 'gray';
    }

    /**
     * Get orders pending review for the authenticated user
     */
    public function getPendingReviews(Request $request)
    {
        try {
            /** @var User $user */
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Obtener órdenes entregadas que no han sido calificadas
            $orders = Order::where('user_id', $user->id)
                ->where('status', 'entregado')
                ->with(['items'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Filtrar órdenes que tienen productos sin calificar
            $pendingOrders = $orders->filter(function ($order) {
                foreach ($order->items as $item) {
                    // Verificar si existe una reseña para este producto en esta orden
                    $hasReview = \App\Models\Review::where('user_id', $order->user_id)
                        ->where('order_id', $order->id)
                        ->where('product_id', $item->product_id)
                        ->exists();
                    
                    if (!$hasReview) {
                        return true; // Esta orden tiene productos sin calificar
                    }
                }
                return false;
            });

            $formattedOrders = $pendingOrders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'date' => $order->created_at->format('d/m/Y'),
                    'totalAmount' => (float) $order->total_amount,
                    'items' => $order->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'name' => $item->name,
                            'quantity' => $item->quantity,
                            'price' => (float) $item->price,
                            'image' => $this->getProductImageUrl($item->product_id)
                        ];
                    })
                ];
            });

            return response()->json([
                'success' => true,
                'orders' => $formattedOrders->values()->toArray()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener órdenes pendientes de calificación: ' . $e->getMessage()
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
        
        // Primero probar con el ID original (sin ceros)
        $originalUrl = "https://cherry-fotos.s3.amazonaws.com/shopify/{$productId}/{$productId}_1.jpg";
        
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
            return $originalUrl;
        }
        
        // Si no existe, probar con formato con ceros a la izquierda
        $formattedId = str_pad($productId, 11, '0', STR_PAD_LEFT);
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
            return $formattedUrl;
        }
        
        // Si ninguna existe, devolver la original (será manejada por el fallback del frontend)
        return $originalUrl;
    }

    /**
     * Get MercadoPago public configuration
     */
    public function getMercadoPagoConfig()
    {
        return response()->json([
            'success' => true,
            'public_key' => config('services.mercadopago.public_key'),
            'currency_id' => config('services.mercadopago.currency_id', 'ARS')
        ]);
    }
}
