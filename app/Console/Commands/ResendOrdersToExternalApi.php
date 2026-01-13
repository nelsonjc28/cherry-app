<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use App\Services\ExternalSalesService;
use Illuminate\Support\Facades\Log;

class ResendOrdersToExternalApi extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:resend-external-api 
                            {--order-id= : ID específico de orden a reenviar}
                            {--all : Reenviar todos los pedidos que deberían haberse enviado}
                            {--dry-run : Solo mostrar qué se enviaría sin enviarlo realmente}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reenviar pedidos a la API externa que deberían haberse enviado pero no se enviaron';

    protected $externalSalesService;

    public function __construct(ExternalSalesService $externalSalesService)
    {
        parent::__construct();
        $this->externalSalesService = $externalSalesService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $orderId = $this->option('order-id');
        $all = $this->option('all');
        $dryRun = $this->option('dry-run');

        if (!$orderId && !$all) {
            $this->error('Debes especificar --order-id=<ID> o --all para reenviar todos');
            return 1;
        }

        $query = Order::with(['user', 'items', 'address']);

        if ($orderId) {
            $query->where('id', $orderId);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        if ($orders->isEmpty()) {
            $this->info('No se encontraron pedidos.');
            return 0;
        }

        $this->info("=== Reenvío de Pedidos a API Externa ===\n");
        if ($dryRun) {
            $this->warn("⚠️  MODO DRY-RUN: No se enviará nada realmente\n");
        }

        $toSend = [];
        $skipped = [];

        foreach ($orders as $order) {
            $paymentData = $order->payment_data ?? [];
            if (is_string($paymentData)) {
                $paymentData = json_decode($paymentData, true) ?? [];
            }

            $isSent = isset($paymentData['external_api_sent']) && $paymentData['external_api_sent'] === true;
            $amountPending = (float) ($order->amount_pending ?? 0);

            // Determinar si este pedido debería haberse enviado
            $shouldBeSent = false;
            $reason = '';

            if ($isSent) {
                $skipped[] = [
                    'order' => $order,
                    'reason' => 'Ya fue enviado anteriormente'
                ];
                continue;
            }

            // Pedidos anticipados: deberían enviarse inmediatamente al crearse
            if ($order->is_advance_order) {
                $shouldBeSent = true;
                $reason = 'Pedido anticipado';
            }
            // Pedidos con crédito completo: deberían enviarse inmediatamente al crearse
            elseif ($order->paid_with_credit && $amountPending == 0 && $order->status === 'pagado') {
                $shouldBeSent = true;
                $reason = 'Pedido con crédito completo';
            }
            // Pedidos con crédito parcial completados: deberían enviarse cuando se completa el pago
            elseif ($order->paid_with_credit && $order->status === 'pagado' && $amountPending == 0) {
                $shouldBeSent = true;
                $reason = 'Pedido con crédito parcial completado';
            }
            // Pedidos normales pagados: deberían enviarse cuando se marca como pagado
            elseif ($order->status === 'pagado' && !$order->paid_with_credit && !$order->is_advance_order) {
                $shouldBeSent = true;
                $reason = 'Pedido normal pagado';
            }
            // Pedidos con crédito parcial pendiente: NO deberían enviarse todavía
            elseif ($order->paid_with_credit && $amountPending > 0) {
                $skipped[] = [
                    'order' => $order,
                    'reason' => 'Tiene saldo pendiente (comportamiento correcto)'
                ];
                continue;
            }
            // Pedidos pendientes normales: NO deberían enviarse todavía
            elseif ($order->status !== 'pagado') {
                $skipped[] = [
                    'order' => $order,
                    'reason' => 'Estado: ' . $order->status . ' (no está pagado)'
                ];
                continue;
            }

            if ($shouldBeSent) {
                $toSend[] = [
                    'order' => $order,
                    'reason' => $reason
                ];
            }
        }

        if (empty($toSend)) {
            $this->info('No hay pedidos que necesiten ser reenviados.');
            if (!empty($skipped)) {
                $this->info("\nPedidos omitidos:");
                foreach ($skipped as $item) {
                    $this->line("  - Pedido #{$item['order']->id}: {$item['reason']}");
                }
            }
            return 0;
        }

        $this->info("Pedidos a reenviar: " . count($toSend) . "\n");

        $successCount = 0;
        $errorCount = 0;

        foreach ($toSend as $item) {
            $order = $item['order'];
            $reason = $item['reason'];

            $this->line("Procesando Pedido #{$order->id} ({$reason})...");

            if ($dryRun) {
                $this->info("  [DRY-RUN] Se enviaría a la API externa");
                $successCount++;
                continue;
            }

            try {
                // Verificar nuevamente antes de enviar
                $paymentData = $order->payment_data ?? [];
                if (is_string($paymentData)) {
                    $paymentData = json_decode($paymentData, true) ?? [];
                }

                $alreadySent = isset($paymentData['external_api_sent']) && $paymentData['external_api_sent'] === true;

                if ($alreadySent) {
                    $this->warn("  ⚠️  Ya fue enviado, omitiendo...");
                    continue;
                }

                // Enviar a la API externa
                $this->externalSalesService->sendSaleToExternalApi($order);

                // Marcar que ya se envió
                $paymentData['external_api_sent'] = true;
                $paymentData['external_api_sent_at'] = now()->toIso8601String();
                $paymentData['resent_at'] = now()->toIso8601String();
                $paymentData['resent_reason'] = $reason;
                $order->update(['payment_data' => json_encode($paymentData)]);

                $this->info("  ✅ Enviado exitosamente");
                $successCount++;

                Log::info('Pedido reenviado a API externa manualmente', [
                    'order_id' => $order->id,
                    'reason' => $reason
                ]);

            } catch (\Exception $e) {
                $this->error("  ❌ Error: " . $e->getMessage());
                $errorCount++;

                Log::error('Error al reenviar pedido a API externa', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }

        $this->info("\n=== Resumen ===");
        $this->info("✅ Enviados exitosamente: {$successCount}");
        if ($errorCount > 0) {
            $this->error("❌ Errores: {$errorCount}");
        }

        return 0;
    }
}
