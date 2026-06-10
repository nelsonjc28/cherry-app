@php
  $cherry = '#EA2630';
  $muted = '#4a4a4a';
  $sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
  $serif = "Georgia, 'Times New Roman', Times, serif";
  $ctaUrl = $trackingNumber ? $trackingUrl : $ordersUrl;
  $ctaLabel = $trackingNumber ? 'Ver seguimiento' : 'Ver mis pedidos';
  $shopUrl = rtrim((string) config('cherry.orders_web_base'), '/');
  if ($shopUrl === '') {
    $shopUrl = rtrim((string) config('app.url'), '/');
  }
@endphp
<x-mail::message>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;">
  {{-- Logo --}}
  <tr>
    <td align="center" style="padding:28px 20px 20px;background:#ffffff;">
      <a href="{{ $shopUrl }}" target="_blank" rel="noopener" style="text-decoration:none;">
        <img src="{{ $logoUrl }}" alt="Cherry" width="200" style="max-width:200px;height:auto;display:block;margin:0 auto;">
      </a>
    </td>
  </tr>
  {{-- Hero: imagen | titular --}}
  <tr>
    <td style="padding:0;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td width="50%" valign="middle" style="width:50%;padding:0;background:{{ $cherry }};vertical-align:middle;">
            @include('emails.partials.linked-image', [
              'imageUrl' => $heroImageUrl,
              'clickUrl' => $heroImageClickUrl,
              'width' => '300',
              'style' => 'display:block;width:100%;max-width:300px;height:auto;min-height:230px;object-fit:cover;',
            ])
          </td>
          <td width="50%" valign="middle" style="width:50%;padding:24px 20px 24px 24px;vertical-align:middle;background:#ffffff;">
            <p style="margin:0 0 12px;font-family:{{ $serif }};font-size:26px;line-height:1.2;color:#1a1a1a;font-weight:400;">
              ¡Buenas noticias!
            </p>
            @if($isDelivered)
            <p style="margin:0;font-family:{{ $sans }};font-size:15px;line-height:1.45;color:#1a1a1a;font-weight:700;">
              Tu pedido ya fue entregado en su destino.
            </p>
            @else
            <p style="margin:0;font-family:{{ $sans }};font-size:15px;line-height:1.45;color:#1a1a1a;font-weight:700;">
              Tu pedido ya fue enviado y está en camino a su destino.
            </p>
            @endif
          </td>
        </tr>
      </table>
    </td>
  </tr>
  {{-- Cuerpo --}}
  <tr>
    <td style="padding:28px 24px 8px;background:#ffffff;text-align:left;">
      <p style="margin:0 0 16px;font-family:{{ $sans }};font-size:24px;color:#1a1a1a;line-height:1.35;text-align:center;">
        <strong>Hola {{ $customerDisplayName }},</strong>
      </p>
      <p style="margin:0 0 14px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;text-align:center;">
        Muy pronto recibirás las piezas que seleccionaste para tu negocio.
      </p>
      <p style="margin:0 0 6px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        <strong>Número de pedido:</strong> #{{ $order->id }}
      </p>
      @if($trackingNumber)
      <p style="margin:0 0 16px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        <strong>No. Guía de FEDEX:</strong> {{ $trackingNumber }}
      </p>
      @else
      <p style="margin:0 0 16px;font-family:{{ $sans }};font-size:14px;color:{{ $muted }};line-height:1.5;">
        <strong>Estado:</strong> {{ $order->status_display }}
      </p>
      @endif
      <p style="margin:0 0 14px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Estamos seguros de que serán un gran acierto para armar outfits irresistibles y seguir impulsando tus ventas.
      </p>
      <p style="margin:0 0 24px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Te recomendamos estar atent@ a tu celular disponible para la entrega para recibir tu paquete sin inconvenientes.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0 28px;">
        <tr>
          <td align="center" style="padding:16px 0;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;">
            <a href="{{ $ctaUrl }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 36px;background:#000000;color:#ffffff !important;text-decoration:none;border-radius:999px;font-family:{{ $sans }};font-size:15px;font-weight:700;">
              {{ $ctaLabel }}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 32px;font-family:{{ $sans }};font-size:15px;color:#1a1a1a;line-height:1.5;">
        <strong>Servicio al cliente de Cherry</strong>
      </p>
    </td>
  </tr>
  {{-- Pie negro --}}
  <tr>
    <td style="padding:24px 12px 28px;background:#111111;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td width="25%" align="center" style="padding:10px 6px;border-right:1px solid #333333;vertical-align:top;">
            <div style="font-family:{{ $sans }};font-size:18px;color:#ffffff;line-height:1;margin-bottom:8px;">✓</div>
            <div style="font-family:{{ $sans }};font-size:10px;color:#ffffff;line-height:1.35;max-width:110px;margin:0 auto;">Compra segura</div>
          </td>
          <td width="25%" align="center" style="padding:10px 6px;border-right:1px solid #333333;vertical-align:top;">
            <div style="font-family:{{ $sans }};font-size:18px;color:#ffffff;line-height:1;margin-bottom:8px;">🚚</div>
            <div style="font-family:{{ $sans }};font-size:10px;color:#ffffff;line-height:1.35;max-width:110px;margin:0 auto;">Envíos a toda la República Mexicana</div>
          </td>
          <td width="25%" align="center" style="padding:10px 6px;border-right:1px solid #333333;vertical-align:top;">
            <div style="font-family:{{ $sans }};font-size:18px;color:#ffffff;line-height:1;margin-bottom:8px;">↩</div>
            <div style="font-family:{{ $sans }};font-size:10px;color:#ffffff;line-height:1.35;max-width:110px;margin:0 auto;">Cambios y devoluciones</div>
          </td>
          <td width="25%" align="center" style="padding:10px 6px;vertical-align:top;">
            <div style="font-family:{{ $sans }};font-size:18px;color:#ffffff;line-height:1;margin-bottom:8px;">🎧</div>
            <div style="font-family:{{ $sans }};font-size:10px;color:#ffffff;line-height:1.35;max-width:110px;margin:0 auto;">Atención a Cliente</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</x-mail::message>
