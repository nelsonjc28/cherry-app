<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\ExternalSalesService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncOrdersExternalApi extends Command
{
    protected $signature = 'orders:sync-external-api
                            {--order-id= : ID específico de orden}
                            {--limit=100 : Máximo de pedidos a procesar por ejecución}
                            {--max-attempts=3 : Reintentos por pedido en esta ejecución}
                            {--dry-run : Solo listar pedidos pendientes sin enviar}';

    protected $description = 'Envía a la API externa los pedidos con external_api_sent=false que deben estar registrados';

    protected $aliases = ['orders:resend-external-api'];

    public function __construct(
        protected ExternalSalesService $externalSalesService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $orderId = $this->option('order-id');
        $limit = max(1, (int) $this->option('limit'));
        $maxAttempts = max(1, (int) $this->option('max-attempts'));
        $dryRun = (bool) $this->option('dry-run');

        $query = Order::with(['user', 'items', 'address'])
            ->where('external_api_sent', false)
            ->orderBy('created_at', 'asc');

        if ($orderId) {
            $query->where('id', $orderId);
        }

        $candidates = $query->limit($limit * 3)->get()->filter(
            fn (Order $order) => $order->shouldSendToExternalApi()
        )->take($limit);

        if ($candidates->isEmpty()) {
            $this->info('No hay pedidos pendientes de envío a la API externa.');

            return self::SUCCESS;
        }

        $this->info('=== Sincronización API externa ===');
        $this->info('Pedidos a procesar: '.$candidates->count());
        if ($dryRun) {
            $this->warn('Modo dry-run: no se enviará nada.');
        }
        $this->newLine();

        $sent = 0;
        $failed = 0;
        $skipped = 0;

        foreach ($candidates as $order) {
            if (! $order->shouldSendToExternalApi()) {
                $skipped++;
                continue;
            }

            $label = '#'.$order->id.' ('.$order->orderNumberPrefixForDisplay().str_pad((string) $order->id, 4, '0', STR_PAD_LEFT).')';
            $this->line("Procesando {$label}...");

            if ($dryRun) {
                $this->info('  [dry-run] Se enviaría a la API externa');
                continue;
            }

            $success = false;
            $lastError = null;

            for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
                try {
                    $order->refresh();
                    if ($order->external_api_sent) {
                        $success = true;
                        break;
                    }

                    $this->externalSalesService->sendSaleToExternalApi($order, 'comando');
                    $order->refresh();

                    if ($order->external_api_sent) {
                        $success = true;
                        break;
                    }
                } catch (\Exception $e) {
                    $lastError = $e->getMessage();
                    $this->warn("  Intento {$attempt}/{$maxAttempts} falló: {$lastError}");

                    if ($attempt < $maxAttempts) {
                        sleep(2);
                    }
                }
            }

            if ($success || $order->fresh()->external_api_sent) {
                $this->info('  Enviado y marcado como external_api_sent=true');
                $sent++;

                Log::info('Pedido sincronizado con API externa (comando)', [
                    'order_id' => $order->id,
                ]);
            } else {
                $this->error('  No se pudo enviar'.($lastError ? ": {$lastError}" : ''));
                $failed++;

                Log::error('Fallo sincronización API externa (comando)', [
                    'order_id' => $order->id,
                    'error' => $lastError,
                ]);
            }
        }

        $this->newLine();
        $this->info("Enviados: {$sent}");
        if ($failed > 0) {
            $this->error("Fallidos: {$failed}");
        }
        if ($skipped > 0) {
            $this->line("Omitidos: {$skipped}");
        }

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
