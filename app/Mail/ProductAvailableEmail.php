<?php

namespace App\Mail;

use App\Models\ProductNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProductAvailableEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $productNotificationId;

    public string $userFirstName;

    public string $productName;

    public string $productImageUrl;

    public string $listPriceFormatted;

    public string $productDetailUrl;

    public function __construct(ProductNotification $productNotification)
    {
        $productNotification->loadMissing(['user', 'producto']);

        $this->productNotificationId = $productNotification->id;

        $user = $productNotification->user;
        $producto = $productNotification->producto;

        $this->userFirstName = $user?->first_name ?? 'Cliente';
        $this->productName = $producto?->descripcion ?? 'Producto';
        $this->productImageUrl = self::mainProductImageUrl((string) ($producto?->id ?? ''));
        $precio = $producto?->precio1 ?? 0;
        $this->listPriceFormatted = '$'.number_format((float) $precio, 2, '.', ',').' MXN';

        $base = rtrim(config('cherry.orders_web_base'), '/');
        $this->productDetailUrl = $base.'/products/'.rawurlencode((string) ($producto?->id ?? ''));
    }

    public static function mainProductImageUrl(string $productId): string
    {
        if ($productId === '') {
            return '';
        }

        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productId}/{$productId}_1.jpg";
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu producto ya tiene stock: '.$this->productName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.product-available',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
