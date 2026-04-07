<?php

namespace App\Mail;

use App\Models\MailConfig;
use App\Models\Order;
use App\Services\CartEmailPricingService;
use App\Services\MailImageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderStatusEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Order $order;

    /** @var list<array<string, mixed>> */
    public array $lines;

    public string $headerImageUrl;

    public function __construct(Order $order)
    {
        $this->order = $order->loadMissing(['user', 'items']);
        $this->headerImageUrl = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_ORDER_STATUS);
        $this->lines = [];
        foreach ($this->order->items as $item) {
            $pid = (string) $item->product_id;
            $lower = strtolower((string) ($item->name ?? ''));
            if ($pid === '0' || str_contains($lower, 'envío') || str_contains($lower, 'envio') || str_contains($lower, 'ajuste')) {
                continue;
            }
            $this->lines[] = [
                'name' => $item->name,
                'product_id' => $pid,
                'color' => $item->color,
                'size' => $item->size,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->price,
                'subtotal' => (float) $item->subtotal,
                'image_url' => CartEmailPricingService::s3ProductImageUrl($pid),
            ];
        }
    }

    public function envelope(): Envelope
    {
        $label = $this->order->status_display ?? $this->order->status;

        return new Envelope(
            subject: 'Actualización de tu pedido #'.$this->order->id.' — '.$label.' — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.order-status',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
