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

        // Si la orden ya está pagada, no necesitamos verificar
        if ($order->isPaid()) {
            return response()->json([
                'success' => true,
                'payment_status' => 'approved',
                'order_status' => $order->status,
                'message' => 'El pago ya fue aprobado'
            ]);
        }

        // Si no hay payment_id de MercadoPago, no podemos verificar
        if (!$order->mercadopago_payment_id) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede verificar el estado del pago'
            ], 400);
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

            // Si el estado cambió, actualizar la orden
            if ($order->status !== $newOrderStatus) {
                $previousStatus = $order->status;
                $order->update([
                    'status' => $newOrderStatus,
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

            return response()->json([
                'success' => true,
                'payment_status' => $payment->status,
                'order_status' => $newOrderStatus,
                'requires_polling' => in_array($payment->status, ['pending', 'in_process']),
                'status_detail' => $payment->status_detail ?? null
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

