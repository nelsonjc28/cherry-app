<?php

namespace App\Console\Commands;

use App\Mail\AbandonedCartEmail;
use App\Models\Cart;
use App\Services\CartEmailPricingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAbandonedCartEmails extends Command
{
    protected $signature = 'mail:abandoned-cart';

    protected $description = 'Encola correos de carrito abandonado (cada 48h mientras haya ítems y el carrito lleve ≥48h sin actualizarse).';

    public function handle(): int
    {
        $staleCart = now()->subHours(48);
        $notifyGap = now()->subHours(48);

        $query = Cart::query()
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

        $queued = 0;

        $query->chunkById(100, function ($carts) use (&$queued) {
            foreach ($carts as $cart) {
                $user = $cart->user;
                if (! $user || ! $user->email) {
                    continue;
                }

                $items = $cart->items ?? [];
                if (! is_array($items) || count($items) === 0) {
                    continue;
                }

                $preview = CartEmailPricingService::buildPreview($items, $user->seller_category ?? 'bronce');
                if (count($preview['lines']) === 0) {
                    continue;
                }

                try {
                    Mail::to($user->email)->queue(new AbandonedCartEmail($user, $cart, $preview));
                    $cart->forceFill(['last_notified_at' => now()])->save();
                    $queued++;
                } catch (\Throwable $e) {
                    Log::error('mail:abandoned-cart queue failed', [
                        'cart_id' => $cart->id,
                        'user_id' => $user->id,
                        'message' => $e->getMessage(),
                    ]);
                }
            }
        });

        $this->info("Abandoned cart: {$queued} correo(s) encolado(s).");

        return self::SUCCESS;
    }
}
