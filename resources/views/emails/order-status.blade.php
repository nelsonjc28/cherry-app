<x-mail::message>
# Actualización de tu pedido

Hola {{ $order->user->first_name }},

Tu pedido **#{{ $order->id }}** tiene un nuevo estado: **{{ $order->status_display }}**.

**Fecha del pedido:** {{ $order->created_at->format('d/m/Y H:i') }}

@if($order->tracking_number)
**Número de guía / rastreo:** {{ $order->tracking_number }}
@endif

## Productos

@foreach($lines as $line)
@if(!empty($line['image_url']))
<p style="margin:10px 0;">
<img src="{{ $line['image_url'] }}" alt="{{ $line['name'] }}" width="120" style="max-width:120px;height:auto;border-radius:8px;border:1px solid #eee;">
</p>
@endif
**{{ $line['name'] }}**  
@if(!empty($line['color']) || !empty($line['size']))
Color: {{ $line['color'] ?? '—' }} · Talla: {{ $line['size'] ?? '—' }}  
@endif
Cantidad: {{ $line['quantity'] }} · Precio unit.: ${{ number_format($line['unit_price'], 2, '.', ',') }} · Subtotal: ${{ number_format($line['subtotal'], 2, '.', ',') }}

@endforeach

<x-mail::button :url="rtrim(config('app.url'),'/').'/perfil/mis-pedidos'">
Ver mis pedidos
</x-mail::button>

Gracias por tu compra.  
{{ config('app.name') }}
</x-mail::message>
