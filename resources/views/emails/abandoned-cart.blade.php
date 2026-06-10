@php
  $sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
  $serif = "Georgia, 'Times New Roman', Times, serif";
  $displayName = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));
  if ($displayName === '') {
    $displayName = $user->first_name ?? 'Distribuidor';
  }
@endphp
<x-mail::message>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;">
  {{-- Logo --}}
  <tr>
    <td style="padding:24px 20px 16px;text-align:center;background:#ffffff;">
      <a href="{{ $shopUrl }}" style="text-decoration:none;display:inline-block;" target="_blank" rel="noopener">
        <img src="{{ $logoUrl }}" alt="Cherry" width="160" style="max-width:160px;height:auto;display:block;margin:0 auto;">
      </a>
    </td>
  </tr>
  {{-- Hero (configurable en admin: abandoned_cart_hero) --}}
  <tr>
    <td style="padding:0;background:#f5f5f5;line-height:0;font-size:0;">
      @include('emails.partials.linked-image', [
        'imageUrl' => $heroImageUrl,
        'clickUrl' => $heroImageClickUrl,
        'alt' => '¡Ups! Parece que dejaste algo en tu carrito.',
        'width' => '600',
        'style' => 'display:block;width:100%;max-width:600px;height:auto;border:0;',
      ])
    </td>
  </tr>
  {{-- Saludo y cuerpo --}}
  <tr>
    <td style="padding:28px 24px 8px;background:#ffffff;text-align:left;">
      <p style="margin:0 0 16px;font-family:{{ $sans }};font-size:16px;color:#1a1a1a;line-height:1.45;">
        <strong>Hola {{ $displayName }},</strong>
      </p>
      <p style="margin:0;font-family:{{ $sans }};font-size:15px;color:#1a1a1a;line-height:1.55;">
        No dejes pasar esta oportunidad: los productos que elegiste pueden ser clave para tu próxima venta. Finaliza tu pedido ahora.
      </p>
    </td>
  </tr>
  {{-- Lista de productos --}}
  <tr>
    <td style="padding:24px 24px 8px;background:#ffffff;">
      <p style="margin:0 0 18px;font-family:{{ $sans }};font-size:17px;font-weight:700;color:#1a1a1a;text-align:left;">
        Finaliza tu pedido
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        @foreach ($pricing['lines'] as $index => $line)
        @if($index > 0)
        <tr>
          <td colspan="3" style="padding:0;line-height:0;font-size:0;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="border-top:1px solid #e5e5e5;line-height:0;font-size:0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        @endif
        <tr>
          <td style="padding:14px 0;vertical-align:top;width:80px;">
            @if(!empty($line['image_url']))
            <img src="{{ $line['image_url'] }}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:4px;border:1px solid #eee;">
            @else
            <span style="display:block;width:64px;height:64px;background:#f3f3f3;border-radius:4px;border:1px solid #eee;"></span>
            @endif
          </td>
          <td style="padding:14px 10px;vertical-align:top;font-family:{{ $sans }};font-size:14px;color:#1a1a1a;line-height:1.45;text-align:left;">
            <strong style="display:block;margin-bottom:6px;">{{ $line['name'] }}</strong>
            <span style="display:block;color:#333;font-size:13px;">Talla: {{ $line['size'] ?? '—' }}</span>
            <span style="display:block;color:#333;font-size:13px;">Color: {{ $line['color'] ?? '—' }}</span>
            <span style="display:block;color:#333;font-size:13px;">Cantidad: {{ $line['quantity'] }}</span>
          </td>
          <td style="padding:14px 0;vertical-align:top;font-family:{{ $sans }};font-size:13px;color:#1a1a1a;text-align:right;white-space:nowrap;">
            Precio:<br>
            <strong style="font-size:14px;">${{ number_format((float) ($line['unit_price'] ?? 0), 2, '.', ',') }}</strong>
          </td>
        </tr>
        @endforeach
      </table>
    </td>
  </tr>
  {{-- CTA --}}
  <tr>
    <td style="padding:20px 24px 28px;background:#ffffff;text-align:center;">
      <p style="margin:0 0 18px;font-family:{{ $sans }};font-size:15px;font-weight:700;color:#1a1a1a;">
        Finaliza tu pedido antes de que se agoten
      </p>
      <a href="{{ $cartUrl }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 48px;background:#000000;color:#ffffff !important;text-decoration:none;border-radius:999px;font-family:{{ $sans }};font-size:15px;font-weight:700;">
        Ver mi carrito
      </a>
    </td>
  </tr>
  {{-- ¿Tienes dudas? --}}
  <tr>
    <td style="padding:0 24px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="border-top:1px solid #e0e0e0;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 24px 20px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:middle;padding-right:12px;">
            <p style="margin:0 0 6px;font-family:{{ $sans }};font-size:15px;font-weight:700;color:#1a1a1a;">
              ¿Tienes dudas?
            </p>
            <p style="margin:0;font-family:{{ $sans }};font-size:13px;color:#4a4a4a;line-height:1.45;">
              Escríbenos y te ayudamos de inmediato. Nuestro equipo estará encantado de apoyarte.
            </p>
          </td>
          <td style="width:48px;vertical-align:middle;text-align:right;">
            <a href="{{ $socialWhatsapp }}" target="_blank" rel="noopener" style="text-decoration:none;">
              <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="WhatsApp" width="40" height="40" style="display:inline-block;width:40px;height:40px;border-radius:8px;">
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  {{-- Redes sociales --}}
  <tr>
    <td style="padding:8px 24px 28px;text-align:center;background:#ffffff;">
      <p style="margin:0 0 16px;font-family:{{ $sans }};font-size:13px;font-weight:700;color:#1a1a1a;letter-spacing:0.04em;">
        ¡SÍGUENOS EN NUESTRAS REDES SOCIALES!
      </p>
      <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
        <tr>
          <td style="padding:0 8px;">
            <a href="{{ $socialFacebook }}" target="_blank" rel="noopener" style="text-decoration:none;">
              <img src="https://cdn.simpleicons.org/facebook/1877F2" alt="Facebook" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:6px;">
            </a>
          </td>
          <td style="padding:0 8px;">
            <a href="{{ $socialInstagram }}" target="_blank" rel="noopener" style="text-decoration:none;">
              <img src="https://cdn.simpleicons.org/instagram/E4405F" alt="Instagram" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:6px;">
            </a>
          </td>
          <td style="padding:0 8px;">
            <a href="{{ $socialWhatsapp }}" target="_blank" rel="noopener" style="text-decoration:none;">
              <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="WhatsApp" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:6px;">
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  {{-- Banner promo (configurable en admin: abandoned_cart_promo) --}}
  <tr>
    <td style="padding:0;background:#eaeaea;line-height:0;font-size:0;">
      @include('emails.partials.linked-image', [
        'imageUrl' => $promoBannerImageUrl,
        'clickUrl' => $promoBannerImageClickUrl,
        'width' => '600',
        'style' => 'display:block;width:100%;max-width:600px;height:auto;border:0;',
      ])
    </td>
  </tr>
  <tr>
    <td style="padding:20px 24px 28px;text-align:right;background:#f0f0f0;">
      <p style="margin:0;font-family:{{ $serif }};font-size:17px;color:#1a1a1a;line-height:1.45;">
        No te pierdas nuestras promociones y novedades
      </p>
    </td>
  </tr>
  {{-- Pie negro --}}
  <tr>
    <td style="padding:28px 12px 32px;background:#111111;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td width="25%" align="center" style="padding:12px 6px;border-right:1px solid #333333;vertical-align:top;">
            <div style="font-family:{{ $sans }};font-size:20px;color:#ffffff;line-height:1;margin-bottom:10px;">✓</div>
            <div style="font-family:{{ $sans }};font-size:11px;color:#ffffff;line-height:1.35;max-width:120px;margin:0 auto;">
              Compra segura
            </div>
          </td>
          <td width="25%" align="center" style="padding:12px 6px;border-right:1px solid #333333;vertical-align:top;">
            <div style="font-family:{{ $sans }};font-size:20px;color:#ffffff;line-height:1;margin-bottom:10px;">🚚</div>
            <div style="font-family:{{ $sans }};font-size:11px;color:#ffffff;line-height:1.35;max-width:120px;margin:0 auto;">
              Envíos a toda la República Mexicana
            </div>
          </td>
          <td width="25%" align="center" style="padding:12px 6px;border-right:1px solid #333333;vertical-align:top;">
            <div style="font-family:{{ $sans }};font-size:20px;color:#ffffff;line-height:1;margin-bottom:10px;">↩</div>
            <div style="font-family:{{ $sans }};font-size:11px;color:#ffffff;line-height:1.35;max-width:120px;margin:0 auto;">
              Cambios y devoluciones
            </div>
          </td>
          <td width="25%" align="center" style="padding:12px 6px;vertical-align:top;">
            <div style="font-family:{{ $sans }};font-size:20px;color:#ffffff;line-height:1;margin-bottom:10px;">🎧</div>
            <div style="font-family:{{ $sans }};font-size:11px;color:#ffffff;line-height:1.35;max-width:120px;margin:0 auto;">
              Atención al Cliente
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<p style="margin:16px 0 0;font-family:{{ $sans }};font-size:13px;color:#6b7280;text-align:center;">
  Si ya completaste tu compra, puedes ignorar este mensaje.
</p>

</x-mail::message>
