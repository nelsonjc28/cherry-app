@php
  $cherry = '#EA2630';
  $muted = '#4a4a4a';
  $sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
  $serif = "Georgia, 'Times New Roman', Times, serif";
  $ctaUrl = ($showAsShipped && $trackingNumber) ? $trackingUrl : $orderViewUrl;
  $ctaLabel = ($showAsShipped && $trackingNumber) ? 'Ver seguimiento' : 'Ver mi pedido';
  $shopUrl = rtrim((string) config('cherry.orders_web_base'), '/');
  if ($shopUrl === '') {
    $shopUrl = rtrim((string) config('app.url'), '/');
  }
@endphp
<x-mail::message>
@if($isPickupOrder)
{{-- Retiro en tienda: diseño centrado, dirección, horarios, CTAs --}}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <tr>
    <td align="center" style="padding:32px 24px 24px;background:#ffffff;">
      <a href="{{ $shopUrl }}" target="_blank" rel="noopener" style="text-decoration:none;">
        <img src="{{ $logoUrl }}" alt="Cherry" width="200" style="max-width:200px;height:auto;display:block;margin:0 auto;">
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0 28px 20px;background:#ffffff;text-align:center;">
      <p style="margin:0 0 20px;font-family:{{ $sans }};font-size:24px;color:#1a1a1a;line-height:1.35;text-align:center;">
        <strong>Hola {{ $customerDisplayName }},</strong>
      </p>
      @if($showPendingPaymentNotice)
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 20px;max-width:520px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;">
        <tr>
          <td style="padding:14px 16px;font-family:{{ $sans }};font-size:14px;color:#78350f;text-align:left;">
            <strong>Importante:</strong> Tu pedido está pendiente de confirmación de pago. Cuando se confirme, podrás recogerlo en tienda según los datos de abajo.
          </td>
        </tr>
      </table>
      @endif
      @if($pickupOrderReady)
      <p style="margin:0 auto 16px;max-width:520px;font-family:{{ $sans }};font-size:16px;font-weight:700;color:#1a1a1a;line-height:1.5;">
        Tu pedido está listo para recoger en nuestra tienda.
      </p>
      <p style="margin:0 auto 20px;max-width:520px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Pasa por tu mercancía cuando te convenga dentro de nuestro horario. Si prefieres, agenda una cita y te atendemos sin espera.
      </p>
      @else
      <p style="margin:0 auto 16px;max-width:520px;font-family:{{ $sans }};font-size:16px;font-weight:700;color:#1a1a1a;line-height:1.5;">
        Hemos recibido tu pedido para <strong>retiro en tienda</strong>.
      </p>
      <p style="margin:0 auto 20px;max-width:520px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Te avisaremos por correo cuando esté listo para recoger. Esta es nuestra ubicación y horario habituales:
      </p>
      @endif
      <p style="margin:0 auto 24px;max-width:520px;font-family:{{ $sans }};font-size:14px;color:{{ $muted }};line-height:1.5;">
        <strong>Número de pedido:</strong> #{{ $order->id }}
        @if($trackingNumber)
        <br><strong>No. Guía:</strong> {{ $trackingNumber }}
        @endif
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 28px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;max-width:520px;">
        <tr>
          <td style="padding:0 0 10px;text-align:center;vertical-align:top;width:36px;">
            <span style="font-size:22px;line-height:1;color:{{ $cherry }};" aria-hidden="true">📍</span>
          </td>
          <td style="padding:0 0 10px;text-align:center;vertical-align:top;">
            <p style="margin:0;font-family:{{ $sans }};font-size:15px;color:#1a1a1a;line-height:1.55;">
              {{ $pickupStoreAddress }}
            </p>
          </td>
        </tr>
      </table>
      @if(count($pickupStoreHours) > 0)
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px auto 0;max-width:520px;">
        <tr>
          <td style="text-align:center;padding:8px 0 4px;">
            <p style="margin:0;font-family:{{ $sans }};font-size:14px;font-weight:700;color:#1a1a1a;">Horario:</p>
          </td>
        </tr>
        @foreach($pickupStoreHours as $hourLine)
        <tr>
          <td style="text-align:center;padding:2px 0;">
            <p style="margin:0;font-family:{{ $sans }};font-size:14px;color:#333333;line-height:1.45;">{{ $hourLine }}</p>
          </td>
        </tr>
        @endforeach
      </table>
      @endif
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 16px;background:#ffffff;text-align:center;">
      <a href="{{ $pickupMapUrl }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 40px;background:#000000;color:#ffffff !important;text-decoration:none;border-radius:999px;font-family:{{ $sans }};font-size:15px;font-weight:700;">
        Ver en mapa
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 12px;background:#ffffff;text-align:center;">
      <p style="margin:0 auto 16px;max-width:480px;font-family:{{ $sans }};font-size:14px;color:#333333;line-height:1.5;">
        Para agilizar tu recolección puedes hacer cita:
      </p>
      <a href="{{ $pickupAppointmentUrl }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 40px;background:#000000;color:#ffffff !important;text-decoration:none;border-radius:999px;font-family:{{ $sans }};font-size:15px;font-weight:700;">
        Agendar cita
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 28px 32px;background:#ffffff;text-align:center;">
      <p style="margin:0 0 10px;font-family:{{ $sans }};font-size:14px;color:#333333;line-height:1.55;">
        Recuerda presentar tu número de pedido.
      </p>
      <p style="margin:0;font-family:{{ $sans }};font-size:15px;font-weight:700;color:#1a1a1a;line-height:1.45;">
        ¡Te esperamos en nuestra sucursal!
      </p>
    </td>
  </tr>
  @if($isSplitPayment)
  <tr>
    <td style="padding:0 24px 24px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;max-width:520px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;">
        <tr>
          <td style="padding:12px 14px;font-family:{{ $sans }};font-size:13px;color:#78350f;text-align:center;">
            <strong>Pago fraccionado:</strong> crédito ${{ number_format($splitCreditAmount, 2, '.', ',') }} · pendiente MP ${{ number_format($splitPendingMpAmount, 2, '.', ',') }}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  @endif
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
            <div style="font-family:{{ $sans }};font-size:10px;color:#ffffff;line-height:1.35;max-width:110px;margin:0 auto;">Atención a cliente</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<p style="margin:16px 0 0;font-family:{{ $sans }};font-size:12px;color:#6b7280;text-align:center;line-height:1.5;">
  <a href="{{ config('cherry.social_facebook') }}" style="color:{{ $cherry }};text-decoration:none;">Facebook</a>
  &nbsp;·&nbsp;
  <a href="{{ config('cherry.social_instagram') }}" style="color:{{ $cherry }};text-decoration:none;">Instagram</a>
  &nbsp;·&nbsp;
  <a href="{{ config('cherry.returns_policy_url') }}" style="color:{{ $cherry }};text-decoration:none;">Devoluciones</a>
