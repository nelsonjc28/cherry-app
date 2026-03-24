<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class OrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public Order $order;

    /** @var list<array{name: string, image_url: string, color: string, talla: string, quantity: int, unit_price_net: float, line_subtotal: float}> */
    public array $orderLines = [];

    public string $logoUrl;

    public string $customerFirstName;

    public float $merchandiseNetSubtotal;

    public float $volumeDiscountAmount;

    public float $shippingAmount;

    public float $taxAmount;

    public float $grandTotal;

    public bool $isSplitPayment;

    public float $splitCreditAmount;

    public float $splitPendingMpAmount;

    public string $orderViewUrl;

    public string $paymentMethodLabel;

    public bool $showPendingPaymentNotice;

    /**
     * Create a new message instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order->loadMissing(['user', 'address', 'items.detalleRow']);

        $this->customerFirstName = (string) ($this->order->user?->first_name ?? 'Cliente');

        $this->orderLines = $this->buildProductLines($this->order);

        $subtotal = (float) ($this->order->subtotal ?? 0);
        $discounted = (float) ($this->order->discounted_total ?? 0);
        if ($discounted <= 0.01 && $this->merchandiseFromLines() > 0.01) {
            $discounted = $this->merchandiseFromLines();
        }
        $this->merchandiseNetSubtotal = round(max(0, $discounted), 2);
        $this->volumeDiscountAmount = round(max(0, $subtotal - $discounted), 2);
        $this->shippingAmount = (float) ($this->order->shipping_amount ?? 0);
        $this->taxAmount = 0.0;
        $this->grandTotal = (float) ($this->order->total_amount ?? 0);

        $this->isSplitPayment = (bool) ($this->order->paid_with_credit ?? false)
            && (float) ($this->order->amount_pending ?? 0) > 0.01;
        $this->splitCreditAmount = (float) ($this->order->credit_used ?? 0);
        $this->splitPendingMpAmount = (float) ($this->order->amount_pending ?? 0);

        $paymentData = is_array($this->order->payment_data) ? $this->order->payment_data : [];
        if (! empty($paymentData['order_split'])) {
            $this->isSplitPayment = true;
        }

        $base = config('cherry.orders_web_base', 'https://cherrydev.789.com.mx');
        $this->orderViewUrl = $base.'/orders/'.$this->order->id;

        $this->paymentMethodLabel = $this->formatPaymentMethod($this->order->payment_method ?? '');
        $this->showPendingPaymentNotice = in_array($this->order->status, ['pending', 'pendiente_pago'], true);

        $this->logoUrl = $this->resolveLogoUrl();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirmación de pedido #'.$this->order->id.' — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.orders.confirmation',
        );
    }

    public function attachments(): array
    {
        return [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function buildProductLines(Order $order): array
    {
        $lines = [];
        foreach ($order->items as $item) {
            if (! $this->isProductLine($item)) {
                continue;
            }
            $pid = (string) $item->product_id;
            $talla = $item->detalleRow?->detalle ?? $item->size ?? '—';
            $lines[] = [
                'name' => $item->name ?? 'Producto',
                'image_url' => $this->productImageUrlForMail($pid),
                'color' => $item->color ?? '—',
                'talla' => $talla,
                'quantity' => (int) $item->quantity,
                'unit_price_net' => round((float) $item->price, 2),
                'line_subtotal' => round((float) $item->subtotal, 2),
            ];
        }

        return $lines;
    }

    protected function isProductLine(OrderItem $item): bool
    {
        $pid = (string) $item->product_id;
        $lower = strtolower((string) ($item->name ?? ''));
        if ($pid === '0') {
            return false;
        }
        if (str_contains($lower, 'envío') || str_contains($lower, 'envio') || str_contains($lower, 'ajuste')) {
            return false;
        }

        return true;
    }

    protected function merchandiseFromLines(): float
    {
        $sum = 0.0;
        foreach ($this->orderLines as $line) {
            $sum += (float) ($line['line_subtotal'] ?? 0);
        }

        return round($sum, 2);
    }

    protected function productImageUrlForMail(string $productId): string
    {
        if ($productId === '' || $productId === '0') {
            return '';
        }
        $key = 'shopify/'.$productId.'/'.$productId.'_1.jpg';

        if (filled(config('filesystems.disks.s3.bucket'))) {
            return Storage::disk('s3')->url($key);
        }

        return 'https://cherry-fotos.s3.amazonaws.com/'.$key;
    }

    protected function resolveLogoUrl(): string
    {
        $configured = config('cherry.mail_logo_url');
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        return asset('images/logo.svg');
    }

    protected function formatPaymentMethod(string $method): string
    {
        $m = strtolower(str_replace(['_', '-'], ' ', $method));

        return match (true) {
            str_contains($m, 'mercado') => 'Mercado Pago',
            str_contains($m, 'credit') => 'Crédito Cherry',
            str_contains($m, 'integrated') => 'Pago integrado',
            $m === '' => 'No especificado',
            default => ucfirst($m),
        };
    }
}
