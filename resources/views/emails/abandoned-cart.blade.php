<x-mail::message>
# Hola {{ $user->first_name }},

Notamos que dejaste productos en tu carrito. Siguen disponibles (sujeto a stock).

## Tu carrito (resumen)

@foreach($pricing['lines'] as $line)
@if(!empty($line['image_url']))
<p style="margin:12px 0;">
<img src="{{ $line['image_url'] }}" alt="{{ $line['name'] }}" width="140" style="max-width:140px;height:auto;border-radius:8px;border:1px solid #eee;">
</p>
@endif
**{{ $line['name'] }}**  
Color: {{ $line['color'] ?? '—' }} · Talla: {{ $line['size'] ?? '—' }} · Cantidad: **{{ $line['quantity'] }}**  
Subtotal línea (antes desc. volumen): ${{ number_format($line['line_gross'], 2, '.', ',') }}

@endforeach

---

**Subtotal productos:** ${{ number_format($pricing['regular_subtotal'], 2, '.', ',') }}  
@if($pricing['volume_discount_total'] > 0)
Descuento estimado por volumen (compra ≥ $7,000 / $15,000 en productos elegibles): **-${{ number_format($pricing['volume_discount_total'], 2, '.', ',') }}**  
**Total mercancía estimado:** ${{ number_format($pricing['estimated_net_merchandise'], 2, '.', ',') }}  
@else
*Los descuentos por volumen aplican al completar la compra según reglas del sitio.*
@endif

<x-mail::button :url="$cartUrl">
Ver mi carrito
</x-mail::button>

Saludos,<br>
{{ config('app.name') }}
</x-mail::message>
