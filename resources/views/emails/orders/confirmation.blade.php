@php
  $cherry = '#EA2630';
  $cherryDark = '#b71c1c';
  $muted = '#6b7280';
@endphp
<x-mail::message>
{{-- Header con identidad Cherry (tabla para compatibilidad con clientes de correo) --}}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px 0;border-radius:12px;overflow:hidden;background:#ffffff;border:1px solid #fecaca;box-shadow:0 1px 3px rgba(234,38,48,0.08);">
  <tr>
    <td style="height:4px;background:linear-gradient(90deg,{{ $cherry }} 0%,{{ $cherryDark }} 100%);line-height:4px;font-size:0;">&nbsp;</td>
  </tr>
  <tr>
    <td align="center" style="padding:24px 20px 20px;">
      @if($logoUrl)
      <img src="{{ $logoUrl }}" alt="{{ config('app.name') }}" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto 6px;">
      @else
      <span style="font-size:22px;font-weight:700;color:{{ $cherry }};letter-spacing:0.5px;">{{ config('app.name') }}</span>
      @endif
      <p style="margin:6px 0 0;font-size:13px;color:{{ $muted }};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        Moda que te inspira
      </p>
    </td>
  </tr>
</table>

<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;line-height:1.5;">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:{{ $cherry }};">
    ¡Gracias por tu compra, {{ $customerFirstName }}!
  </h1>
  <p style="margin:0 0 20px;font-size:15px;color:{{ $muted }};">
    Hemos recibido tu pedido correctamente. Aquí tienes el detalle.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;">
    <tr>
      <td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:{{ $muted }};font-weight:600;">Resumen</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">
          Pedido <span style="color:{{ $cherry }};">#{{ $order->id }}</span>
        </p>
        <p style="margin:6px 0 0;font-size:14px;color:{{ $muted }};">
          {{ $order->created_at->timezone(config('app.timezone', 'America/Mexico_City'))->format('d/m/Y · H:i') }}
        </p>
        <p style="margin:10px 0 0;font-size:14px;">
          <strong>Estado:</strong> {{ $order->status_display }}<br>
          <strong>Pago:</strong> {{ $paymentMethodLabel }}
        </p>
      </td>
    </tr>
  </table>

  @if($showPendingPaymentNotice)
  <x-mail::panel>
  <strong>Importante:</strong> Tu pedido está pendiente de confirmación de pago. Te avisaremos cuando se confirme.
  </x-mail::panel>
  @endif

  <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">Productos</p>
  <p style="margin:0 0 14px;font-size:13px;color:{{ $muted }};">Precio unitario y subtotales son <strong>netos</strong> (incluyen descuentos por volumen $7,000 / $15,000 cuando aplican).</p>

  <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;min-width:280px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th align="left" style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:{{ $muted }};width:72px;">Img</th>
          <th align="left" style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:{{ $muted }};">Producto</th>
          <th align="center" style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:{{ $muted }};">Cant.</th>
          <th align="right" style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:{{ $muted }};">P. unit. neto</th>
          <th align="right" style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:{{ $muted }};">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        @forelse($orderLines as $line)
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:12px 8px;vertical-align:middle;">
            @if(!empty($line['image_url']))
            <img src="{{ $line['image_url'] }}" alt="" width="56" height="56" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;display:block;">
            @else
            <span style="display:block;width:56px;height:56px;border-radius:8px;background:#f3f4f6;"></span>
            @endif
          </td>
          <td style="padding:12px 8px;vertical-align:middle;font-size:14px;color:#111827;">
            <strong>{{ $line['name'] }}</strong><br>
            <span style="font-size:12px;color:{{ $muted }};">Talla: {{ $line['talla'] }} · Color: {{ $line['color'] }}</span>
          </td>
          <td align="center" style="padding:12px 8px;vertical-align:middle;font-size:14px;font-weight:600;">{{ $line['quantity'] }}</td>
          <td align="right" style="padding:12px 8px;vertical-align:middle;font-size:14px;white-space:nowrap;">${{ number_format($line['unit_price_net'], 2, '.', ',') }}</td>
          <td align="right" style="padding:12px 8px;vertical-align:middle;font-size:14px;font-weight:600;white-space:nowrap;color:{{ $cherry }};">${{ number_format($line['line_subtotal'], 2, '.', ',') }}</td>
        </tr>
        @empty
        <tr>
          <td colspan="5" style="padding:16px;font-size:14px;color:{{ $muted }};text-align:center;">No hay líneas de producto en este pedido.</td>
        </tr>
        @endforelse
      </tbody>
    </table>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;">
    <tr style="background:#f9fafb;">
      <td colspan="2" style="padding:10px 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:{{ $muted }};">Resumen de totales</td>
    </tr>
    <tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:10px 14px;font-size:14px;color:#374151;">Subtotal productos (antes desc. volumen)</td>
      <td align="right" style="padding:10px 14px;font-size:14px;font-weight:600;white-space:nowrap;">${{ number_format((float) ($order->subtotal ?? 0), 2, '.', ',') }}</td>
    </tr>
    @if($volumeDiscountAmount > 0.009)
    <tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:10px 14px;font-size:14px;color:#374151;">Descuentos aplicados</td>
      <td align="right" style="padding:10px 14px;font-size:14px;font-weight:600;color:#16a34a;white-space:nowrap;">-${{ number_format($volumeDiscountAmount, 2, '.', ',') }}</td>
    </tr>
    @endif
    <tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:10px 14px;font-size:14px;color:#374151;">Mercancía (neto)</td>
      <td align="right" style="padding:10px 14px;font-size:14px;font-weight:600;white-space:nowrap;">${{ number_format($merchandiseNetSubtotal, 2, '.', ',') }}</td>
    </tr>
    <tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:10px 14px;font-size:14px;color:#374151;">Envío</td>
      <td align="right" style="padding:10px 14px;font-size:14px;font-weight:600;white-space:nowrap;">
        @if($shippingAmount <= 0.009)<span style="color:#16a34a;">Gratis</span>@else ${{ number_format($shippingAmount, 2, '.', ',') }}@endif
      </td>
    </tr>
    <tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:10px 14px;font-size:14px;color:#374151;">Impuestos</td>
      <td align="right" style="padding:10px 14px;font-size:14px;white-space:nowrap;">@if($taxAmount <= 0.009)<span style="color:{{ $muted }};">Sin IVA en este pedido</span>@else ${{ number_format($taxAmount, 2, '.', ',') }}@endif</td>
    </tr>
    <tr style="border-top:2px solid {{ $cherry }};background:#fef2f2;">
      <td style="padding:12px 14px;font-size:15px;font-weight:700;color:#111827;">Total del pedido</td>
      <td align="right" style="padding:12px 14px;font-size:17px;font-weight:800;color:{{ $cherry }};white-space:nowrap;">${{ number_format($grandTotal, 2, '.', ',') }}</td>
    </tr>
  </table>

  @if($isSplitPayment)
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;">
    <tr>
      <td style="padding:14px 16px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.04em;">Pago fraccionado</p>
        <p style="margin:0;font-size:14px;color:#78350f;">
          <strong>Pagado con crédito:</strong> ${{ number_format($splitCreditAmount, 2, '.', ',') }}<br>
          <strong>Pendiente en Mercado Pago:</strong> ${{ number_format($splitPendingMpAmount, 2, '.', ',') }}
        </p>
      </td>
    </tr>
  </table>
  @endif

  <x-mail::panel>
  <strong>Entrega</strong><br>
  @if($order->address)
    {{ $order->address->street_address }}<br>
    {{ $order->address->city }}, {{ $order->address->state }} — C.P. {{ $order->address->postal_code }}<br>
    {{ $order->address->country }}
  @else
    <strong>Retiro en tienda</strong>
  @endif
  </x-mail::panel>

  <div style="text-align:center;margin:28px 0 8px;">
    <x-mail::button :url="$orderViewUrl" color="error">
      Ver mi pedido en la web
    </x-mail::button>
  </div>

  <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:{{ $muted }};text-align:center;line-height:1.6;">
    <a href="{{ config('cherry.social_facebook') }}" style="color:{{ $cherry }};text-decoration:none;font-weight:600;">Facebook</a>
    &nbsp;·&nbsp;
    <a href="{{ config('cherry.social_instagram') }}" style="color:{{ $cherry }};text-decoration:none;font-weight:600;">Instagram</a>
    &nbsp;·&nbsp;
    <a href="{{ config('cherry.returns_policy_url') }}" style="color:{{ $cherry }};text-decoration:none;font-weight:600;">Política de devoluciones</a>
  </p>
  <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
    © {{ date('Y') }} {{ config('app.name') }}. Todos los derechos reservados.
  </p>
</div>

</x-mail::message>
