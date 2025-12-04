<x-mail::message>
# ¡Gracias por tu pedido!

Hola {{ $order->user->first_name }} {{ $order->user->last_name }},

Te confirmamos que hemos recibido tu pedido **#{{ $order->id }}** correctamente.

## Detalles del Pedido

**Número de Pedido:** #{{ $order->id }}  
**Fecha:** {{ $order->created_at->format('d/m/Y H:i') }}  
**Estado:** {{ $order->status_display }}  
**Método de Pago:** {{ ucfirst(str_replace('_', ' ', $order->payment_method)) }}  
**Total:** ${{ number_format($order->total_amount, 2, '.', ',') }}

## Productos

@foreach($order->items as $item)
- **{{ $item->name }}**
  - Cantidad: {{ $item->quantity }}
  - Talla: {{ $item->size ?? 'N/A' }}
  - Color: {{ $item->color ?? 'N/A' }}
  - Precio unitario: ${{ number_format($item->price, 2, '.', ',') }}
  - Subtotal: ${{ number_format($item->subtotal, 2, '.', ',') }}

@endforeach

## Dirección de Envío

{{ $order->address->street }}, {{ $order->address->number }}  
{{ $order->address->neighborhood }}  
{{ $order->address->city }}, {{ $order->address->state }}  
C.P. {{ $order->address->postal_code }}

@if($order->status === 'pending' || $order->status === 'pendiente_pago')
<x-mail::panel>
**Importante:** Tu pedido está pendiente de confirmación de pago. Te notificaremos cuando se confirme el pago.
</x-mail::panel>
@endif

Gracias por confiar en nosotros.

Saludos,<br>
**{{ config('app.name') }}**
</x-mail::message>
