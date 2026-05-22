<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Pedido Cherry{{ $isSplit ? ' (dividido)' : '' }}</title>
    @include('orders._print-styles')
</head>
<body>
    @if($isSplit)
    <div class="split-group-note">
        Compra dividida en {{ count($orderSections) }} pedidos vinculados
    </div>
    @endif

    @foreach($orderSections as $index => $section)
    <div class="order-block{{ $index > 0 ? ' page-break-before' : '' }}">
        @include('orders._print-order-section', array_merge($section, [
            'showClientInfo' => $index === 0,
        ]))
    </div>
    @endforeach

    @if($isSplit)
    <div class="combined-summary page-break-before">
        <h2>Resumen de la compra</h2>
        @foreach($orderSections as $section)
        <div class="summary-row">
            <span class="summary-label">Pedido {{ $section['orderNumber'] }}:</span>
            <span>${{ number_format($section['totalAmount'], 2) }}</span>
        </div>
        @endforeach
        <div class="summary-row summary-total">
            <span>Total general:</span>
            <span>${{ number_format($combinedTotal, 2) }}</span>
        </div>
        <div class="summary-row" style="margin-top: 10px;">
            <span class="summary-label">Total de piezas:</span>
            <span>{{ $combinedPieces }}</span>
        </div>
    </div>
    @endif
</body>
</html>
