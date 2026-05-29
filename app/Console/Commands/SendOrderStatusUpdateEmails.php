<?php

namespace App\Console\Commands;

use App\Mail\OrderStatusEmail;
use App\Models\CronMailLog;
use App\Services\CronMailLogService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrderStatusUpdateEmails extends Command
{
    protected $signature = 'mail:order-status-update';

    protected $description = 'Encola correos cuando el pedido pasa a Enviado o Entregado (una vez por transición de estado).';

    public function __construct(
        protected CronMailLogService $cronMailLogService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $comando = 'mail:order-status-update';
        $queued = 0;
        $errors = 0;
        $skipped = 0;

        $this->cronMailLogService->orderStatusCandidatesQuery()
            ->orderBy('id')
            ->chunkById(50, function ($orders) use ($comando, &$queued, &$errors, &$skipped) {
                foreach ($orders as $order) {
                    $user = $order->user;
                    if (! $user || ! $user->email) {
                        $skipped++;
                        $this->cronMailLogService->recordSkipped(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            'Usuario sin email',
                            $user?->id,
                            null,
                            $order->id,
                        );
                        continue;
                    }

                    try {
                        Mail::to($user->email)->queue(new OrderStatusEmail($order));
                        $order->forceFill([
                            'fulfillment_email_last_status' => $order->status,
                        ])->save();
                        $queued++;

                        $this->cronMailLogService->recordSuccess(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            $user->email,
                            $user->id,
                            null,
                            $order->id,
                            "Estatus «{$order->status}» encolado",
                        );
                    } catch (\Throwable $e) {
                        $errors++;
                        $this->cronMailLogService->recordError(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            $e->getMessage(),
                            $user->email,
                            $user->id,
                            null,
                            $order->id,
                        );
                        Log::error('mail:order-status-update queue failed', [
                            'order_id' => $order->id,
                            'message' => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->cronMailLogService->recordExecutionSummary($comando, [
            'encolados' => $queued,
            'errores' => $errors,
            'omitidos' => $skipped,
        ]);

        $this->info("Order status: {$queued} encolado(s), {$errors} error(es), {$skipped} omitido(s).");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}
