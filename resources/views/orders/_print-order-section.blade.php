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

@if(!empty($showClientInfo))
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
@endif

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
