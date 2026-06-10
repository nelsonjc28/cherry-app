@php
  $cherry = '#EA2630';
  $sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
  $serif = "Georgia, 'Times New Roman', Times, serif";
  $greet = $userFirstName !== '' && $userFirstName !== 'Cliente' ? $userFirstName : 'Distribuidor';
  $colorDisp = $productColorLabel !== '' ? $productColorLabel : '—';
  $sizeDisp = $productSizeLabel !== '' ? $productSizeLabel : '—';
  $nav = [
    ['NUEVO', $webBase.'/nuevos'],
    ['FAVORITOS', $webBase.'/perfil/favoritos'],
    ['ROPA', $webBase.'/buscar'],
    ['CATÁLOGOS', $webBase.'/catalogos'],
    ['REBAJAS', $webBase.'/promociones'],
  ];
@endphp
<x-mail::message>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <tr>
    <td style="padding:24px 20px 12px;text-align:center;background:#ffffff;">
      <a href="{{ $webBase }}" style="text-decoration:none;display:inline-block;" target="_blank" rel="noopener">
        <img src="{{ $logoUrl }}" alt="Cherry" width="160" style="max-width:160px;height:auto;display:block;margin:0 auto;">
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0;background:#000000;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          @foreach ($nav as [$label, $href])
          <td style="padding:10px 4px;text-align:center;vertical-align:middle;">
            <a href="{{ $href }}" target="_blank" rel="noopener" style="font-family:{{ $sans }};font-size:10px;font-weight:700;color:#ffffff !important;text-decoration:none;letter-spacing:0.06em;white-space:nowrap;">
              {{ $label }}
            </a>
          </td>
          @endforeach
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 24px 16px;text-align:center;background:#ffffff;">
      <p style="margin:0 0 10px;font-family:{{ $sans }};font-size:20px;font-weight:700;color:#1a1a1a;line-height:1.35;">
        ¡Está de vuelta! Tu favorito ya está disponible nuevamente
      </p>
      <p style="margin:0 0 8px;font-family:{{ $serif }};font-size:16px;color:#333333;line-height:1.45;">
        El producto que estabas esperando ya regresó.
      </p>
      <p style="margin:0 auto;max-width:520px;font-family:{{ $sans }};font-size:14px;color:#333333;line-height:1.55;">
        Sabemos que se agotó rápido, pero buenas noticias: ya está nuevamente en stock y listo para formar parte de tu próxima compra.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 20px 24px;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:{{ $cherry }};border-radius:4px;overflow:hidden;">
        <tr>
          <td style="padding:16px;width:120px;vertical-align:top;">
            @if($productImageUrl !== '')
            <img src="{{ $productImageUrl }}" alt="" width="104" height="104" style="display:block;width:104px;height:104px;object-fit:cover;border-radius:4px;background:#ffffff;">
            @endif
          </td>
          <td style="padding:16px 16px 16px 0;vertical-align:top;">
            <p style="margin:0 0 8px;font-family:{{ $sans }};font-size:16px;font-weight:700;color:#ffffff;line-height:1.3;">
              {{ $productName }}
            </p>
            <p style="margin:0 0 4px;font-family:{{ $sans }};font-size:13px;color:#ffffff;line-height:1.4;">
              Talla: {{ $sizeDisp }}
            </p>
            <p style="margin:0 0 12px;font-family:{{ $sans }};font-size:13px;color:#ffffff;line-height:1.4;">
              Color: {{ $colorDisp }}
            </p>
            <p style="margin:0;text-align:right;font-family:{{ $sans }};font-size:14px;font-weight:700;color:#ffffff;">
              Precio: {{ $unitPriceFormatted }}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 20px;background:#ffffff;">
      <p style="margin:0 0 12px;font-family:{{ $sans }};font-size:14px;color:#1a1a1a;line-height:1.55;text-align:center;max-width:520px;margin-left:auto;margin-right:auto;">
        No pierdas la oportunidad de asegurar estas piezas antes de que vuelvan a agotarse.
      </p>
      <p style="margin:0 0 12px;font-family:{{ $sans }};font-size:14px;color:#333333;line-height:1.55;text-align:center;max-width:520px;margin-left:auto;margin-right:auto;">
        Son ideales para armar outfits que tus clientes van a amar.
      </p>
      <p style="margin:0 0 20px;font-family:{{ $sans }};font-size:14px;font-weight:700;color:#1a1a1a;line-height:1.5;text-align:center;">
        Compra ahora y asegura tu inventario.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center" style="padding:4px 0 8px;">
            <a href="{{ $productDetailUrl }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 36px;background:#000000;color:#ffffff !important;text-decoration:none;border-radius:999px;font-family:{{ $sans }};font-size:15px;font-weight:700;">
              Comprar ahora
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
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
    <td style="padding:22px 24px 26px;background:#ffffff;">
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
  <tr>
    <td style="padding:0;background:#eaeaea;">
      @include('emails.partials.linked-image', [
        'imageUrl' => $promoBannerImageUrl,
        'clickUrl' => $promoBannerImageClickUrl,
        'width' => '600',
        'style' => 'display:block;width:100%;max-width:600px;height:auto;min-height:230px;object-fit:cover;',
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
  Hola {{ $greet }}, si ya compraste este artículo o no quieres más avisos, puedes ignorar este mensaje.
</p>

</x-mail::message>
