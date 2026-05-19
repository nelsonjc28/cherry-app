<?php

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;

class CheckOrdersSentToExternalApi extends Command
{
    protected $signature = 'orders:check-external-api
                            {--order-id= : ID específico de orden a verificar}
                            {--status= : Filtrar por estado (pagado, pendiente_pago, etc)}
                            {--not-sent : Mostrar solo pedidos NO enviados}';

    protected $description = 'Verificar qué pedidos se han enviado a la API externa (columna orders.external_api_sent)';

    public function handle(): int
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

            return self::SUCCESS;
        }

        $this->info("=== Verificación de Envío a API Externa ===\n");
        $this->info('Total de pedidos encontrados: '.$orders->count()."\n");

        $sentCount = 0;
        $notSentCount = 0;
        $tableData = [];

        foreach ($orders as $order) {
            $isSent = (bool) $order->external_api_sent;
            $sentAt = $order->external_api_sent_at?->format('Y-m-d H:i:s');
            $shouldSend = $order->shouldSendToExternalApi();

            if ($notSent && $isSent) {
                continue;
            }

            if ($isSent) {
                $sentCount++;
            } else {
                $notSentCount++;
            }

            $orderType = $order->is_advance_order
                ? 'Anticipado'
                : ($order->paid_with_credit ? 'Crédito' : 'Normal');

            $apiStatus = $isSent
                ? 'Enviado'
                : ($shouldSend ? 'Pendiente envío' : 'No aplica aún');

            $tableData[] = [
                'ID' => $order->id,
                'Tipo' => $orderType,
                'Estado' => $order->status,
                'Total' => '$'.number_format((float) $order->total_amount, 2),
                'API' => $apiStatus,
                'Fecha Envío' => $sentAt ?? '-',
                'Creado' => $order->created_at->format('Y-m-d H:i:s'),
                'Usuario' => $order->user ? $order->user->first_name.' '.$order->user->last_name : 'N/A',
            ];
        }

        if (empty($tableData)) {
            $this->info('No hay pedidos que coincidan con los filtros.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Tipo', 'Estado', 'Total', 'API', 'Fecha Envío', 'Creado', 'Usuario'],
            $tableData
        );

        $this->info("\n=== Resumen ===");
        $this->info("Enviados: {$sentCount}");
        $this->info("No enviados: {$notSentCount}");

        $pending = $orders->filter(fn (Order $o) => ! $o->external_api_sent && $o->shouldSendToExternalApi());
        if ($pending->isNotEmpty()) {
            $this->warn("\nPedidos que deberían enviarse (ejecutar orders:sync-external-api):");
            foreach ($pending as $order) {
                $this->line("  - #{$order->id} ({$order->status})");
            }
        }

        return self::SUCCESS;
    }
}
