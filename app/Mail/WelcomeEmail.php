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
        $configuredLogo = config('cherry.mail_logo_url');
        $this->logoUrl = (is_string($configuredLogo) && $configuredLogo !== '')
            ? $configuredLogo
            : $base.'/images/logo.svg';
        $this->shopUrl = $base;
        $banner = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_WELCOME);
        $this->heroImageUrl = $banner;
        $this->promoBannerImageUrl = $banner;
        $this->socialFacebook = (string) config('cherry.social_facebook');
        $this->socialInstagram = (string) config('cherry.social_instagram');
        $wa = config('cherry.social_whatsapp');
        $this->socialWhatsapp = (is_string($wa) && $wa !== '') ? $wa : $base.'/contacto';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '¡Bienvenido a '.config('app.name').'!',
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
