<?php

namespace App\Listeners;

use App\Mail\ProductAvailableEmail;
use App\Models\ProductNotification;
use Illuminate\Mail\Events\MessageSent;

class MarkProductStockNotificationSent
{
    public function handle(MessageSent $event): void
    {
        if (($event->data['__laravel_mailable'] ?? null) !== ProductAvailableEmail::class) {
            return;
        }

        $id = $event->data['productNotificationId'] ?? null;
        if (! $id) {
            return;
        }

        ProductNotification::query()->whereKey($id)->update(['is_notified' => true]);
    }
}
