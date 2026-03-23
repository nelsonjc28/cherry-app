<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Services\MercadoPagoService;
use App\Mail\OrderConfirmationMail;

class PaymentStatusController extends Controller
{
    protected $mercadoPagoService;

    public function __construct(MercadoPagoService $mercadoPagoService)
    {
        $this->mercadoPagoService = $mercadoPagoService;
    }

    /**
     * Mapear payment_method_id de MercadoPago a nombre legible
     */
    private function mapPaymentMethodId($paymentMethodId)
    {
        if (!$paymentMethodId) {
            return 'mercadopago';
        }

        // Métodos de pago en efectivo
        $cashMethods = [
            'oxxo' => 'OXXO',
            'seven_eleven' => '7-Eleven',
            'extra' => 'Extra',
            'farmacias_del_ahorro' => 'Farmacias del Ahorro',
            'farmacias_benavides' => 'Farmacias Benavides',
            'farmacias_guadalajara' => 'Farmacias Guadalajara',
            'farmacias_similares' => 'Farmacias Similares',
            'soriana' => 'Soriana',
            'cfe' => 'CFE',
            'banamex' => 'Banamex',
            'bancomer' => 'Bancomer',
            'santander' => 'Santander',
            'hsbc' => 'HSBC',
            'scotiabank' => 'Scotiabank',
        ];

        // Métodos de tarjeta
        $cardMethods = [
            'visa' => 'Tarjeta',
            'master' => 'Tarjeta',
            'amex' => 'Tarjeta',
            'diners' => 'Tarjeta',
            'elo' => 'Tarjeta',
            'cabal' => 'Tarjeta',
            'naranja' => 'Tarjeta',
            'nativa' => 'Tarjeta',
            'tarshop' => 'Tarjeta',
            'cencosud' => 'Tarjeta',
            'argencard' => 'Tarjeta',
        ];

        // Otros métodos
        $otherMethods = [
            'account_money' => 'Saldo en cuenta',
            'debit_card' => 'Tarjeta de débito',
            'credit_card' => 'Tarjeta de crédito',
            'bank_transfer' => 'Transferencia bancaria',
            'atm' => 'Cajero automático',
            'ticket' => 'Ticket',
        ];

        // Buscar en métodos de efectivo
        if (isset($cashMethods[$paymentMethodId])) {
            return $cashMethods[$paymentMethodId];
        }

        // Buscar en métodos de tarjeta
        if (isset($cardMethods[$paymentMethodId])) {
            return $cardMethods[$paymentMethodId];
        }

        // Buscar en otros métodos
        if (isset($otherMethods[$paymentMethodId])) {
            return $otherMethods[$paymentMethodId];
        }

        // Si no se encuentra, capitalizar la primera letra
        return ucfirst(str_replace('_', ' ', $paymentMethodId));
    }

    /**
     * Verificar el estado actual de un pago en MercadoPago
     */
    public function checkPaymentStatus(Request $request, $orderId)
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
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Orden no encontrada'
            ], 404);
        }

        // Si la orden ya está pagada, no necesitamos verificar (incluye pago con crédito sin MP)
        if ($order->isPaid()) {
            $order->load(['items', 'address']);

            return response()->json([
                'success' => true,
                'payment_status' => 'approved',
                'order_status' => $order->status,
                'message' => 'El pago ya fue aprobado',
                'order' => $order,
            ]);
        }

        // Sin Mercado Pago (ej. solo crédito aún marcado como pendiente): devolver la orden para la UI
        if (! $order->mercadopago_payment_id) {
            $order->load(['items', 'address']);

            return response()->json([
                'success' => true,
                'payment_status' => 'pending',
                'order_status' => $order->status,
                'message' => 'Estado del pedido consultado',
                'order' => $order,
            ]);
        }

        try {
            // Obtener el estado actual del pago desde MercadoPago
            $payment = $this->mercadoPagoService->getPayment($order->mercadopago_payment_id);
            
            // Mapear el estado del pago al estado de la orden
            $orderStatusMap = [
                'approved' => 'pagado',
                'pending' => 'pendiente_pago',
                'in_process' => 'pendiente_pago',
                'rejected' => 'pago_rechazado',
                'cancelled' => 'cancelado'
            ];

            $newOrderStatus = $orderStatusMap[$payment->status] ?? 'pendiente_pago';

            // Mapear payment_method_id a nombre legible
            $paymentMethodId = $payment->payment_method_id ?? null;
            $paymentMethod = $this->mapPaymentMethodId($paymentMethodId);
            
            // Si el estado cambió, actualizar la orden
            if ($order->status !== $newOrderStatus) {
                $previousStatus = $order->status;
                $order->update([
                    'status' => $newOrderStatus,
                    'payment_method' => $paymentMethod,
                    'payment_data' => json_encode($payment)
                ]);

                // Si el pago fue aprobado, enviar a API externa
                // NOTA: El email se envía desde el webhook (handleApprovedPayment) para evitar duplicados
                if ($payment->status === 'approved' && $newOrderStatus === 'pagado' && $previousStatus !== 'pagado') {
                    // Enviar a API externa (lanzará excepción si hay error)
                        $externalSalesService = app(\App\Services\ExternalSalesService::class);
                        $externalSalesService->sendSaleToExternalApi($order);
                    
                    // El email se envía desde el webhook para evitar duplicados
                    // Si el webhook no se ejecutó por alguna razón, se puede llamar handleApprovedPayment aquí
                    // Pero por ahora, confiamos en que el webhook se ejecutará
                }
            }

            $order->refresh()->load(['items', 'address']);

            return response()->json([
                'success' => true,
                'payment_status' => $payment->status,
                'order_status' => $newOrderStatus,
                'requires_polling' => in_array($payment->status, ['pending', 'in_process']),
                'status_detail' => $payment->status_detail ?? null,
                'order' => $order,
            ]);

        } catch (\Exception $e) {
            Log::error('Error al verificar estado del pago', [
                'order_id' => $orderId,
                'payment_id' => $order->mercadopago_payment_id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al verificar el estado del pago'
            ], 500);
        }
    }
}