</p>
@else
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;">
  {{-- Logo --}}
  <tr>
    <td align="center" style="padding:28px 20px 20px;background:#ffffff;">
      <a href="{{ rtrim(config('app.url'), '/') }}" target="_blank" rel="noopener" style="text-decoration:none;">
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
              'style' => 'display:block;width:100%;max-width:300px;height:auto;min-height:200px;object-fit:cover;',
            ])
          </td>
          <td width="50%" valign="middle" style="width:50%;padding:24px 20px 24px 24px;vertical-align:middle;background:#ffffff;">
            @if($showAsShipped)
            <p style="margin:0 0 12px;font-family:{{ $serif }};font-size:26px;line-height:1.2;color:#1a1a1a;font-weight:400;">
              ¡Buenas noticias!
            </p>
            <p style="margin:0;font-family:{{ $sans }};font-size:15px;line-height:1.45;color:#1a1a1a;font-weight:700;">
              Tu pedido ya fue enviado y está en camino a su destino.
            </p>
            @else
            <p style="margin:0 0 12px;font-family:{{ $serif }};font-size:26px;line-height:1.2;color:#1a1a1a;font-weight:400;">
              ¡Gracias por tu compra!
            </p>
            <p style="margin:0;font-family:{{ $sans }};font-size:15px;line-height:1.45;color:#1a1a1a;font-weight:700;">
              Hemos recibido tu pedido correctamente. Pronto lo procesaremos y te avisaremos cuando salga de ruta.
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
      @if($showAsShipped)
      <p style="margin:0 0 14px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Muy pronto recibirás las piezas que seleccionaste para tu negocio.
      </p>
      @else
      <p style="margin:0 0 14px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Gracias por confiar en nosotros. Aquí tienes los datos de tu pedido y el detalle de lo que compraste.
      </p>
      @endif
      <p style="margin:0 0 6px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        <strong>Número de pedido:</strong> #{{ $order->id }}
      </p>
      @if($trackingNumber)
      <p style="margin:0 0 16px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        <strong>No. Guía (FedEx):</strong> {{ $trackingNumber }}
      </p>
      @else
      <p style="margin:0 0 16px;font-family:{{ $sans }};font-size:14px;color:{{ $muted }};line-height:1.5;">
        <strong>Estado:</strong> {{ $order->status_display }} · <strong>Pago:</strong> {{ $paymentMethodLabel }}
      </p>
      @endif
      @if($showAsShipped)
      <p style="margin:0 0 14px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Estamos seguros de que serán un gran acierto para armar outfits irresistibles y seguir impulsando tus ventas.
      </p>
      <p style="margin:0 0 24px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Te recomendamos estar atent@ a tu celular disponible para la entrega para recibir tu paquete sin inconvenientes.
      </p>
      @endif
      @if($showPendingPaymentNotice)
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;">
        <tr>
          <td style="padding:14px 16px;font-family:{{ $sans }};font-size:14px;color:#78350f;">
            <strong>Importante:</strong> Tu pedido está pendiente de confirmación de pago. Te avisaremos cuando se confirme.
          </td>
        </tr>
      </table>
      @endif
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
  {{-- Detalle de productos (resumen operativo) --}}
  <tr>
    <td style="padding:0 24px 8px;background:#ffffff;">
      <p style="margin:0 0 10px;font-family:{{ $sans }};font-size:14px;font-weight:700;color:#1a1a1a;">Detalle de tu pedido</p>
      <p style="margin:0 0 12px;font-family:{{ $sans }};font-size:12px;color:{{ $muted }};">Precios unitarios y subtotales netos (incluyen descuentos por volumen cuando aplican).</p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 16px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th align="left" style="padding:8px 6px;font-family:{{ $sans }};font-size:10px;text-transform:uppercase;color:{{ $muted }};">Img</th>
            <th align="left" style="padding:8px 6px;font-family:{{ $sans }};font-size:10px;text-transform:uppercase;color:{{ $muted }};">Producto</th>
            <th align="center" style="padding:8px 6px;font-family:{{ $sans }};font-size:10px;text-transform:uppercase;color:{{ $muted }};">Cant.</th>
            <th align="right" style="padding:8px 6px;font-family:{{ $sans }};font-size:10px;text-transform:uppercase;color:{{ $muted }};">Precio</th>
            <th align="right" style="padding:8px 6px;font-family:{{ $sans }};font-size:10px;text-transform:uppercase;color:{{ $muted }};">Subt.</th>
          </tr>
        </thead>
        <tbody>
          @forelse($orderLines as $line)
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:10px 6px;vertical-align:middle;">
              @if(!empty($line['image_url']))
              <img src="{{ $line['image_url'] }}" alt="" width="48" height="48" style="width:48px;height:48px;object-fit:cover;border-radius:6px;display:block;">
              @else
              <span style="display:block;width:48px;height:48px;border-radius:6px;background:#f3f4f6;"></span>
              @endif
            </td>
            <td style="padding:10px 6px;vertical-align:middle;font-family:{{ $sans }};font-size:13px;color:#111827;">
              <strong>{{ $line['name'] }}</strong><br>
              <span style="font-size:11px;color:{{ $muted }};">{{ $line['talla'] }} · {{ $line['color'] }}</span>
            </td>
            <td align="center" style="padding:10px 6px;font-family:{{ $sans }};font-size:13px;font-weight:600;">{{ $line['quantity'] }}</td>
            <td align="right" style="padding:10px 6px;font-family:{{ $sans }};font-size:13px;white-space:nowrap;">${{ number_format($line['unit_price_net'], 2, '.', ',') }}</td>
            <td align="right" style="padding:10px 6px;font-family:{{ $sans }};font-size:13px;font-weight:600;color:{{ $cherry }};white-space:nowrap;">${{ number_format($line['line_subtotal'], 2, '.', ',') }}</td>
          </tr>
          @empty
          <tr>
            <td colspan="5" style="padding:16px;font-family:{{ $sans }};font-size:13px;color:{{ $muted }};text-align:center;">Sin líneas de producto.</td>
          </tr>
          @endforelse
        </tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 24px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e5e7eb;border-radius:8px;">
        <tr style="background:#fafafa;">
          <td colspan="2" style="padding:8px 12px;font-family:{{ $sans }};font-size:11px;font-weight:700;text-transform:uppercase;color:{{ $muted }};">Totales</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-family:{{ $sans }};font-size:13px;">Subtotal (antes desc. volumen)</td>
          <td align="right" style="padding:8px 12px;font-family:{{ $sans }};font-size:13px;font-weight:600;">${{ number_format((float) ($order->subtotal ?? 0), 2, '.', ',') }}</td>
        </tr>
        @if($volumeDiscountAmount > 0.009)
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:8px 12px;font-family:{{ $sans }};font-size:13px;">Descuentos</td>
          <td align="right" style="padding:8px 12px;font-family:{{ $sans }};font-size:13px;font-weight:600;color:#16a34a;">-${{ number_format($volumeDiscountAmount, 2, '.', ',') }}</td>
        </tr>
        @endif
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:8px 12px;font-family:{{ $sans }};font-size:13px;">Mercancía (neto)</td>
          <td align="right" style="padding:8px 12px;font-family:{{ $sans }};font-size:13px;font-weight:600;">${{ number_format($merchandiseNetSubtotal, 2, '.', ',') }}</td>
        </tr>
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:8px 12px;font-family:{{ $sans }};font-size:13px;">Envío</td>
          <td align="right" style="padding:8px 12px;font-family:{{ $sans }};font-size:13px;font-weight:600;">@if($shippingAmount <= 0.009)<span style="color:#16a34a;">Gratis</span>@else ${{ number_format($shippingAmount, 2, '.', ',') }}@endif</td>
        </tr>
        <tr style="border-top:2px solid {{ $cherry }};background:#fff5f5;">
          <td style="padding:10px 12px;font-family:{{ $sans }};font-size:14px;font-weight:700;">Total</td>
          <td align="right" style="padding:10px 12px;font-family:{{ $sans }};font-size:16px;font-weight:800;color:{{ $cherry }};">${{ number_format($grandTotal, 2, '.', ',') }}</td>
        </tr>
      </table>
    </td>
  </tr>
  @if($isSplitPayment)
  <tr>
    <td style="padding:0 24px 20px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #fde68a;border-radius:8px;background:#fffbeb;">
        <tr>
          <td style="padding:12px 14px;font-family:{{ $sans }};font-size:13px;color:#78350f;">
            <strong>Pago fraccionado:</strong> crédito ${{ number_format($splitCreditAmount, 2, '.', ',') }} · pendiente MP ${{ number_format($splitPendingMpAmount, 2, '.', ',') }}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  @endif
  <tr>
    <td style="padding:0 24px 28px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
        <tr>
          <td style="padding:14px 16px;font-family:{{ $sans }};font-size:14px;color:#333;">
            <strong>Entrega</strong><br>
            @if($order->address)
              @php
                $a = $order->address;
                $streetLine = trim((string) ($a->street_address ?? ''));
                $ext = trim((string) ($a->street_number_ext ?? ''));
                $int = trim((string) ($a->street_number_int ?? ''));
                if ($ext !== '' || $int !== '') {
                    $bits = [];
                    if ($ext !== '') { $bits[] = 'Ext. '.$ext; }
                    if ($int !== '') { $bits[] = 'Int. '.$int; }
                    $streetLine = trim($streetLine.' '.implode(' ', $bits));
                }
              @endphp
              {{ $streetLine }}<br>
              {{ $a->city }}, {{ $a->state }} — C.P. {{ $a->postal_code }}<br>
              {{ $a->country }}
            @else
              <strong>Retiro en tienda</strong>
            @endif
          </td>
        </tr>
      </table>
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
            <div style="font-family:{{ $sans }};font-size:10px;color:#ffffff;line-height:1.35;max-width:110px;margin:0 auto;">Atención a cliente</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<p style="margin:16px 0 0;font-family:{{ $sans }};font-size:12px;color:#6b7280;text-align:center;line-height:1.5;">
  <a href="{{ config('cherry.social_facebook') }}" style="color:{{ $cherry }};text-decoration:none;">Facebook</a>
  &nbsp;·&nbsp;
  <a href="{{ config('cherry.social_instagram') }}" style="color:{{ $cherry }};text-decoration:none;">Instagram</a>
  &nbsp;·&nbsp;
  <a href="{{ config('cherry.returns_policy_url') }}" style="color:{{ $cherry }};text-decoration:none;">Devoluciones</a>
</p>
@endif
</x-mail::message>
