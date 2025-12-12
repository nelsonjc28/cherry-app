<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Address;
use App\Services\ExternalSalesService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class TestExternalApiController extends Controller
{
    protected $externalSalesService;

    public function __construct(ExternalSalesService $externalSalesService)
    {
        $this->externalSalesService = $externalSalesService;
    }

    /**
     * Crear una orden de prueba desde el carrito y enviarla a la API externa
     * O usar una orden existente si se proporciona order_id
     */
    public function testPayment(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        // Si se proporciona order_id, usar esa orden existente
        $orderId = $request->input('order_id');
        if ($orderId) {
            // Buscar la orden por ID (puede ser número con ceros a la izquierda o solo el número)
            $orderIdNumber = (int) str_replace('0', '', $orderId);
            if ($orderIdNumber == 0) {
                $orderIdNumber = (int) $orderId;
            }
            
            $order = Order::with(['user', 'address', 'items'])->find($orderIdNumber);
            
            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => "No se encontró la orden #{$orderId}"
                ], 404);
            }
            
            // Verificar que el usuario tenga permiso (opcional, puedes quitarlo si quieres)
            // if ($order->user_id !== $user->id && !$user->is_admin) {
            //     return response()->json([
            //         'success' => false,
            //         'message' => 'No tienes permiso para acceder a esta orden'
            //     ], 403);
            // }
        } else {
            // Crear orden desde el carrito (código original)
            // Obtener el carrito del usuario
            $cart = Cart::where('user_id', $user->id)->first();
            
            if (!$cart || empty($cart->items)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El carrito está vacío. Agrega productos al carrito primero.'
                ], 400);
            }

            // Obtener la dirección del usuario (o crear una temporal)
            $address = Address::where('user_id', $user->id)->where('is_default', true)->first();
            
            if (!$address) {
                $address = Address::where('user_id', $user->id)->first();
            }

            // Crear una orden temporal de prueba
            $testPaymentId = 'TEST_' . time();
            $order = Order::create([
                'user_id' => $user->id,
                'address_id' => $address ? $address->id : null,
                'status' => 'pagado',
                'total_amount' => $cart->total_price ?? 0,
                'payment_method' => 'test',
                'payment_data' => [
                    'delivery_type' => $request->input('delivery_type', $address ? 'envio' : 'retiro'),
                    'test' => true
                ],
                'mercadopago_payment_id' => $testPaymentId,
                'external_reference' => $testPaymentId
            ]);

            // Crear items de la orden desde el carrito
            $totalAmount = 0;
            foreach ($cart->items as $cartItem) {
                $itemPrice = $cartItem['precio'] ?? $cartItem['price'] ?? 0;
                $itemQuantity = $cartItem['quantity'] ?? 0;
                $subtotal = $itemPrice * $itemQuantity;
                $totalAmount += $subtotal;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $cartItem['id_articulo'] ?? $cartItem['product_id'] ?? null,
                    'name' => $cartItem['title'] ?? 'Producto de prueba',
                    'quantity' => $itemQuantity,
                    'price' => $itemPrice,
                    'subtotal' => $subtotal,
                    'size' => $cartItem['selectedSize'] ?? null,
                    'color' => $cartItem['selectedColor'] ?? null,
                    'barcode' => $cartItem['barcode'] ?? null
                ]);
            }

            // Actualizar el total de la orden
            $order->update(['total_amount' => $totalAmount]);

            // Cargar relaciones necesarias
            $order->load(['user', 'address', 'items']);
        }

        // Log del id_cliente antes de enviar
        $idClienteFormateado = (int) str_pad((string) ($order->user->id ?? $user->id), 12, '0', STR_PAD_LEFT);
        Log::info('TestExternalApi: id_cliente formateado', [
            'user_id_original' => $order->user->id ?? $user->id,
            'id_cliente_formateado' => $idClienteFormateado,
            'id_cliente_string' => str_pad((string) ($order->user->id ?? $user->id), 12, '0', STR_PAD_LEFT)
        ]);
        
        // Enviar a la API externa (lanzará excepción si hay error)
        try {
            $this->externalSalesService->sendSaleToExternalApi($order);
        } catch (\Exception $e) {
            // Capturar excepción y retornar con el payload enviado
            $payload = $e->payload ?? null;
            $responseData = $e->response ?? null;
            
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'payload_sent' => $payload,
                'api_response' => $responseData,
                'order' => [
                    'id' => $order->id,
                    'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'total_amount' => $order->total_amount,
                    'items_count' => $order->items->count(),
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->first_name . ' ' . $user->last_name,
                        'email' => $user->email
                    ],
                    'address' => $order->address ? [
                        'street_address' => $order->address->street_address,
                        'city' => $order->address->city,
                        'state' => $order->address->state
                    ] : null
                ],
                'api_url' => 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/venta'
            ], $e->getCode() ?: 500);
        }
        
        // Preparar respuesta con información detallada
        $response = [
            'success' => true,
            'message' => 'Pago de prueba enviado exitosamente a la API externa',
            'order' => [
                'id' => $order->id,
                'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                'total_amount' => $order->total_amount,
                'items_count' => $order->items->count(),
                'user' => [
                    'id' => $order->user->id ?? $user->id,
                    'name' => ($order->user->first_name ?? '') . ' ' . ($order->user->last_name ?? ''),
                    'email' => $order->user->email ?? $user->email
                ],
                'address' => $order->address ? [
                    'street_address' => $order->address->street_address,
                    'city' => $order->address->city,
                    'state' => $order->address->state
                ] : null
            ],
            'note' => $orderId ? 'Usando orden existente #' . str_pad($order->id, 8, '0', STR_PAD_LEFT) : 'Esta es una orden de prueba. Puedes eliminarla después de verificar.',
            'api_url' => 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/venta'
        ];

        // Log detallado
        Log::info('Prueba de envío a API externa', [
            'user_id' => $order->user_id ?? $user->id,
            'order_id' => $order->id,
            'success' => true,
            'items_count' => $order->items->count(),
            'using_existing_order' => !empty($orderId)
        ]);

        return response()->json($response);
    }

    /**
     * Obtener información del carrito para mostrar en la página de prueba
     */
    public function getCartInfo()
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $cart = Cart::where('user_id', $user->id)->first();

        return response()->json([
            'success' => true,
            'cart' => $cart ? [
                'items' => $cart->items ?? [],
                'total_items' => $cart->total_items ?? 0,
                'total_price' => $cart->total_price ?? 0
            ] : null,
            'user' => [
                'id' => $user->id,
                'name' => $user->first_name . ' ' . $user->last_name,
                'email' => $user->email
            ]
        ]);
    }
}

