<?php

namespace App\Console\Commands;

use App\Mail\OrderStatusEmail;
use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrderStatusUpdateEmails extends Command
{
    protected $signature = 'mail:order-status-update';

    protected $description = 'Encola correos cuando el pedido pasa a Enviado o Entregado (una vez por transición de estado).';

    public function handle(): int
    {
        $queued = 0;

        Order::query()
            ->with(['user', 'items'])
            ->whereIn('status', ['enviado', 'entregado'])
            ->where(function ($q) {
                $q->whereNull('fulfillment_email_last_status')
                    ->orWhereColumn('fulfillment_email_last_status', '!=', 'status');
            })
            ->orderBy('id')
            ->chunkById(50, function ($orders) use (&$queued) {
                foreach ($orders as $order) {
                    $user = $order->user;
                    if (! $user || ! $user->email) {
                        continue;
                    }

                    try {
                        Mail::to($user->email)->queue(new OrderStatusEmail($order));
                        $order->forceFill([
                            'fulfillment_email_last_status' => $order->status,
                        ])->save();
                        $queued++;
                    } catch (\Throwable $e) {
                        Log::error('mail:order-status-update queue failed', [
                            'order_id' => $order->id,
                            'message' => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->info("Order status: {$queued} correo(s) encolado(s).");

        return self::SUCCESS;
    }
}
