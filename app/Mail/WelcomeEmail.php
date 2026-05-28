<?php

namespace App\Mail;

use App\Models\MailConfig;
use App\Models\User;
use App\Services\MailImageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public User $user;

    public string $logoUrl;

    public string $shopUrl;

    public string $heroImageUrl;

    public string $promoBannerImageUrl;

    public string $socialFacebook;

    public string $socialInstagram;

    public string $socialWhatsapp;

    public function __construct(User $user)
    {
        $this->user = $user;

        $base = rtrim((string) config('app.url'), '/');
        $this->logoUrl = MailImageService::mailLogoAbsoluteUrl();
        $this->shopUrl = $base;
        $this->heroImageUrl = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_WELCOME_HERO);
        $this->promoBannerImageUrl = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_WELCOME_PROMO);
        $this->socialFacebook = (string) config('cherry.social_facebook');
        $this->socialInstagram = (string) config('cherry.social_instagram');
        $wa = config('cherry.social_whatsapp');
        $this->socialWhatsapp = (is_string($wa) && $wa !== '') ? $wa : $base.'/contacto';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '¡Bienvenido a '.MailImageService::mailBrandName().'!',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.welcome',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
