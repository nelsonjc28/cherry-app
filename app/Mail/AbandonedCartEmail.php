<?php

namespace App\Mail;

use App\Models\Cart;
use App\Models\MailConfig;
use App\Models\User;
use App\Services\MailImageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AbandonedCartEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public User $user;

    public Cart $cart;

    /** @var array<string, mixed> */
    public array $pricing;

    public string $cartUrl;

    public string $logoUrl;

    public string $shopUrl;

    public string $heroImageUrl;

    public ?string $heroImageClickUrl;

    public string $promoBannerImageUrl;

    public ?string $promoBannerImageClickUrl;

    public string $socialFacebook;

    public string $socialInstagram;

    public string $socialWhatsapp;

    /**
     * @param  array<string, mixed>  $pricing  Salida de CartEmailPricingService::buildPreview()
     */
    public function __construct(User $user, Cart $cart, array $pricing)
    {
        $this->user = $user;
        $this->cart = $cart;
        $this->pricing = $pricing;

        $base = rtrim((string) config('app.url'), '/');
        $this->cartUrl = $base.'/carrito-detalle';
        $this->logoUrl = MailImageService::mailLogoAbsoluteUrl();
        $this->shopUrl = $base;
        $this->heroImageUrl = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_ABANDONED_CART_HERO);
        $this->heroImageClickUrl = MailImageService::bannerClickUrl(MailConfig::TYPE_ABANDONED_CART_HERO);
        $this->promoBannerImageUrl = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_ABANDONED_CART_PROMO);
        $this->promoBannerImageClickUrl = MailImageService::bannerClickUrl(MailConfig::TYPE_ABANDONED_CART_PROMO);
        $this->socialFacebook = (string) config('cherry.social_facebook');
        $this->socialInstagram = (string) config('cherry.social_instagram');
        $wa = config('cherry.social_whatsapp');
        $this->socialWhatsapp = (is_string($wa) && $wa !== '') ? $wa : $base.'/contacto';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tienes productos esperándote en tu carrito — '.MailImageService::mailBrandName(),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.abandoned-cart',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
