<?php

namespace App\Mail;

use App\Models\MailConfig;
use App\Models\ProductNotification;
use App\Services\MailImageService;
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

    /** Precio formateado para la caja roja (ej. $1,499.00) */
    public string $unitPriceFormatted;

    public string $productDetailUrl;

    public string $logoUrl;

    /** Base URL del sitio (enlaces de navegación y CTA) */
    public string $webBase;

    /** Base de la app Laravel (assets /images) */
    public string $appBase;

    public string $promoBannerImageUrl;

    public string $socialWhatsapp;

    public string $productColorLabel;

    public string $productSizeLabel;

    public function __construct(ProductNotification $productNotification)
    {
        $productNotification->loadMissing(['user', 'producto.detalles']);

        $this->productNotificationId = $productNotification->id;

        $user = $productNotification->user;
        $producto = $productNotification->producto;

        $this->userFirstName = $user?->first_name ?? 'Cliente';
        $this->productName = $producto?->descripcion ?? 'Producto';
        $this->productImageUrl = self::mainProductImageUrl((string) ($producto?->id ?? ''));

        $precio = (float) ($producto?->precio1 ?? 0);
        $this->unitPriceFormatted = '$'.number_format($precio, 2, '.', ',');

        $this->appBase = rtrim((string) config('app.url'), '/');
        $configuredWeb = rtrim((string) config('cherry.orders_web_base'), '/');
        $this->webBase = $configuredWeb !== '' ? $configuredWeb : $this->appBase;

        $this->productDetailUrl = $this->webBase.'/producto/'.rawurlencode((string) ($producto?->id ?? ''));

        $configuredLogo = config('cherry.mail_logo_url');
        $this->logoUrl = (is_string($configuredLogo) && $configuredLogo !== '')
            ? $configuredLogo
            : $this->appBase.'/images/logo.svg';

        $this->promoBannerImageUrl = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_PRODUCT_AVAILABLE);

        $wa = config('cherry.social_whatsapp');
        $this->socialWhatsapp = (is_string($wa) && $wa !== '') ? $wa : $this->webBase.'/contacto';

        $detalle = $producto?->detalles
            ->first(fn ($d) => (float) ($d->inventario_d ?? 0) > 0)
            ?? $producto?->detalles->first();

        $this->productColorLabel = $detalle && $detalle->nombreColor
            ? mb_strtoupper((string) $detalle->nombreColor, 'UTF-8')
            : '';
        $this->productSizeLabel = $detalle && $detalle->detalle
            ? (string) $detalle->detalle
            : '';
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
        $shortName = mb_strlen($this->productName) > 48
            ? mb_substr($this->productName, 0, 45).'…'
            : $this->productName;

        return new Envelope(
            subject: '¡Está de vuelta! '.$shortName.' ya tiene stock — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.product-available',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
