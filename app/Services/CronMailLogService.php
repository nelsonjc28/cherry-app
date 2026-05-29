<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CronMailLog;
use App\Models\Order;
use Illuminate\Support\Facades\Log;

class CronMailLogService
{
    public function record(
        string $comando,
        string $tipoCorreo,
        string $estado,
        ?string $emailDestino = null,
        ?int $userId = null,
        ?int $cartId = null,
        ?int $orderId = null,
        ?string $mensaje = null,
        string $origen = 'comando',
    ): void {
        try {
            CronMailLog::create([
                'comando' => $comando,
                'tipo_correo' => $tipoCorreo,
                'estado' => $estado,
                'user_id' => $userId,
                'cart_id' => $cartId,
                'order_id' => $orderId,
                'email_destino' => $emailDestino,
                'mensaje' => $mensaje,
                'origen' => $origen,
                'ejecutado_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('No se pudo guardar historial de correo cron', [
                'comando' => $comando,
                'tipo_correo' => $tipoCorreo,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function recordSuccess(
        string $comando,
        string $tipoCorreo,
        string $emailDestino,
        ?int $userId = null,
        ?int $cartId = null,
        ?int $orderId = null,
        ?string $mensaje = null,
        string $origen = 'comando',
    ): void {
        $this->record(
            $comando,
            $tipoCorreo,
            CronMailLog::ESTADO_EXITOSO,
            $emailDestino,
            $userId,
            $cartId,
            $orderId,
            $mensaje ?? 'Correo encolado correctamente',
            $origen,
        );
    }

    public function recordError(
        string $comando,
        string $tipoCorreo,
        string $mensaje,
        ?string $emailDestino = null,
        ?int $userId = null,
        ?int $cartId = null,
        ?int $orderId = null,
        string $origen = 'comando',
    ): void {
        $this->record(
            $comando,
            $tipoCorreo,
            CronMailLog::ESTADO_ERROR,
            $emailDestino,
            $userId,
            $cartId,
            $orderId,
            $mensaje,
            $origen,
        );
    }

    public function recordSkipped(
        string $comando,
        string $tipoCorreo,
        string $mensaje,
        ?int $userId = null,
        ?int $cartId = null,
        ?int $orderId = null,
    ): void {
        $this->record(
            $comando,
            $tipoCorreo,
            CronMailLog::ESTADO_OMITIDO,
            null,
            $userId,
            $cartId,
            $orderId,
            $mensaje,
            'comando',
        );
    }

    /**
     * @param  array{encolados: int, errores: int, omitidos: int}  $stats
     */
    public function recordExecutionSummary(string $comando, array $stats, string $origen = 'comando'): void
    {
        $encolados = (int) ($stats['encolados'] ?? 0);
        $errores = (int) ($stats['errores'] ?? 0);
        $omitidos = (int) ($stats['omitidos'] ?? 0);

        $estado = $errores > 0 ? CronMailLog::ESTADO_ERROR : CronMailLog::ESTADO_EXITOSO;
        $mensaje = json_encode([
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
        ], JSON_UNESCAPED_UNICODE);

        $this->record(
            $comando,
            CronMailLog::TIPO_RESUMEN,
            $estado,
            null,
            null,
            null,
            null,
            $mensaje,
            $origen,
        );
    }

    /** Carritos elegibles para mail:abandoned-cart (misma regla que el comando). */
    public function abandonedCartCandidatesQuery()
    {
        $staleCart = now()->subHours(48);
        $notifyGap = now()->subHours(48);

        return Cart::query()
            ->with('user')
            ->where('total_items', '>', 0)
            ->whereNotNull('items')
            ->where('updated_at', '<=', $staleCart)
            ->where(function ($q) use ($notifyGap) {
                $q->whereNull('last_notified_at')
                    ->orWhere('last_notified_at', '<=', $notifyGap);
            })
            ->whereHas('user', function ($q) {
                $q->whereNotNull('email')->where('email', '!=', '');
            });
    }

    /** Pedidos elegibles para mail:order-status-update. */
    public function orderStatusCandidatesQuery()
    {
        return Order::query()
            ->with(['user', 'items'])
            ->whereIn('status', ['enviado', 'entregado'])
            ->where(function ($q) {
                $q->whereNull('fulfillment_email_last_status')
                    ->orWhereColumn('fulfillment_email_last_status', '!=', 'status');
            })
            ->whereHas('user', function ($q) {
                $q->whereNotNull('email')->where('email', '!=', '');
            });
    }
}
