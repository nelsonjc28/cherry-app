<?php

namespace App\Mail;

use App\Models\MailConfig;
use App\Models\Order;
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

    public string $logoUrl;

    public string $heroImageUrl;

    public ?string $heroImageClickUrl;

    public string $customerDisplayName;

    public ?string $trackingNumber;

    public string $trackingUrl;

    public string $ordersUrl;

    public bool $isDelivered;

    public function __construct(Order $order)
    {
        $this->order = $order->loadMissing(['user', 'items']);

        $fn = trim((string) ($this->order->user?->first_name ?? ''));
        $ln = trim((string) ($this->order->user?->last_name ?? ''));
        $fallback = (string) ($this->order->user?->first_name ?? 'Cliente');
        $this->customerDisplayName = trim($fn.' '.$ln) !== '' ? trim($fn.' '.$ln) : $fallback;

        $this->logoUrl = MailImageService::mailLogoAbsoluteUrl();
        $this->heroImageUrl = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_ORDER_STATUS);
        $this->heroImageClickUrl = MailImageService::bannerClickUrl(MailConfig::TYPE_ORDER_STATUS);

        $webBase = rtrim((string) config('cherry.orders_web_base'), '/');
        if ($webBase === '') {
            $webBase = rtrim((string) config('app.url'), '/');
        }
        $this->ordersUrl = $webBase.'/perfil/mis-pedidos?order='.$this->order->id;

        $tn = $this->order->tracking_number;
        $this->trackingNumber = (is_string($tn) && trim($tn) !== '') ? trim($tn) : null;
        $this->trackingUrl = $this->trackingNumber !== null
            ? 'https://www.fedex.com/fedextrack/?trknbr='.rawurlencode($this->trackingNumber)
            : $this->ordersUrl;

        $this->isDelivered = (string) $this->order->status === 'entregado';
    }

    public function envelope(): Envelope
    {
        $subject = $this->isDelivered
            ? 'Tu pedido #'.$this->order->id.' fue entregado — '.MailImageService::mailBrandName()
            : 'Tu pedido #'.$this->order->id.' ya fue enviado — '.MailImageService::mailBrandName();

        return new Envelope(
            subject: $subject,
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
