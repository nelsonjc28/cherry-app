<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

class CheckOrdersSentToExternalApi extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:check-external-api {--order-id= : ID específico de orden a verificar} {--status= : Filtrar por estado (pagado, pendiente_pago, etc)} {--not-sent : Mostrar solo pedidos NO enviados}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verificar qué pedidos se han enviado a la API externa y cuáles no';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $orderId = $this->option('order-id');
        $status = $this->option('status');
        $notSent = $this->option('not-sent');

        $query = Order::with(['user', 'items']);

        if ($orderId) {
            $query->where('id', $orderId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        if ($orders->isEmpty()) {
            $this->info('No se encontraron pedidos con los filtros especificados.');
            return;
        }

        $this->info("=== Verificación de Envío a API Externa ===\n");
        $this->info("Total de pedidos encontrados: " . $orders->count() . "\n");

        $sentCount = 0;
        $notSentCount = 0;
        $tableData = [];

        foreach ($orders as $order) {
            $paymentData = $order->payment_data ?? [];
            if (is_string($paymentData)) {
                $paymentData = json_decode($paymentData, true) ?? [];
            }

            $isSent = isset($paymentData['external_api_sent']) && $paymentData['external_api_sent'] === true;
            $sentAt = $paymentData['external_api_sent_at'] ?? null;
            
            $orderType = '';
            if ($order->is_advance_order) {
                $orderType = 'Anticipado';
            } elseif ($order->paid_with_credit) {
                $orderType = 'Crédito';
            } else {
                $orderType = 'Normal';
            }

            if ($notSent && $isSent) {
                continue; // Saltar si solo queremos los no enviados
            }

            if ($isSent) {
                $sentCount++;
            } else {
                $notSentCount++;
            }

            $tableData[] = [
                'ID' => $order->id,
                'Tipo' => $orderType,
                'Estado' => $order->status,
                'Total' => '$' . number_format($order->total_amount, 2),
                'Enviado' => $isSent ? '✅ Sí' : '❌ No',
                'Fecha Envío' => $sentAt ? date('Y-m-d H:i:s', strtotime($sentAt)) : '-',
                'Creado' => $order->created_at->format('Y-m-d H:i:s'),
                'Usuario' => $order->user ? $order->user->first_name . ' ' . $order->user->last_name : 'N/A'
            ];
        }

        if (empty($tableData)) {
            $this->info('No hay pedidos que coincidan con los filtros.');
            return;
        }

        $this->table(
            ['ID', 'Tipo', 'Estado', 'Total', 'Enviado', 'Fecha Envío', 'Creado', 'Usuario'],
            $tableData
        );

        $this->info("\n=== Resumen ===");
        $this->info("✅ Enviados: {$sentCount}");
        $this->info("❌ No enviados: {$notSentCount}");

        // Mostrar detalles de pedidos no enviados que deberían haberse enviado
        if ($notSentCount > 0) {
            $this->info("\n=== Pedidos NO enviados que deberían haberse enviado ===");
            foreach ($orders as $order) {
                $paymentData = $order->payment_data ?? [];
                if (is_string($paymentData)) {
                    $paymentData = json_decode($paymentData, true) ?? [];
                }

                $isSent = isset($paymentData['external_api_sent']) && $paymentData['external_api_sent'] === true;
                
                if (!$isSent) {
                    $shouldBeSent = false;
                    $reason = '';
                    $amountPending = (float) ($order->amount_pending ?? 0);

                    // Pedidos anticipados: deberían enviarse inmediatamente al crearse (createAdvanceOrder línea 2592)
                    if ($order->is_advance_order) {
                        $shouldBeSent = true;
                        $reason = 'Pedido anticipado (debe enviarse inmediatamente al crearse)';
                    }
                    // Pedidos con crédito completo (amount_pending = 0): deberían enviarse inmediatamente al crearse (processCreditPayment línea 2446)
                    elseif ($order->paid_with_credit && $amountPending == 0 && $order->status === 'pagado') {
                        $shouldBeSent = true;
                        $reason = 'Pedido con crédito completo (debe enviarse inmediatamente al crearse)';
                    }
                    // Pedidos con crédito parcial que se completaron (status = pagado, amount_pending = 0): deberían enviarse cuando se completa el pago (handleApprovedPayment línea 480)
                    elseif ($order->paid_with_credit && $order->status === 'pagado' && $amountPending == 0) {
                        $shouldBeSent = true;
                        $reason = 'Pedido con crédito parcial completado (debe enviarse cuando se completa el pago pendiente vía webhook)';
                    }
                    // Pedidos normales pagados: deberían enviarse cuando se marca como pagado o cuando el webhook procesa el pago (handleApprovedPayment línea 480)
                    elseif ($order->status === 'pagado' && !$order->paid_with_credit && !$order->is_advance_order) {
                        $shouldBeSent = true;
                        $reason = 'Pedido normal pagado (debe enviarse cuando se marca como pagado o procesa el webhook)';
                    }
                    // Pedidos con crédito parcial que aún tienen saldo pendiente: NO deberían enviarse hasta completar el pago (correcto comportamiento)
                    elseif ($order->paid_with_credit && $amountPending > 0) {
                        $shouldBeSent = false;
                        $reason = 'Pedido con crédito parcial pendiente (NO debe enviarse hasta completar el pago - comportamiento correcto)';
                    }

                    if ($shouldBeSent) {
                        $this->warn("  - Pedido #{$order->id}: {$reason}");
                        $this->line("    Estado: {$order->status}, Tipo: " . ($order->is_advance_order ? 'Anticipado' : ($order->paid_with_credit ? 'Crédito' : 'Normal')));
                    }
                }
            }
        }
    }
}
