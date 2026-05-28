@php
  $cherry = '#EA2630';
  $muted = '#4a4a4a';
  $sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
  $ordersUrl = rtrim((string) config('app.url'), '/').'/perfil/mis-pedidos';
@endphp
<x-mail::message>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <tr>
    <td style="padding:0;background:#f5f5f5;">
      <img src="{{ $headerImageUrl }}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;">
    </td>
  </tr>
  <tr>
    <td style="padding:28px 24px 12px;background:#ffffff;text-align:center;">
      <p style="margin:0 0 8px;font-family:{{ $sans }};font-size:20px;font-weight:700;color:#1a1a1a;">
        Actualización de tu pedido
      </p>
      <p style="margin:0;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Hola <strong>{{ $order->user->first_name }}</strong>,
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 20px;background:#ffffff;text-align:center;">
      <p style="margin:0 0 8px;font-family:{{ $sans }};font-size:15px;color:#333333;line-height:1.55;">
        Tu pedido <strong>#{{ $order->id }}</strong> tiene un nuevo estado:
        <strong style="color:{{ $cherry }};">{{ $order->status_display }}</strong>
      </p>
      <p style="margin:0 0 8px;font-family:{{ $sans }};font-size:14px;color:{{ $muted }};">
        <strong>Fecha del pedido:</strong> {{ $order->created_at->format('d/m/Y H:i') }}
      </p>
      @if($order->tracking_number)
      <p style="margin:0;font-family:{{ $sans }};font-size:14px;color:{{ $muted }};">
        <strong>Número de guía / rastreo:</strong> {{ $order->tracking_number }}
      </p>
      @endif
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 8px;background:#ffffff;">
      <p style="margin:0;font-family:{{ $sans }};font-size:14px;font-weight:700;color:#1a1a1a;">Productos</p>
    </td>
  </tr>
  @foreach($lines as $line)
  <tr>
    <td style="padding:12px 24px;border-top:1px solid #e5e7eb;background:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          @if(!empty($line['image_url']))
          <td width="90" style="width:90px;vertical-align:top;padding-right:12px;">
            <img src="{{ $line['image_url'] }}" alt="" width="80" style="width:80px;height:auto;border-radius:8px;border:1px solid #eee;display:block;">
          </td>
          @endif
          <td style="vertical-align:top;font-family:{{ $sans }};font-size:14px;color:#1a1a1a;line-height:1.45;">
            <strong>{{ $line['name'] }}</strong><br>
            @if(!empty($line['color']) || !empty($line['size']))
            <span style="font-size:12px;color:{{ $muted }};">Color: {{ $line['color'] ?? '—' }} · Talla: {{ $line['size'] ?? '—' }}</span><br>
            @endif
            Cantidad: {{ $line['quantity'] }} · Precio unit.: ${{ number_format($line['unit_price'], 2, '.', ',') }} · Subtotal: ${{ number_format($line['subtotal'], 2, '.', ',') }}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  @endforeach
  <tr>
    <td style="padding:24px;background:#ffffff;text-align:center;">
      <a href="{{ $ordersUrl }}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 36px;background:#000000;color:#ffffff !important;text-decoration:none;border-radius:999px;font-family:{{ $sans }};font-size:15px;font-weight:700;">
        Ver mis pedidos
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 28px;background:#ffffff;text-align:center;">
      <p style="margin:0;font-family:{{ $sans }};font-size:14px;color:{{ $muted }};">
        Gracias por tu compra.<br>{{ \App\Services\MailImageService::mailBrandName() }}
      </p>
    </td>
  </tr>
</table>
</x-mail::message>
