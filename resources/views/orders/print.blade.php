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

        /* Misma grilla que el modal: nombre | Color | Talla | Cantidad | Total pzas | Precio | Subtotal */
        .product-details--grouped {
            grid-template-columns:
                minmax(100px, 2fr)
                minmax(0, 1fr)
                minmax(0, 1fr)
                minmax(0, 1fr)
                minmax(0, 1fr)
                minmax(0, 1fr)
                minmax(0, 1fr);
            align-items: flex-start;
            gap: 8px 10px;
        }

        .product-details__main {
            min-width: 0;
        }

        .product-variant-col {
            text-align: right;
            font-size: 12px;
        }

        .product-variant-col__label {
            display: block;
            font-weight: bold;
            margin-bottom: 6px;
            font-size: 12px;
        }

        .product-variant-col__lines > div + div {
            margin-top: 5px;
        }

        .product-variant-col__lines {
            line-height: 1.4;
            color: #333;
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

        .product-tags {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-top: 8px;
        }

        .product-tag {
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 999px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        .product-tag--rebaja {
            background: #ffebee;
            color: #b71c1c;
        }

        .product-tag--nuevo {
            background: #e8f5e9;
            color: #1b5e20;
        }

        .product-tag--proximamente {
            background: #fff3e0;
            color: #e65100;
        }

        .product-tags .catalog-offer-badge.catalog-new-badge {
            display: inline-block;
            background: #000000;
            color: #ffffff;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            text-transform: none;
            letter-spacing: 0.2px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
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

        .product-item__breakdown-table-wrapper {
            grid-column: 1 / -1;
            overflow-x: auto;
            margin-top: 8px;
            border: 1px solid #e9ecef;
            border-radius: 0.5rem;
            background: white;
        }

        .product-item__breakdown-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }

        .product-item__breakdown-table thead {
            background-color: #f8f9fa;
        }

        .product-item__breakdown-table th {
            padding: 0.6rem 0.8rem;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #e9ecef;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        .product-item__breakdown-table td {
            padding: 0.55rem 0.8rem;
            border-bottom: 1px solid #f1f3f4;
            color: #444;
            vertical-align: top;
            font-size: 12px;
        }

        .product-item__breakdown-table tbody tr:last-child td {
            border-bottom: none;
        }

        .delivery-pickup-notice {
            margin-top: 8px;
            padding: 8px 10px;
            border-radius: 6px;
            background: #fff3e0;
            color: #e65100;
            font-weight: 700;
            font-size: 12px;
            border: 1px solid #ffd9b0;
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
        @if(!empty($orderStatusDisplay))
        <div style="margin-top: 8px; font-size: 12px; font-weight: bold;">
            Estado del pedido: {{ $orderStatusDisplay }}
        </div>
        @endif
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

        <div class="info-section">
            <h3>Método de Entrega</h3>
            <div class="info-row">
                <span class="info-label">Método:</span>
                <span>{{ $shippingMethodLabel }}</span>
            </div>
            @if(!$order->address)
            <div class="delivery-pickup-notice">Cliente retira en sucursal</div>
            @endif
        </div>

        @if($order->address)
        <div class="info-section">
            <h3>Dirección de Envío</h3>
            @if($addressFull)
            <div class="info-row">
                <span class="info-label">Completa:</span>
                <span>{{ $addressFull }}</span>
            </div>
            @endif
            @if($order->address->street_address)
            <div class="info-row">
                <span class="info-label">Calle:</span>
                <span>{{ $order->address->street_address }}</span>
            </div>
            @endif
            @if($order->address->street_number_ext || $order->address->street_number_int)
            <div class="info-row">
                <span class="info-label">Número:</span>
                <span>Ext: {{ $order->address->street_number_ext ?: 'S/N' }}, Int: {{ $order->address->street_number_int ?: 'S/N' }}</span>
            </div>
            @endif
            @if($order->address->colonia)
            <div class="info-row">
                <span class="info-label">Colonia:</span>
                <span>{{ $order->address->colonia }}</span>
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
            <div class="product-details product-details--grouped">
                <div class="product-details__main">
                    <div class="product-name">{{ $item['name'] }}</div>
                    <div class="product-id">ID: {{ $item['product_id'] }}</div>
                    @if(!empty($item['labels']))
                    <div class="product-tags">
                        @foreach($item['labels'] as $label)
                        @if(strtoupper($label) === 'NUEVO')
                        <span class="catalog-offer-badge catalog-new-badge">Nuevo</span>
                        @else
                        <span class="product-tag product-tag--{{ strtolower(str_replace(['Ó','Á','É','Í','Ú','ó','á','é','í','ú'], ['o','a','e','i','u','o','a','e','i','u'], $label)) }}">
                            {{ $label }}
                        </span>
                        @endif
                        @endforeach
                    </div>
                    @endif
                </div>
                <div class="product-variant-col">
                    <span class="product-variant-col__label">Color</span>
                    <div class="product-variant-col__lines">
                        @foreach($item['variants'] as $v)
                        <div>{{ $v['color'] !== null && $v['color'] !== '' ? $v['color'] : '—' }}</div>
                        @endforeach
                    </div>
                </div>
                <div class="product-variant-col">
                    <span class="product-variant-col__label">Talla</span>
                    <div class="product-variant-col__lines">
                        @foreach($item['variants'] as $v)
                        <div>{{ $v['size'] !== null && $v['size'] !== '' ? $v['size'] : '—' }}</div>
                        @endforeach
                    </div>
                </div>
                <div class="product-variant-col">
                    <span class="product-variant-col__label">Cantidad</span>
                    <div class="product-variant-col__lines">
                        @foreach($item['variants'] as $v)
                        <div>{{ $v['quantity'] }}</div>
                        @endforeach
                    </div>
                </div>
                <div class="product-quantity">
                    <strong>Total pzas:</strong> {{ $item['total_quantity'] }}
                </div>
                <div class="product-price">
                    @if($item['single_unit_price'] !== null)
                    <span>Precio: ${{ number_format($item['single_unit_price'], 2) }}</span>
                    @else
                    <span style="font-size: 12px; color: #555;">Varios precios</span>
                    @endif
                </div>
                <div class="product-subtotal">
                    ${{ number_format($item['total_subtotal'], 2) }}
                </div>
                <div class="product-item__breakdown-table-wrapper">
                    <table class="product-item__breakdown-table">
                        <thead>
                            <tr>
                                <th>Variante</th>
                                <th>Precio original</th>
                                <th>Descuento aplicado</th>
                                <th>Precio final pagado</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($item['variants'] as $v)
                            <tr>
                                <td>{{ ($v['color'] ?? '—') }} / {{ ($v['size'] ?? '—') }} x {{ $v['quantity'] }}</td>
                                <td>${{ number_format((float) ($v['original_price'] ?? 0), 2) }}</td>
                                <td>
                                    @if(!empty($v['discount_percentage']) && (float) $v['discount_percentage'] > 0)
                                        {{ (int) $v['discount_percentage'] }}%
                                    @else
                                        —
                                    @endif
                                </td>
                                <td>${{ number_format((float) ($v['final_unit_price'] ?? $v['price'] ?? 0), 2) }}</td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
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
