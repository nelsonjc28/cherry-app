<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden {{ $orderNumber }} - Cherry</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            padding: 20px;
            background: #fff;
        }

        .print-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }

        .print-header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #d32f2f;
        }

        .print-header .order-number {
            font-size: 18px;
            font-weight: bold;
        }

        .order-info {
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .info-section {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
        }

        .info-section h3 {
            font-size: 14px;
            margin-bottom: 10px;
            color: #d32f2f;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }

        .info-row {
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
        }

        .info-label {
            font-weight: bold;
            margin-right: 10px;
        }

        .products-section {
            margin-bottom: 30px;
        }

        .products-section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #d32f2f;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
        }

        .product-item {
            display: flex;
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: #fafafa;
        }

        .product-image {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border: 1px solid #ddd;
            border-radius: 3px;
            margin-right: 15px;
            flex-shrink: 0;
        }

        .product-details {
            flex: 1;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            gap: 10px;
            align-items: center;
        }

        .product-name {
            font-weight: bold;
            font-size: 13px;
        }

        .product-id {
            font-size: 11px;
            color: #666;
            margin-top: 3px;
        }

        .product-quantity,
        .product-price,
        .product-subtotal {
            text-align: right;
            font-size: 12px;
        }

        .product-subtotal {
            font-weight: bold;
        }

        .summary-section {
            margin-top: 30px;
            border-top: 2px solid #333;
            padding-top: 15px;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 13px;
        }

        .summary-label {
            font-weight: bold;
        }

        .summary-total {
            font-size: 18px;
            font-weight: bold;
            color: #d32f2f;
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
        }

        .total-pieces {
            text-align: center;
            margin: 20px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
        }

        @media print {
            body {
                padding: 10px;
            }

            .print-header {
                page-break-after: avoid;
            }

            .product-item {
                page-break-inside: avoid;
            }

            .summary-section {
                page-break-inside: avoid;
            }
        }

        @media print {
            @page {
                margin: 1cm;
            }
        }
    </style>
    <script>
        // Auto-imprimir cuando se carga la página
        window.onload = function() {
            window.print();
        };
    </script>
</head>
<body>
    <div class="print-header">
        <h1>Cherry</h1>
        <div class="order-number">Orden: {{ $orderNumber }}</div>
        <div style="margin-top: 5px; font-size: 11px;">
            Fecha: {{ \Carbon\Carbon::parse($order->created_at)->format('d/m/Y H:i') }}
        </div>
    </div>

    <div class="order-info">
        <div class="info-section">
            <h3>Información del Cliente</h3>
            <div class="info-row">
                <span class="info-label">ID Cliente:</span>
                <span>DM{{ str_pad($user->id, 5, '0', STR_PAD_LEFT) }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Nombre:</span>
                <span>{{ $user->first_name }} {{ $user->last_name }}</span>
            </div>
            @if($user->email)
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span>{{ $user->email }}</span>
            </div>
            @endif
            @if($user->phone)
            <div class="info-row">
                <span class="info-label">Teléfono:</span>
                <span>{{ $user->phone }}</span>
            </div>
            @endif
        </div>

        @if($order->address)
        <div class="info-section">
            <h3>Dirección de Envío</h3>
            @if($order->address->street_address)
            <div class="info-row">
                <span class="info-label">Dirección:</span>
                <span>{{ $order->address->street_address }}</span>
            </div>
            @endif
            @if($order->address->colonia)
            <div class="info-row">
                <span class="info-label">Colonia:</span>
                <span>{{ $order->address->colonia }}</span>
            </div>
            @endif
            @if($order->address->municipality)
            <div class="info-row">
                <span class="info-label">Municipio:</span>
                <span>{{ $order->address->municipality }}</span>
            </div>
            @endif
            @if($order->address->city)
            <div class="info-row">
                <span class="info-label">Ciudad:</span>
                <span>{{ $order->address->city }}</span>
            </div>
            @endif
            @if($order->address->state)
            <div class="info-row">
                <span class="info-label">Estado:</span>
                <span>{{ $order->address->state }}</span>
            </div>
            @endif
            @if($order->address->postal_code)
            <div class="info-row">
                <span class="info-label">Código Postal:</span>
                <span>{{ $order->address->postal_code }}</span>
            </div>
            @endif
        </div>
        @endif
    </div>

    <div class="total-pieces">
        Total de Piezas: {{ $totalPieces }}
    </div>

    <div class="products-section">
        <h2>Productos</h2>
        @foreach($groupedItems as $item)
        <div class="product-item">
            <img src="{{ $item['image'] }}" alt="{{ $item['name'] }}" class="product-image" onerror="this.style.display='none'">
            <div class="product-details">
                <div>
                    <div class="product-name">{{ $item['name'] }}</div>
                    <div class="product-id">ID: {{ $item['product_id'] }}</div>
                </div>
                <div class="product-quantity">
                    Cantidad: {{ $item['quantity'] }}
                </div>
                <div class="product-price">
                    Precio: ${{ number_format($item['price'], 2) }}
                </div>
                <div class="product-subtotal">
                    ${{ number_format($item['subtotal'], 2) }}
                </div>
            </div>
        </div>
        @endforeach
    </div>

    <div class="summary-section">
        <div class="summary-row">
            <span class="summary-label">Subtotal:</span>
            <span>${{ number_format($subtotal, 2) }}</span>
        </div>
              <div class="summary-row">
                <span class="summary-label">Envío:</span>
                @if($shippingAmount == 0)
                <span style="color: #28a745; font-weight: bold;">Gratis</span>
                @else
                <span>${{ number_format($shippingAmount, 2) }}</span>
                @endif
              </div>
        <div class="summary-row summary-total">
            <span>Total:</span>
            <span>${{ number_format($totalAmount, 2) }}</span>
        </div>
    </div>
</body>
</html>
