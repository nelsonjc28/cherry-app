<?php

namespace App\Mail;

use App\Models\MailConfig;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\MailImageService;
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

    /** Nombre para saludo (nombre + apellido). */
    public string $customerDisplayName;

    /** True si hay guía o el pedido figura como enviado (texto tipo “ya fue enviado”). */
    public bool $showAsShipped;

    public ?string $trackingNumber;

    /** FedEx u orderViewUrl si no hay guía. */
    public string $trackingUrl;

    /** Imagen ancha / hero izquierda del correo. */
    public string $heroImageUrl;

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

    /** Sin dirección de envío = retiro en tienda (plantilla de correo distinta). */
    public bool $isPickupOrder;

    public string $pickupStoreAddress;

    /** @var list<string> */
    public array $pickupStoreHours;

    public string $pickupMapUrl;

    public string $pickupAppointmentUrl;

    /** True cuando el admin marcó el pedido como preparado (listo para recoger). */
    public bool $pickupOrderReady;

    /**
     * Create a new message instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order->loadMissing(['user', 'address', 'items.detalleRow']);

        $this->customerFirstName = (string) ($this->order->user?->first_name ?? 'Cliente');
        $fn = trim((string) ($this->order->user?->first_name ?? ''));
        $ln = trim((string) ($this->order->user?->last_name ?? ''));
        $this->customerDisplayName = trim($fn.' '.$ln) !== '' ? trim($fn.' '.$ln) : $this->customerFirstName;

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

        $tn = $this->order->tracking_number;
        $this->trackingNumber = (is_string($tn) && trim($tn) !== '') ? trim($tn) : null;
        $this->showAsShipped = $this->trackingNumber !== null
            || in_array((string) $this->order->status, ['enviado', 'entregado'], true);

        $this->trackingUrl = $this->trackingNumber !== null
            ? 'https://www.fedex.com/fedextrack/?trknbr='.rawurlencode($this->trackingNumber)
            : $this->orderViewUrl;

        $this->heroImageUrl = $this->resolveHeroImageUrl();

        $this->paymentMethodLabel = $this->formatPaymentMethod($this->order->payment_method ?? '');
        $this->showPendingPaymentNotice = in_array($this->order->status, ['pending', 'pendiente_pago'], true);

        $this->logoUrl = $this->resolveLogoUrl();

        $this->isPickupOrder = $this->order->address_id === null;
        $this->pickupStoreAddress = (string) config('cherry.pickup_store_address');
        $hours = config('cherry.pickup_store_hours');
        $this->pickupStoreHours = is_array($hours)
            ? array_values(array_filter(array_map('strval', $hours)))
            : [];
        $configuredMap = config('cherry.pickup_map_url');
        $this->pickupMapUrl = (is_string($configuredMap) && trim($configuredMap) !== '')
            ? trim($configuredMap)
            : 'https://www.google.com/maps/search/?api=1&query='.rawurlencode($this->pickupStoreAddress);
        $configuredAppt = config('cherry.pickup_appointment_url');
        $webBase = rtrim((string) config('cherry.orders_web_base'), '/');
        if ($webBase === '') {
            $webBase = rtrim((string) config('app.url'), '/');
        }
        $this->pickupAppointmentUrl = (is_string($configuredAppt) && trim($configuredAppt) !== '')
            ? trim($configuredAppt)
            : $webBase.'/contacto';
        $this->pickupOrderReady = (bool) ($this->order->is_prepared ?? false);
    }

    public function envelope(): Envelope
    {
        if ($this->isPickupOrder && ! $this->showAsShipped) {
            $subject = $this->pickupOrderReady
                ? 'Tu pedido #'.$this->order->id.' está listo para recoger en tienda — '.MailImageService::mailBrandName()
                : 'Confirmación de pedido (retiro en tienda) #'.$this->order->id.' — '.MailImageService::mailBrandName();
        } else {
            $subject = $this->showAsShipped
                ? 'Tu pedido #'.$this->order->id.' ya fue enviado — '.MailImageService::mailBrandName()
                : 'Confirmación de pedido #'.$this->order->id.' — '.MailImageService::mailBrandName();
        }

        return new Envelope(
            subject: $subject,
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
        return MailImageService::mailLogoAbsoluteUrl();
    }

    protected function resolveHeroImageUrl(): string
    {
        return MailImageService::bannerAbsoluteUrl(MailConfig::TYPE_ORDER_CONFIRMATION);
    }

    protected function formatPaymentMethod(string $method): string
    {
        $m = strtolower(str_replace(['_', '-'], ' ', $method));

        return match (true) {
            str_contains($m, 'mercado') => 'Mercado Pago',
            str_contains($m, 'credito') => 'Crédito Cherry',
            str_contains($m, 'credit') => 'Crédito Cherry',
            str_contains($m, 'integrated') => 'Pago integrado',
            $m === '' => 'No especificado',
            default => ucfirst($m),
        };
    }
}
