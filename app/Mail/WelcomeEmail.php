<?php

namespace App\Mail;

use App\Models\CronMailLog;
use App\Models\MailConfig;
use App\Models\User;
use App\Services\CronMailLogService;
use App\Services\MailImageService;
use Illuminate\Bus\Queueable;
use Illuminate\Support\Facades\Log;
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

    public ?string $heroImageClickUrl;

    public string $promoBannerImageUrl;

    public ?string $promoBannerImageClickUrl;

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
        $this->heroImageClickUrl = MailImageService::bannerClickUrl(MailConfig::TYPE_WELCOME_HERO);
        $this->promoBannerImageUrl = MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_WELCOME_PROMO);
        $this->promoBannerImageClickUrl = MailImageService::bannerClickUrl(MailConfig::TYPE_WELCOME_PROMO);
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

    /**
     * Registra intento de envío (log + cron_mail_logs) al procesar el job en la cola.
     */
    public function send($mailer)
    {
        $user = $this->user;
        $logService = app(CronMailLogService::class);

        Log::info('Intentando enviar correo de bienvenida', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        $logService->recordWelcome(
            CronMailLog::ESTADO_ENVIANDO,
            'Enviando correo de bienvenida vía transporte de mail',
            $user,
            CronMailLog::COMANDO_QUEUE_WORKER,
        );

        try {
            parent::send($mailer);

            $logService->recordWelcome(
                CronMailLog::ESTADO_EXITOSO,
                'Correo de bienvenida enviado correctamente',
                $user,
                CronMailLog::COMANDO_QUEUE_WORKER,
            );

            Log::info('Correo de bienvenida enviado', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
        } catch (\Throwable $e) {
            $logService->recordWelcome(
                CronMailLog::ESTADO_ERROR,
                'Error al enviar: '.$e->getMessage(),
                $user,
                CronMailLog::COMANDO_QUEUE_WORKER,
            );

            Log::error('Error al enviar correo de bienvenida', [
                'user_id' => $user->id,
                'email' => $user->email,
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
