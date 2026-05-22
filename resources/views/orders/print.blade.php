<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden {{ $orderNumber }} - Cherry</title>
    @include('orders._print-styles')
    <script>
        // Auto-imprimir cuando se carga la página
        window.onload = function() {
            window.print();
        };
    </script>
</head>
<body>
    @include('orders._print-order-section', [
        'order' => $order,
        'orderNumber' => $orderNumber,
        'orderStatusDisplay' => $orderStatusDisplay,
        'groupedItems' => $groupedItems,
        'subtotal' => $subtotal,
        'shippingAmount' => $shippingAmount,
        'totalAmount' => $totalAmount,
        'totalPieces' => $totalPieces,
        'user' => $user,
        'shippingMethodLabel' => $shippingMethodLabel,
        'addressFull' => $addressFull,
        'showClientInfo' => true,
    ])

    @include('partials.respond-io-growth-tool')
</body>
</html>
