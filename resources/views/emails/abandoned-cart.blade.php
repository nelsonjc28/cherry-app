@php
  $cherry = '#EA2630';
  $sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
  $serif = "Georgia, 'Times New Roman', Times, serif";
  $firstName = $user->first_name ?? 'Distribuidor';
@endphp
<x-mail::message>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <tr>
    <td style="padding:24px 20px 16px;text-align:center;background:#ffffff;">
      <a href="{{ $shopUrl }}" style="text-decoration:none;display:inline-block;" target="_blank" rel="noopener">
        <img src="{{ $logoUrl }}" alt="Cherry" width="160" style="max-width:160px;height:auto;display:block;margin:0 auto;">
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0;background:#f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          @foreach ([1, 2, 3] as $_)
          <td width="33.33%" style="width:33.33%;padding:0;vertical-align:top;">
            <img src="{{ $heroImageUrl }}" alt="" width="200" style="display:block;width:100%;max-width:200px;height:auto;min-height:160px;object-fit:cover;margin:0 auto;">
          </td>
          @endforeach
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 24px 24px;text-align:center;background:#ffffff;">
      <p style="margin:0 0 12px;font-family:{{ $serif }};font-size:22px;color:#1a1a1a;font-weight:400;">
        Tu carrito te espera
      </p>
      <a href="{{ $shopUrl }}" style="text-decoration:none;display:inline-block;margin-bottom:16px;" target="_blank" rel="noopener">
        <img src="{{ $logoUrl }}" alt="Cherry" width="200" style="max-width:200px;height:auto;display:block;margin:0 auto;">
      </a>
      <p style="margin:0 0 20px;font-family:{{ $serif }};font-size:15px;color:#4a4a4a;font-style:italic;line-height:1.5;">
        Tus productos siguen en tu carrito (sujeto a disponibilidad).
      </p>
      <p style="margin:0 auto;max-width:480px;font-family:{{ $sans }};font-size:15px;color:#1a1a1a;line-height:1.55;font-weight:700;">
        Hola {{ $firstName }}, notamos que no terminaste tu pedido. Completa tu compra y aprovecha precios de mayoreo, envíos y los beneficios de {{ \App\Services\MailImageService::mailBrandName() }}.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 20px;background:#ffffff;">
      <p style="margin:0 0 14px;font-family:{{ $sans }};font-size:17px;font-weight:700;color:#1a1a1a;text-align:left;">
        Tu carrito (resumen)
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
        @foreach ($pricing['lines'] as $line)
        <tr>
          <td style="padding:12px 10px 12px 12px;vertical-align:middle;width:72px;">
            @if(!empty($line['image_url']))
            <img src="{{ $line['image_url'] }}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #eee;">
            @else
            <span style="display:block;width:56px;height:56px;background:#f3f3f3;border-radius:6px;"></span>
            @endif
          </td>
          <td style="padding:12px 8px 12px 0;vertical-align:middle;font-family:{{ $sans }};font-size:14px;color:#1a1a1a;line-height:1.4;text-align:left;">
            <strong>{{ $line['name'] }}</strong><br>
            <span style="color:#555;font-size:13px;">Color: {{ $line['color'] ?? '—' }} · Talla: {{ $line['size'] ?? '—' }} · Cant.: {{ $line['quantity'] }}</span>
          </td>
          <td style="padding:12px 12px 12px 8px;vertical-align:middle;font-family:{{ $sans }};font-size:14px;color:#1a1a1a;text-align:right;white-space:nowrap;">
            ${{ number_format((float) $line['line_gross'], 2, '.', ',') }}
          </td>
        </tr>
        @endforeach
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;">
        <tr>
          <td style="font-family:{{ $sans }};font-size:14px;color:#333;text-align:right;padding:4px 0;">
            Subtotal productos: <strong>${{ number_format((float) $pricing['regular_subtotal'], 2, '.', ',') }}</strong>
          </td>
        </tr>
        @if(($pricing['volume_discount_total'] ?? 0) > 0)
        <tr>
          <td style="font-family:{{ $sans }};font-size:13px;color:#166534;text-align:right;padding:2px 0;">
            Desc. estimado por volumen: <strong>-${{ number_format((float) $pricing['volume_discount_total'], 2, '.', ',') }}</strong>
          </td>
        </tr>
        <tr>
          <td style="font-family:{{ $sans }};font-size:15px;color:#1a1a1a;text-align:right;padding:6px 0 0;">
            Total mercancía estimado: <strong>${{ number_format((float) $pricing['estimated_net_merchandise'], 2, '.', ',') }}</strong>
          </td>
        </tr>
        @else
        <tr>
          <td style="font-family:{{ $sans }};font-size:12px;color:#6b7280;text-align:right;padding:6px 0 0;font-style:italic;">
            Los descuentos por volumen aplican al completar la compra según reglas del sitio.
          </td>
        </tr>
        @endif
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 28px;background:#ffffff;">
      <p style="margin:0 0 14px;font-family:{{ $sans }};font-size:17px;font-weight:700;color:#1a1a1a;text-align:left;">
        Beneficios
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;max-width:520px;">
        @php
          $benefits = [
            'Acceso a tu panel personal fácil de usar y siempre disponible',
            'Productos exclusivos, solo para nuestros clientes',
            'Precios especiales de mayoreo que aumentan tus ganancias',
            'Catálogos digitales actualizados para vender siempre en tendencia',
            'Cambio de mercancía (Aplican restricciones.)',
            'Envíos a domicilio',
            'En tus compras se incluye el catálogo físico de temporada',
          ];
        @endphp
        @foreach ($benefits as $line)
        <tr>
          <td style="padding:6px 0;vertical-align:top;width:18px;">
            <span style="display:inline-block;width:8px;height:8px;background:{{ $cherry }};margin-top:6px;"></span>
          </td>
          <td style="padding:6px 0 6px 4px;font-family:{{ $sans }};font-size:14px;color:#333333;line-height:1.45;text-align:left;">
            {{ $line }}
          </td>
        </tr>
        @endforeach
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 24px 28px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="border-top:1px solid #e0e0e0;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">
        <tr>
          <td align="center" style="padding:8px 0;">
            <p style="margin:0 0 18px;font-family:{{ $sans }};font-size:15px;font-weight:700;color:#1a1a1a;">
              Termina tu compra: vuelve a tu carrito
            </p>
            <a href="{{ $cartUrl }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 42px;background:#000000;color:#ffffff !important;text-decoration:none;border-radius:999px;font-family:{{ $sans }};font-size:15px;font-weight:700;">
              Comprar
            </a>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="border-top:1px solid #e0e0e0;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
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
  <tr>
    <td style="padding:0;background:#eaeaea;">
      <img src="{{ $promoBannerImageUrl }}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;">
    </td>
  </tr>
  <tr>
    <td style="padding:20px 24px 28px;text-align:right;background:#f0f0f0;">
      <p style="margin:0;font-family:{{ $serif }};font-size:17px;color:#1a1a1a;line-height:1.45;">
        No te pierdas nuestras promociones y novedades
      </p>
    </td>
  </tr>
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
              Atención a cliente
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
