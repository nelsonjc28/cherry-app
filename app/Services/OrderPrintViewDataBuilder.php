<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Producto;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class OrderPrintViewDataBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function buildSection(Order $order): array
    {
        $orderNumber = $order->orderNumberPrefixForDisplay().str_pad((string) $order->id, 4, '0', STR_PAD_LEFT);
        $subtotal = $order->items->sum('subtotal');
        $shippingAmount = (float) ($order->shipping_amount ?? 0);
        $totalAmount = (float) $order->total_amount;
        $totalPieces = $order->items->sum('quantity');

        $groupedItems = [];
        foreach ($order->items as $item) {
            $productId = (string) $item->product_id;
            $product = $this->findProductForPrintOrderItem($item);
            $stockTotal = $this->resolveProductStockTotalForPrint($item, $product);
            $labels = $this->buildProductLabelsForPrint($product, $stockTotal);
            $originalPrice = $product ? (float) ($product->precio1 ?? 0) : null;
            $finalUnitPrice = (float) $item->price;
            $discountAmount = 0.0;
            $discountPercentage = 0;
            if ($originalPrice !== null && $originalPrice > 0 && $originalPrice > $finalUnitPrice) {
                $discountAmount = round($originalPrice - $finalUnitPrice, 2);
                $discountPercentage = (int) round((($originalPrice - $finalUnitPrice) / $originalPrice) * 100);
            }

            if (! isset($groupedItems[$productId])) {
                $groupedItems[$productId] = [
                    'product_id' => $productId,
                    'name' => $item->name,
                    'image' => $this->getProductImageUrlSimple($item->product_id),
                    'variants' => [],
                    'total_quantity' => 0,
                    'total_subtotal' => 0.0,
                    'labels' => [],
                ];
            }
            $groupedItems[$productId]['variants'][] = [
                'color' => $item->color,
                'size' => $item->size,
                'quantity' => (int) $item->quantity,
                'price' => $finalUnitPrice,
                'final_unit_price' => $finalUnitPrice,
                'original_price' => ($originalPrice !== null && $originalPrice > 0) ? $originalPrice : $finalUnitPrice,
                'discount_amount' => $discountAmount,
                'discount_percentage' => $discountPercentage,
                'subtotal' => (float) $item->subtotal,
                'labels' => $labels,
            ];
            $groupedItems[$productId]['total_quantity'] += (int) $item->quantity;
            $groupedItems[$productId]['total_subtotal'] += (float) $item->subtotal;
            $groupedItems[$productId]['labels'] = array_values(array_unique(array_merge(
                $groupedItems[$productId]['labels'],
                $labels
            )));
        }

        foreach ($groupedItems as $key => $row) {
            $priceKeys = array_unique(array_map(function ($v) {
                return number_format($v['price'], 2, '.', '');
            }, $row['variants']));
            $groupedItems[$key]['single_unit_price'] = count($priceKeys) === 1
                ? (float) $row['variants'][0]['price']
                : null;
        }

        return [
            'order' => $order,
            'orderNumber' => $orderNumber,
            'orderStatusDisplay' => $order->status_display,
            'groupedItems' => $groupedItems,
            'subtotal' => $subtotal,
            'shippingAmount' => $shippingAmount,
            'totalAmount' => $totalAmount,
            'totalPieces' => $totalPieces,
            'user' => $order->user,
            'shippingMethodLabel' => $order->shipping_method_label,
            'addressFull' => $order->address?->admin_formatted_address,
        ];
    }

    private function findProductForPrintOrderItem(OrderItem $item): ?Producto
    {
        $product = null;
        $shopifyId = (string) $item->product_id;
        $detalle = \App\Models\Detalle::where('idShopify', $shopifyId)->first();
        if (! $detalle) {
            $detalle = \App\Models\Detalle::whereRaw('CAST(idShopify AS CHAR) = ?', [$shopifyId])->first();
        }
        if (! $detalle) {
            $detalle = \App\Models\Detalle::where('idShopify', 'LIKE', "%{$shopifyId}%")->first();
        }
        if ($detalle && $detalle->producto_id) {
            $product = Producto::find($detalle->producto_id);
        }

        if (! $product) {
            $product = Producto::find((string) $item->product_id);
            if (! $product) {
                $product = Producto::find('0'.(string) $item->product_id);
            }
            if (! $product) {
                $product = Producto::find(str_pad((string) $item->product_id, 6, '0', STR_PAD_LEFT));
            }
            if (! $product) {
                $product = Producto::where('id', 'LIKE', '%'.$item->product_id.'%')->first();
            }
        }

        return $product;
    }

    private function resolveProductStockTotalForPrint(OrderItem $item, ?Producto $product): float
    {
        if ($product) {
            $sumDetalles = (float) \App\Models\Detalle::where('producto_id', $product->id)
                ->sum(DB::raw('GREATEST(IFNULL(inventario_d, 0), 0)'));
            if ($sumDetalles > 0.00001) {
                return round($sumDetalles, 2);
            }

            return round(Producto::effectiveDetailInventoryContribution($product->inventario ?? 0), 2);
        }

        if (! empty($item->detalle_id)) {
            $detalle = \App\Models\Detalle::find($item->detalle_id);
            if ($detalle) {
                return round(Producto::effectiveDetailInventoryContribution($detalle->inventario_d ?? null), 2);
            }
        }

        return 0.0;
    }

    /**
     * @return list<string>
     */
    private function buildProductLabelsForPrint(?Producto $product, float $stockTotal): array
    {
        $labels = [];
        $descPromoRaw = $product?->desc_promo;
        $hasRebaja = $descPromoRaw !== null
            && $descPromoRaw !== ''
            && (float) $descPromoRaw > 0.0001;
        if ($hasRebaja) {
            $labels[] = 'REBAJA';
        }

        $fechaAlta = $product?->fecha_alta ? Carbon::parse($product->fecha_alta) : null;
        $isNuevo = (($product?->opc_nuevo ?? 'N') === 'S')
            || ($fechaAlta && $fechaAlta->greaterThanOrEqualTo(now()->subDays(30)));
        if ($isNuevo) {
            $labels[] = 'NUEVO';
        }

        $isProximamente = ! $hasRebaja && ($fechaAlta === null || $stockTotal <= 0.0001);
        if ($isProximamente) {
            $labels[] = 'PRÓXIMAMENTE';
        }

        return $labels;
    }

    private function getProductImageUrlSimple(mixed $productId): string
    {
        if (! $productId) {
            return asset('images/placeholder-product.png');
        }

        $productIdStr = (string) $productId;

        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
    }
}
