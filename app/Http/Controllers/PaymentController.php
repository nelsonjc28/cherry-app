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
use App\Models\DayFortyFive;
use App\Models\PaymentCard;
use App\Models\User;
use App\Models\Notification;
use App\Services\ExternalSalesService;
use App\Mail\OrderConfirmationMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class PaymentController extends Controller
{
    protected $mercadoPagoService;
    protected $externalSalesService;

    public function __construct(
        MercadoPagoService $mercadoPagoService, 
        ExternalSalesService $externalSalesService
    ) {
        $this->mercadoPagoService = $mercadoPagoService;
        $this->externalSalesService = $externalSalesService;
    }

    /**
     * Crear una preferencia de pago con MercadoPago
     */
    public function createPaymentPreference(Request $request)
    {
        $deliveryType = $request->input('delivery_type', 'envio');
        
        $rules = [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.barcode' => 'nullable|string',
            'delivery_type' => 'nullable|string|in:envio,retiro',
            'total_amount' => 'required|numeric|min:0.01'
        ];
        
        // address_id es requerido solo si es envío
        if ($deliveryType === 'envio') {
            $rules['address_id'] = 'required|exists:addresses,id';
        } else {
            $rules['address_id'] = 'nullable';
        }
        
        $validator = Validator::make($request->all(), $rules);

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
        // Verificar que la dirección pertenece al usuario solo si es envío
        $addressId = null;
        $address = null;
        if ($deliveryType === 'envio') {
            $address = $user->addresses()->find($request->address_id);
            if (!$address) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dirección no encontrada o no pertenece al usuario'
                ], 404);
            }
            $addressId = $request->address_id;
        }

        DB::beginTransaction();

        // Crear el pedido en la base de datos
        $order = Order::create([
            'user_id' => $user->id,
            'address_id' => $addressId,
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

        DB::commit();

        // Recargar el pedido con relaciones para el email
        $order->load(['user', 'address', 'items']);

        // Enviar email de confirmación al cliente (también en estado pending para pruebas)
        Mail::to($user->email)->send(new OrderConfirmationMail($order));
        Log::info('Email de confirmación enviado al cliente (createPreference - pending)', ['order_id' => $order->id]);

        try {
            // Calcular suma de items para verificar diferencia con total_amount
            $itemsTotal = 0;
            foreach ($request->items as $item) {
                $itemsTotal += ($item['price'] * $item['quantity']);
            }
            
            $totalAmount = (float) $request->total_amount;
            $difference = $totalAmount - $itemsTotal;
            
            Log::info('Cálculo de totales para Mercado Pago', [
                'items_total' => $itemsTotal,
                'total_amount_recibido' => $totalAmount,
                'diferencia' => $difference
            ]);
            
            // Si hay diferencia, ajustar items para que sumen el total_amount
            $itemsForMercadoPago = $request->items;
            if (abs($difference) > 0.01) {
                if ($difference > 0) {
                    // Diferencia positiva (envío agregado) - agregar item de envío
                    $itemsForMercadoPago[] = [
                        'product_id' => 0,
                        'name' => 'Envío',
                        'quantity' => 1,
                        'price' => $difference,
                        'size' => null,
                        'color' => null,
                        'barcode' => null
                    ];
                } else {
                    // Diferencia negativa (descuento adicional) - ajustar precios proporcionalmente
                    // Calcular factor de ajuste
                    $adjustmentFactor = $totalAmount / $itemsTotal;
                    
                    // Aplicar factor a cada item para que sumen el total_amount
                    foreach ($itemsForMercadoPago as &$item) {
                        $item['price'] = round($item['price'] * $adjustmentFactor, 2);
                    }
                    unset($item); // Liberar referencia
                    
                    Log::info('Ajuste de precios aplicado', [
                        'factor_ajuste' => $adjustmentFactor,
                        'total_original_items' => $itemsTotal,
                        'total_ajustado' => array_sum(array_map(function($item) {
                            return $item['price'] * $item['quantity'];
                        }, $itemsForMercadoPago))
                    ]);
                }
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
                'address' => $addressId && $address ? [
                    'street_address' => $address->street_address,
                    'city' => $address->city,
                    'state' => $address->state,
                    'postal_code' => $address->postal_code,
                    'country' => $address->country
                ] : [
                    'street_address' => '',
                    'city' => '',
                    'state' => '',
                    'postal_code' => '',
                    'country' => 'México'
                ],
                'items' => $itemsForMercadoPago,
                'delivery_type' => $deliveryType
            ];

            Log::info('Creando preferencia de MercadoPago', [
                'order_id' => $order->id,
                'external_reference' => $order->external_reference,
                'items_count' => count($request->items)
            ]);

            // Crear preferencia en MercadoPago con timeout
            $preference = $this->mercadoPagoService->createPreference($orderData);
            
            Log::info('Preferencia creada exitosamente', [
                'preference_id' => $preference->id,
                'order_id' => $order->id
            ]);
            
            // Actualizar el pedido con el ID de preferencia
            $order->update([
                'mercadopago_preference_id' => $preference->id
            ]);

            DB::commit();

            // Recargar el pedido con relaciones para el email
            $order->load(['user', 'address', 'items']);

            // Enviar email de confirmación al cliente (también en estado pending para pruebas)
            Mail::to($user->email)->send(new OrderConfirmationMail($order));
            Log::info('Email de confirmación enviado al cliente (createPreference - pending)', ['order_id' => $order->id]);

            return response()->json([
                'success' => true,
                'message' => 'Preferencia de pago creada correctamente',
                'data' => [
                    'order_id' => $order->id,
                    'external_reference' => $order->external_reference,
                    'preference_id' => $preference->id,
                    'payment_url' => $preference->init_point ?? $this->mercadoPagoService->getPaymentUrl($preference->id),
                    'sandbox_payment_url' => $preference->sandbox_init_point ?? $this->mercadoPagoService->getSandboxPaymentUrl($preference->id),
                    'init_point' => $preference->init_point ?? null,
                    'sandbox_init_point' => $preference->sandbox_init_point ?? null
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error al crear preferencia de MercadoPago', [
                'order_id' => $order->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la preferencia de pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook de MercadoPago
     * Recibe notificaciones de pagos (aprobados, rechazados, pendientes, etc.)
     */
    public function webhook(Request $request)
    {
        try {
            $data = $request->all();
            
            Log::info('Webhook de MercadoPago recibido', ['data' => $data]);

            $result = $this->mercadoPagoService->processWebhook($data);

            if ($result && isset($result['external_reference'])) {
                // Buscar el pedido por external_reference
                $order = Order::where('external_reference', $result['external_reference'])
                    ->with(['items', 'user', 'address'])
                    ->first();

                if ($order) {
                    $previousStatus = $order->status;
                    $newStatus = $this->mapPaymentStatus($result['status']);
                    
                    Log::info('Procesando webhook para orden', [
                        'order_id' => $order->id,
                        'payment_status' => $result['status'],
                        'previous_order_status' => $previousStatus,
                        'new_order_status' => $newStatus
                    ]);

                    // Preservar delivery_type si existe en payment_data anterior
                    $previousPaymentData = $order->payment_data ?? [];
                    $newPaymentData = $result['payment_data'] ?? [];
                    if (is_string($previousPaymentData)) {
                        $previousPaymentData = json_decode($previousPaymentData, true) ?? [];
                    }
                    if (isset($previousPaymentData['delivery_type'])) {
                        $newPaymentData['delivery_type'] = $previousPaymentData['delivery_type'];
                    }
                    
                    // Actualizar estado del pedido
                    $order->update([
                        'status' => $newStatus,
                        'mercadopago_payment_id' => $result['payment_id'],
                        'payment_data' => json_encode($newPaymentData)
                    ]);

                    // === PAGO APROBADO ===
                    if ($result['status'] === 'approved' && $newStatus === 'pagado') {
                        $this->handleApprovedPayment($order, $previousStatus);
                    }
                    
                    // === PAGO RECHAZADO ===
                    elseif ($result['status'] === 'rejected') {
                        $this->handleRejectedPayment($order);
                    }
                    
                    // === PAGO CANCELADO ===
                    elseif ($result['status'] === 'cancelled') {
                        $this->handleCancelledPayment($order, $previousStatus);
                    }
                    
                    // === PAGO PENDIENTE (para OXXO principalmente) ===
                    elseif (in_array($result['status'], ['pending', 'in_process'])) {
                        $this->handlePendingPayment($order);
                    }
                }
            }

            return response()->json(['status' => 'ok'], 200);
            
        } catch (\Exception $e) {
            Log::error('Error en webhook de MercadoPago', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Siempre responder 200 para que MercadoPago no reintente
            return response()->json(['status' => 'error_logged'], 200);
        }
    }

    /**
     * Manejar pago aprobado
     * El inventario se descuenta desde la API externa al sincronizar productos
     */
    private function handleApprovedPayment(Order $order, string $previousStatus)
    {
        Log::info('Procesando pago aprobado', ['order_id' => $order->id]);
        
        // 1. Enviar información a la API externa (ella se encarga del inventario)
        try {
            $this->externalSalesService->sendSaleToExternalApi($order);
            Log::info('Venta enviada a API externa exitosamente', ['order_id' => $order->id]);
        } catch (\Exception $e) {
            Log::error('Error al enviar venta a API externa desde webhook', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }
        
        // 2. Enviar email de confirmación al cliente
        // Recargar el pedido con relaciones para el email
        $order->load(['user', 'address', 'items']);
        Mail::to($order->user->email)->send(new OrderConfirmationMail($order));
        Log::info('Email de confirmación enviado al cliente (webhook - approved)', ['order_id' => $order->id]);
        
        // 3. Crear notificación para el usuario
        try {
            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'payment_approved',
                'title' => '¡Pago aprobado!',
                'message' => "Tu pago para el pedido #{$order->id} ha sido aprobado. Estamos preparando tu envío.",
                'data' => json_encode([
                    'order_id' => $order->id,
                    'amount' => $order->total_amount
                ]),
                'read' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear notificación de pago aprobado', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }
        
        // 4. Notificar al admin
        $this->notifyAdminPaymentReceived($order, $order->user);
    }

    /**
     * Manejar pago rechazado
     */
    private function handleRejectedPayment(Order $order)
    {
        Log::info('Procesando pago rechazado', ['order_id' => $order->id]);
        
        // Crear notificación para el usuario
        try {
            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'payment_rejected',
                'title' => 'Pago rechazado',
                'message' => "El pago para tu pedido #{$order->id} fue rechazado. Por favor intenta con otro método de pago.",
                'data' => json_encode(['order_id' => $order->id]),
                'read' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear notificación de pago rechazado', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Manejar pago cancelado
     */
    private function handleCancelledPayment(Order $order, string $previousStatus)
    {
        Log::info('Procesando pago cancelado', ['order_id' => $order->id]);
        
        // Crear notificación para el usuario
        try {
            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'payment_cancelled',
                'title' => 'Pedido cancelado',
                'message' => "Tu pedido #{$order->id} ha sido cancelado.",
                'data' => json_encode(['order_id' => $order->id]),
                'read' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear notificación de pago cancelado', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Manejar pago pendiente (OXXO, transferencia, etc.)
     */
    private function handlePendingPayment(Order $order)
    {
        Log::info('Pago pendiente registrado', ['order_id' => $order->id]);
        
        // Crear notificación para el usuario
        try {
            $paymentMethod = $order->payment_method;
            $message = $paymentMethod === 'oxxo' 
                ? "Tu ticket de pago para el pedido #{$order->id} está listo. Tienes 72 horas para realizar el pago en OXXO."
                : "Tu pago para el pedido #{$order->id} está pendiente de confirmación.";
            
            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'payment_pending',
                'title' => 'Pago pendiente',
                'message' => $message,
                'data' => json_encode(['order_id' => $order->id]),
                'read' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear notificación de pago pendiente', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Mapear estados de MercadoPago a estados internos (para webhook)
     */
    private function mapPaymentStatus($mercadoPagoStatus)
    {
        return match ($mercadoPagoStatus) {
            'approved' => 'pagado',
            'pending' => 'pendiente_pago',
            'in_process' => 'pendiente_pago',
            'rejected' => 'pago_rechazado',
            'cancelled' => 'cancelado',
            default => 'pendiente_pago'
        };
    }

    /**
     * Mapear estados de MercadoPago a estados de orden (para creación inicial)
     */
    private function mapPaymentStatusToOrderStatus($mercadoPagoStatus)
    {
        return match ($mercadoPagoStatus) {
            'approved' => 'pagado',
            'pending' => 'pendiente_pago',
            'in_process' => 'pendiente_pago',
            'rejected' => 'pago_rechazado',
            'cancelled' => 'cancelado',
            default => 'pendiente_pago'
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

        $deliveryType = $requestData['delivery_type'] ?? 'envio';

        $rules = [
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
            'delivery_type' => 'nullable|string|in:envio,retiro'
        ];
        
        // address_id es requerido solo si es envío
        if ($deliveryType === 'envio') {
            $rules['address_id'] = 'required|exists:addresses,id';
        } else {
            $rules['address_id'] = 'nullable';
        }
        
        $validator = Validator::make($requestData, $rules);

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
            // Verificar que la dirección pertenece al usuario solo si es envío
            $addressId = null;
            if ($deliveryType === 'envio') {
                $address = $user->addresses()->find($requestData['address_id']);
                if (!$address) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Dirección no encontrada o no pertenece al usuario'
                    ], 404);
                }
                $addressId = $requestData['address_id'];
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

            // Mapear estado del pago a estado de la orden
            $orderStatus = $this->mapPaymentStatusToOrderStatus($payment->status);
            
            // Crear orden para todos los estados excepto 'rejected' y 'cancelled'
            if (!in_array($payment->status, ['rejected', 'cancelled'])) {
                DB::beginTransaction();

                // Preparar payment_data con delivery_type incluido
                $paymentDataToStore = is_array($payment) ? $payment : (array) $payment;
                $paymentDataToStore['delivery_type'] = $deliveryType;
                
                // Crear el pedido en la base de datos
                $order = Order::create([
                    'user_id' => $user->id,
                    'address_id' => $addressId,
                    'total_amount' => $requestData['transaction_amount'],
                    'status' => $orderStatus, // Estado según el estado del pago
                    'payment_method' => 'mercadopago_integrated',
                    'external_reference' => $externalReference,
                    'mercadopago_payment_id' => $payment->id,
                    'payment_data' => json_encode($paymentDataToStore)
                ]);

                // Crear los items del pedido
                foreach ($requestData['items'] as $item) {
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

                // Crear o actualizar registro dayFortyFive si se aplicó descuento
                // Solo si el frontend indica que se aplicó el descuento (day_forty_five_applied)
                if (isset($requestData['day_forty_five_applied']) && $requestData['day_forty_five_applied'] === true) {
                    $this->createOrUpdateDayFortyFive($user->id);
                }

                DB::commit();

                // Recargar el pedido con relaciones
                $order->load(['user', 'address', 'items']);

                // Enviar email de confirmación al cliente (también en pending para pruebas)
                Mail::to($user->email)->send(new OrderConfirmationMail($order));
                Log::info('Email de confirmación enviado al cliente (pago integrado)', [
                    'order_id' => $order->id,
                    'payment_status' => $payment->status
                ]);

                // Solo enviar a API externa si el pago fue aprobado
                if ($payment->status === 'approved') {
                    // Enviar información a la API externa
                    try {
                        $this->externalSalesService->sendSaleToExternalApi($order);
                    } catch (\Exception $e) {
                        // Log del error pero no fallar la transacción
                        Log::error('Error al enviar venta a API externa después de pago aprobado', [
                            'order_id' => $order->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                // Notificar al admin del pago realizado (solo si está aprobado o pendiente)
                if (in_array($payment->status, ['approved', 'pending', 'in_process'])) {
                    $this->notifyAdminPaymentReceived($order, $user);
                }

                // Mensaje según el estado del pago
                $message = match($payment->status) {
                    'approved' => '¡Pago procesado exitosamente! Tu pedido ha sido creado.',
                    'pending' => 'Tu pago está pendiente de confirmación. Te notificaremos cuando se confirme.',
                    'in_process' => 'Tu pago está siendo procesado. Te notificaremos cuando se complete.',
                    default => 'Tu pedido ha sido creado. El estado del pago se actualizará automáticamente.'
                };

                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'data' => [
                        'order_id' => $order->id,
                        'payment_id' => $payment->id,
                        'payment_status' => $payment->status,
                        'order_status' => $orderStatus,
                        'external_reference' => $externalReference,
                        'requires_polling' => in_array($payment->status, ['pending', 'in_process']), // Indica si necesita verificación periódica
                        'status_detail' => $payment->status_detail ?? null
                    ]
                ]);
            } else {
                // Pago rechazado o cancelado - no crear orden
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
     * Crear o actualizar registro dayFortyFive
     * Se crea/actualiza cuando el cliente hace una compra >= 7000 MXN
     * (solo productos con desc_promo = 0 y sin descuentos personalizados)
     */
    private function createOrUpdateDayFortyFive($userId)
    {
        $now = Carbon::now();
        $endDate = $now->copy()->addDays(44);

        $dayFortyFive = DayFortyFive::where('user_id', $userId)->first();

        if ($dayFortyFive) {
            // Actualizar fechas existentes
            $dayFortyFive->update([
                'startDate' => $now->format('Y-m-d'),
                'endDate' => $endDate->format('Y-m-d'),
            ]);
        } else {
            // Crear nuevo registro
            DayFortyFive::create([
                'user_id' => $userId,
                'startDate' => $now->format('Y-m-d'),
                'endDate' => $endDate->format('Y-m-d'),
            ]);
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
            'status' => 'required|string|in:pagado,en_espera_envio,enviado',
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
                $this->notifyCustomerStatusChange(
                    $order,
                    $newStatus,
                    'Tu pedido ha sido confirmado y está siendo preparado para envío.'
                );
            } elseif ($newStatus === 'enviado') {
                $this->notifyCustomerStatusChange(
                    $order,
                    $newStatus,
                    'Tu pedido ha sido enviado. Ahora puedes calificar y comentar sobre los productos.'
                );
            }

            DB::commit();

            // NOTA: El email de confirmación se envía cuando el pago es aprobado
            // Recargar el pedido con relaciones para el email
            $order->load(['user', 'address', 'items']);

            // Enviar email de confirmación al cliente (también en pending para pruebas)
            Mail::to($user->email)->send(new OrderConfirmationMail($order));
            Log::info('Email de confirmación enviado al cliente (updateOrderStatus)', [
                'order_id' => $order->id,
                'new_status' => $newStatus
            ]);

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
     * Validar si la transición de estado es válida
     */
    private function isValidStatusTransition(string $oldStatus, string $newStatus): bool
    {
        $validTransitions = [
            'pagado' => ['en_espera_envio'],
            'en_espera_envio' => ['enviado'],
            'enviado' => [] // Estado final - cliente puede calificar
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

            // Obtener órdenes del usuario con items y productos relacionados
            $orders = Order::where('user_id', $user->id)
                ->with(['items.product', 'address'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Mapear órdenes al formato esperado por el frontend
            $formattedOrders = $orders->map(function ($order) use ($user) {
                return [
                    'id' => $order->id,
                    'date' => $order->created_at->format('d \d\e F Y'),
                    'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'status' => $this->mapOrderStatus($order->status),
                    'statusRaw' => $order->status, // Estado original para comparaciones en el frontend
                    'statusColor' => $this->getStatusColor($order->status),
                    'items' => $order->items->map(function ($item) use ($user, $order) {
                        // Si la relación no cargó el producto (por diferencia de tipos), buscarlo manualmente
                        $product = $item->product;
                        if (!$product && $item->product_id) {
                            $product = \App\Models\Producto::find((string) $item->product_id);
                        }
                        
                        // Obtener URL de imagen usando la misma lógica que los ProductCard
                        $imageUrl = $this->getProductImageUrlFromProduct($product, $item->product_id);

                        // Verificar si ya existe una reseña para este producto en esta orden
                        $hasReview = \App\Models\Review::where('user_id', $user->id)
                            ->where('order_id', $order->id)
                            ->where('product_id', $item->product_id)
                            ->exists();

                        // Usar siempre el producto relacionado si está disponible, de lo contrario usar el name guardado
                        $productTitle = null;
                        if ($product && $product->descripcion) {
                            $productTitle = $product->descripcion;
                        } elseif ($item->name) {
                            $productTitle = $item->name;
                        } else {
                            $productTitle = 'Producto';
                        }

                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'title' => $productTitle,
                            'quantity' => (int) $item->quantity,
                            'price' => (float) $item->price,
                            'subtotal' => (float) $item->subtotal,
                            'image' => $imageUrl,
                            'size' => $item->size,
                            'color' => $item->color,
                            'barcode' => $item->barcode,
                            'hasReview' => $hasReview
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
            'pendiente_pago' => 'Pago Pendiente',
            'processing' => 'Procesando',
            'shipped' => 'En vía',
            'delivered' => 'Entregado',
            'cancelled' => 'Cancelado',
            'cancelado' => 'Cancelado',
            'pagado' => 'Pagado',
            'en_espera_envio' => 'En espera de envío',
            'enviado' => 'Enviado',
            'entregado' => 'Entregado',
            'pago_rechazado' => 'Pago Rechazado'
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
            'pendiente_pago' => 'yellow',
            'processing' => 'blue',
            'shipped' => 'orange',
            'delivered' => 'green',
            'cancelled' => 'red',
            'cancelado' => 'red',
            'pagado' => 'blue',
            'en_espera_envio' => 'blue',
            'enviado' => 'orange',
            'entregado' => 'green',
            'pago_rechazado' => 'red'
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

            // Obtener órdenes enviadas que no han sido calificadas con productos relacionados
            $orders = Order::where('user_id', $user->id)
                ->where('status', 'enviado')
                ->with(['items.product'])
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
                        // Si la relación no cargó el producto (por diferencia de tipos), buscarlo manualmente
                        $product = $item->product;
                        if (!$product && $item->product_id) {
                            $product = \App\Models\Producto::find((string) $item->product_id);
                        }
                        
                        // Obtener URL de imagen usando la misma lógica que los ProductCard
                        $imageUrl = $this->getProductImageUrlFromProduct($product, $item->product_id);

                        // Usar siempre el producto relacionado si está disponible
                        $productTitle = null;
                        if ($product && $product->descripcion) {
                            $productTitle = $product->descripcion;
                        } elseif ($item->name) {
                            $productTitle = $item->name;
                        } else {
                            $productTitle = 'Producto';
                        }

                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'name' => $productTitle,
                            'quantity' => $item->quantity,
                            'price' => (float) $item->price,
                            'image' => $imageUrl
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
     * Get product image URL using the same logic as ProductCard
     * First checks if product has imagen field, otherwise constructs URL from product ID
     * 
     * @param \App\Models\Producto|null $product The product model (can be null)
     * @param string|int|null $productId The product ID as fallback
     * @return string The image URL
     */
    private function getProductImageUrlFromProduct($product, $productId)
    {
        // Si el producto tiene imagen en la BD, usarla directamente (como en ProductController)
        if ($product && isset($product->imagen) && !empty(trim($product->imagen))) {
            return $product->imagen;
        }
        
        // Si no tiene imagen en BD o el producto no existe, construir URL desde el ID (como en AdminCatalogController)
        // Esto es importante porque algunos productos pueden no existir en la tabla productos pero sí tener imágenes en S3
        if ($productId) {
            $productIdStr = trim((string) $productId);
            // Construir URL de S3 directamente desde el productId
            return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
        }
        
        // Fallback: placeholder (solo si no hay productId)
        return asset('images/placeholder-product.png');
    }

    /**
     * Get product image URL based on product ID
     * Tries both formatted and original ID formats to find the correct image
     * @deprecated Use getProductImageUrlFromProduct instead
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

    /**
     * Verificar si la URL del webhook es accesible públicamente
     */
    public function checkWebhookUrl()
    {
        try {
            $webhookUrl = $this->mercadoPagoService->getWebhookUrl();
            $appUrl = config('app.url');
            $ngrokUrl = env('NGROK_URL');
            
            $isLocalhost = str_contains($appUrl, 'localhost') || str_contains($appUrl, '127.0.0.1');
            $hasNgrok = !empty($ngrokUrl);
            
            // Intentar hacer una petición HEAD a la URL del webhook para verificar si es accesible
            $isAccessible = false;
            $error = null;
            
            if ($webhookUrl) {
                try {
                    $ch = curl_init($webhookUrl);
                    curl_setopt($ch, CURLOPT_NOBODY, true);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    
                    curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $curlError = curl_error($ch);
                    curl_close($ch);
                    
                    // Cualquier código HTTP significa que la URL es accesible
                    $isAccessible = $httpCode > 0 && empty($curlError);
                    if (!$isAccessible && $curlError) {
                        $error = $curlError;
                    }
                } catch (\Exception $e) {
                    $error = $e->getMessage();
                }
            }
            
            return response()->json([
                'success' => true,
                'webhook_url' => $webhookUrl,
                'is_accessible' => $isAccessible,
                'error' => $error,
                'environment' => [
                    'is_localhost' => $isLocalhost,
                    'has_ngrok' => $hasNgrok,
                    'app_url' => $appUrl,
                    'ngrok_url' => $ngrokUrl,
                    'environment_type' => $isLocalhost ? ($hasNgrok ? 'development_with_ngrok' : 'development_local') : 'production'
                ],
                'recommendations' => $this->getWebhookRecommendations($isLocalhost, $hasNgrok, $isAccessible)
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error verificando URL del webhook: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener recomendaciones según el entorno
     */
    private function getWebhookRecommendations($isLocalhost, $hasNgrok, $isAccessible)
    {
        $recommendations = [];
        
        if ($isLocalhost && !$hasNgrok) {
            $recommendations[] = 'Estás en desarrollo local sin ngrok. El webhook NO funcionará automáticamente.';
            $recommendations[] = 'Los pagos se procesarán cuando el usuario regrese de Mercado Pago.';
            $recommendations[] = 'Para desarrollo: instala ngrok y configura NGROK_URL en tu .env';
        } elseif ($isLocalhost && $hasNgrok) {
            if ($isAccessible) {
                $recommendations[] = '✅ Ngrok está funcionando correctamente. El webhook funcionará.';
            } else {
                $recommendations[] = '⚠️ Ngrok configurado pero la URL no es accesible. Verifica que ngrok esté corriendo.';
                $recommendations[] = 'Ejecuta: ngrok http 8000 (o el puerto de tu aplicación)';
            }
        } else {
            if ($isAccessible) {
                $recommendations[] = '✅ URL de producción accesible. El webhook funcionará correctamente.';
            } else {
                $recommendations[] = '⚠️ URL de producción no accesible. Verifica que tu servidor sea público.';
                $recommendations[] = 'Asegúrate de que el firewall permita conexiones entrantes.';
            }
        }
        
        return $recommendations;
    }

    /**
     * Endpoint de prueba para verificar conexión con MercadoPago
     */
    public function testMercadoPagoConnection()
    {
        try {
            Log::info('Probando conexión con MercadoPago');
            
            // Intentar crear una preferencia de prueba muy simple
            $testPreferenceData = [
                'items' => [
                    [
                        'id' => 'test-1',
                        'title' => 'Test Item',
                        'quantity' => 1,
                        'unit_price' => 10.00,
                        'currency_id' => 'MXN'
                    ]
                ],
                'payer' => [
                    'email' => 'test@test.com'
                ],
                'back_urls' => [
                    'success' => config('app.url') . '/compra-exitosa',
                    'failure' => config('app.url') . '/carrito-detalle',
                    'pending' => config('app.url') . '/carrito-detalle'
                ],
                'auto_return' => 'approved',
                'external_reference' => 'test_' . time()
            ];

            $startTime = microtime(true);
            $preference = $this->mercadoPagoService->createPreference($testPreferenceData);
            $elapsedTime = microtime(true) - $startTime;

            return response()->json([
                'success' => true,
                'message' => 'Conexión con MercadoPago exitosa',
                'preference_id' => $preference->id ?? 'N/A',
                'elapsed_time' => round($elapsedTime, 2) . 's',
                'config' => [
                    'environment' => config('services.mercadopago.environment', 'sandbox'),
                    'has_access_token' => !empty(config('services.mercadopago.access_token')),
                    'has_public_key' => !empty(config('services.mercadopago.public_key'))
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error en prueba de conexión MercadoPago', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con MercadoPago: ' . $e->getMessage(),
                'config' => [
                    'environment' => config('services.mercadopago.environment', 'sandbox'),
                    'has_access_token' => !empty(config('services.mercadopago.access_token')),
                    'has_public_key' => !empty(config('services.mercadopago.public_key'))
                ]
            ], 500);
        }
    }

    /**
     * Verificar y procesar pago cuando el usuario regresa de MercadoPago
     * Esta función se llama desde el frontend cuando el usuario es redirigido de vuelta
     */
    public function verifyAndProcessPayment(Request $request)
    {
        try {
            // Parámetros que envía MercadoPago en la URL de retorno
            $paymentId = $request->input('payment_id') ?? $request->input('collection_id');
            $status = $request->input('status') ?? $request->input('collection_status');
            $externalReference = $request->input('external_reference');
            $preferenceId = $request->input('preference_id');
            
            Log::info('Verificando pago de MercadoPago', [
                'payment_id' => $paymentId,
                'status' => $status,
                'external_reference' => $externalReference,
                'preference_id' => $preferenceId
            ]);

            // Si no hay payment_id, buscar por preference_id o external_reference
            $order = null;
            
            if ($externalReference) {
                $order = Order::where('external_reference', $externalReference)
                    ->with(['items', 'user', 'address'])
                    ->first();
            }
            
            if (!$order && $preferenceId) {
                $order = Order::where('mercadopago_preference_id', $preferenceId)
                    ->with(['items', 'user', 'address'])
                    ->first();
            }

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada',
                    'payment_status' => 'unknown'
                ], 404);
            }

            // Si tenemos payment_id, obtener el estado real desde MercadoPago
            $realStatus = $status;
            $paymentData = null;
            
            if ($paymentId) {
                try {
                    $payment = $this->mercadoPagoService->getPayment($paymentId);
                    $realStatus = $payment->status;
                    $paymentData = $payment;
                    
                    Log::info('Estado real del pago obtenido de MercadoPago', [
                        'payment_id' => $paymentId,
                        'status' => $realStatus
                    ]);
                } catch (\Exception $e) {
                    Log::warning('No se pudo obtener el pago de MercadoPago', [
                        'payment_id' => $paymentId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Mapear estado y actualizar orden
            $previousStatus = $order->status;
            $newStatus = $this->mapPaymentStatus($realStatus);
            
            // Actualizar la orden
            $updateData = [
                'status' => $newStatus
            ];
            
            if ($paymentId) {
                $updateData['mercadopago_payment_id'] = $paymentId;
            }
            
            if ($paymentData) {
                // Preservar delivery_type si existe en payment_data anterior
                $previousPaymentData = $order->payment_data ?? [];
                if (is_string($previousPaymentData)) {
                    $previousPaymentData = json_decode($previousPaymentData, true) ?? [];
                }
                $paymentDataArray = is_array($paymentData) ? $paymentData : (array) $paymentData;
                if (isset($previousPaymentData['delivery_type'])) {
                    $paymentDataArray['delivery_type'] = $previousPaymentData['delivery_type'];
                }
                $updateData['payment_data'] = json_encode($paymentDataArray);
            }
            
            $order->update($updateData);

            // Procesar según el estado
            $processed = false;
            $message = '';
            
            if ($realStatus === 'approved' && $previousStatus !== 'pagado') {
                // Pago aprobado - procesar
                $this->handleApprovedPayment($order, $previousStatus);
                $processed = true;
                $message = '¡Pago aprobado! Tu pedido está siendo procesado.';
            } elseif ($realStatus === 'approved' && $previousStatus === 'pagado') {
                // Ya estaba procesado
                $processed = true;
                $message = 'Tu pedido ya fue procesado anteriormente.';
            } elseif (in_array($realStatus, ['pending', 'in_process'])) {
                $message = 'Tu pago está pendiente de confirmación.';
                if ($order->payment_method === 'oxxo') {
                    $message = 'Tu ticket de pago está listo. Tienes 72 horas para pagar en OXXO.';
                }
            } elseif ($realStatus === 'rejected') {
                $this->handleRejectedPayment($order);
                $message = 'El pago fue rechazado. Por favor intenta con otro método de pago.';
            } else {
                $message = 'Estado del pago: ' . $realStatus;
            }

            return response()->json([
                'success' => true,
                'payment_status' => $realStatus,
                'order_status' => $newStatus,
                'order_id' => $order->id,
                'processed' => $processed,
                'message' => $message,
                'order' => [
                    'id' => $order->id,
                    'total_amount' => $order->total_amount,
                    'status' => $newStatus,
                    'payment_method' => $order->payment_method,
                    'created_at' => $order->created_at->format('d/m/Y H:i')
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error verificando pago de MercadoPago', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar el pago: ' . $e->getMessage(),
                'payment_status' => 'error'
            ], 500);
        }
    }

    /**
     * Crear pago en efectivo (OXXO)
     */
    public function createOxxoPayment(Request $request)
    {
        $deliveryType = $request->input('delivery_type', 'envio');
        
        $rules = [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.barcode' => 'nullable|string',
            'delivery_type' => 'nullable|string|in:envio,retiro',
            'total_amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|in:oxxo,paycash'
        ];
        
        // address_id es requerido solo si es envío
        if ($deliveryType === 'envio') {
            $rules['address_id'] = 'required|exists:addresses,id';
        } else {
            $rules['address_id'] = 'nullable';
        }
        
        $validator = Validator::make($request->all(), $rules);

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
            // Verificar que la dirección pertenece al usuario solo si es envío
            $addressId = null;
            if ($deliveryType === 'envio') {
                $address = $user->addresses()->find($request->address_id);
                if (!$address) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Dirección no encontrada o no pertenece al usuario'
                    ], 404);
                }
                $addressId = $request->address_id;
            }

            DB::beginTransaction();

            // Generar referencia externa
            $externalReference = uniqid('oxxo_' . $user->id . '_');

            // Crear el pedido en la base de datos con estado pendiente de pago
            $order = Order::create([
                'user_id' => $user->id,
                'address_id' => $addressId,
                'total_amount' => $request->total_amount,
                'status' => 'pendiente_pago',
                'payment_method' => 'oxxo',
                'external_reference' => $externalReference
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

            // Preparar datos para MercadoPago - pago en efectivo
            $paymentData = [
                'transaction_amount' => (float) $request->total_amount,
                'description' => 'Pedido Cherry Central #' . $order->id,
                'payment_method_id' => $request->payment_method ?? 'oxxo',
                'payer' => [
                    'email' => $user->email,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name
                ],
                'external_reference' => $externalReference
            ];

            // Crear pago en efectivo con MercadoPago
            $payment = $this->mercadoPagoService->createCashPayment($paymentData);

            // Preparar payment_data con delivery_type incluido
            $paymentDataToStore = is_array($payment) ? $payment : (array) $payment;
            $paymentDataToStore['delivery_type'] = $deliveryType;

            // Actualizar el pedido con los datos del pago
            $order->update([
                'mercadopago_payment_id' => $payment->id,
                'payment_data' => json_encode($paymentDataToStore)
            ]);

            DB::commit();

            // Recargar el pedido con relaciones para el email
            $order->load(['user', 'address', 'items']);

            // Enviar email de confirmación al cliente (también en pendiente_pago para pruebas)
            Mail::to($user->email)->send(new OrderConfirmationMail($order));
            Log::info('Email de confirmación enviado al cliente (createOxxoPayment - pendiente_pago)', ['order_id' => $order->id]);

            // Obtener datos del ticket para mostrar al usuario
            $ticketData = [
                'payment_id' => $payment->id,
                'reference' => $payment->transaction_details->external_resource_url ?? null,
                'external_reference' => $externalReference,
                'barcode' => $payment->barcode->content ?? null,
                'expiration_date' => $payment->date_of_expiration ?? now()->addHours(72)->format('d/m/Y H:i'),
                'ticket_url' => $payment->transaction_details->external_resource_url ?? null
            ];

            // Notificar al admin
            $this->notifyAdminPaymentReceived($order, $user);

            return response()->json([
                'success' => true,
                'message' => 'Ticket de pago OXXO generado correctamente',
                'data' => [
                    'order_id' => $order->id,
                    'payment_id' => $payment->id,
                    'payment_status' => $payment->status,
                    'reference' => $ticketData['reference'] ?? $externalReference,
                    'external_reference' => $externalReference,
                    'barcode' => $ticketData['barcode'],
                    'expiration_date' => $ticketData['expiration_date'],
                    'ticket_url' => $ticketData['ticket_url'],
                    'total_amount' => $request->total_amount
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error creating OXXO payment', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al generar el ticket de pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener métodos de pago en efectivo disponibles
     */
    public function getCashPaymentMethods()
    {
        return response()->json([
            'success' => true,
            'methods' => $this->mercadoPagoService->getCashPaymentMethods()
        ]);
    }

    /**
     * Sincronizar estado de pago manualmente (para pagos pendientes)
     * Útil cuando el webhook no llegó o para verificar pagos antiguos
     */
    public function syncPaymentStatus($orderId)
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

            // Buscar la orden
            $order = Order::where('id', $orderId)
                ->where('user_id', $user->id)
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada o no pertenece al usuario'
                ], 404);
            }

            // Si no tiene payment_id de Mercado Pago, no se puede verificar
            if (!$order->mercadopago_payment_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden no tiene un ID de pago de Mercado Pago para verificar'
                ], 400);
            }

            $previousStatus = $order->status;

            // Obtener el estado actual del pago desde Mercado Pago
            $payment = $this->mercadoPagoService->getPayment($order->mercadopago_payment_id);
            $realStatus = $payment->status;
            $newStatus = $this->mapPaymentStatus($realStatus);

            Log::info('Sincronizando estado de pago', [
                'order_id' => $order->id,
                'payment_id' => $order->mercadopago_payment_id,
                'previous_status' => $previousStatus,
                'new_status' => $newStatus,
                'payment_status' => $realStatus
            ]);

            // Preservar delivery_type si existe en payment_data anterior
            $previousPaymentData = $order->payment_data ?? [];
            if (is_string($previousPaymentData)) {
                $previousPaymentData = json_decode($previousPaymentData, true) ?? [];
            }
            $paymentArray = is_array($payment) ? $payment : (array) $payment;
            if (isset($previousPaymentData['delivery_type'])) {
                $paymentArray['delivery_type'] = $previousPaymentData['delivery_type'];
            }
            
            // Actualizar la orden
            $order->update([
                'status' => $newStatus,
                'payment_data' => json_encode($paymentArray)
            ]);

            // Procesar según el estado
            $processed = false;
            $message = '';

            if ($realStatus === 'approved' && $previousStatus !== 'pagado') {
                // Pago aprobado - procesar
                $this->handleApprovedPayment($order, $previousStatus);
                $processed = true;
                $message = '¡Pago aprobado! Tu pedido está siendo procesado.';
            } elseif ($realStatus === 'approved' && $previousStatus === 'pagado') {
                $processed = true;
                $message = 'Tu pedido ya fue procesado anteriormente.';
            } elseif (in_array($realStatus, ['pending', 'in_process'])) {
                $message = 'Tu pago sigue pendiente de confirmación.';
                if ($order->payment_method === 'oxxo') {
                    $message = 'Tu ticket de pago sigue pendiente. Tienes 72 horas para pagar en OXXO.';
                }
            } elseif ($realStatus === 'rejected') {
                $this->handleRejectedPayment($order);
                $message = 'El pago fue rechazado. Por favor intenta con otro método de pago.';
            } elseif ($realStatus === 'cancelled') {
                $this->handleCancelledPayment($order, $previousStatus);
                $message = 'El pago fue cancelado.';
            } else {
                $message = 'Estado del pago: ' . $realStatus;
            }

            return response()->json([
                'success' => true,
                'payment_status' => $realStatus,
                'order_status' => $newStatus,
                'previous_status' => $previousStatus,
                'processed' => $processed,
                'message' => $message,
                'order' => [
                    'id' => $order->id,
                    'total_amount' => $order->total_amount,
                    'status' => $newStatus,
                    'payment_method' => $order->payment_method
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error sincronizando estado de pago', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al sincronizar el estado del pago: ' . $e->getMessage()
            ], 500);
        }
    }
}
