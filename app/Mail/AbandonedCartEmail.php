<?php

namespace App\Mail;

use App\Models\Cart;
use App\Models\User;
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

    /**
     * @param  array<string, mixed>  $pricing  Salida de CartEmailPricingService::buildPreview()
     */
    public function __construct(User $user, Cart $cart, array $pricing)
    {
        $this->user = $user;
        $this->cart = $cart;
        $this->pricing = $pricing;
        $this->cartUrl = rtrim(config('app.url'), '/').'/carrito-detalle';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tienes productos esperándote en tu carrito — '.config('app.name'),
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
