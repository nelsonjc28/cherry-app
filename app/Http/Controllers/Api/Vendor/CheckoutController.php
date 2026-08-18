<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Mail\OrderConfirmationMail;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\VendorBuyer;
use App\Services\ExternalSalesService;
use App\Services\OrderPricingService;
use App\Services\OrderSharePdfService;
use App\Services\OrderAvailabilityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

/**
 * Checkout de un VENDEDOR autenticado en nombre de un cliente asociado.
 *
 * Reglas de negocio implementadas:
 *   - El vendor DEBE especificar buyer_id (requisito #5: nunca para sí mismo).
 *   - El buyer debe estar asociado al vendor (vendor_buyer.is_active = true).
 *   - El buyer debe tener seller_category en (oro, diamante) en el momento
 *     del checkout (requisito #4).
 *   - El cálculo de precios se hace sobre el BUYER (porque las ofertas/
 *     descuentos por volumen dependen de su categoría).
 *   - La orden resultante queda:
 *       user_id = buyer.id
 *       placed_by_vendor_id = vendor.id
 *       payment_method = pedido_directo
 *       status = pendiente_pago
 *   - Se envía a la API externa al crear (consistente con createDirectOrder).
 */
class CheckoutController extends Controller
{
    public function __construct(
        protected OrderPricingService $orderPricingService,
        protected ExternalSalesService $externalSalesService,
        protected OrderSharePdfService $orderSharePdfService,
        protected OrderAvailabilityService $orderAvailabilityService,
    ) {}

    /**
     * POST /api/vendor/checkout
     * Crea un pedido directo en nombre del buyer indicado.
     */
    public function checkout(Request $request)
    {
        $vendor = Auth::user();
        if (! $vendor || ! $vendor->isVendedor()) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado como vendedor',
            ], 401);
        }

        $deliveryType = $request->input('delivery_type', 'envio');

        $rules = [
            'buyer_id' => 'required|integer|exists:users,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.barcode' => 'nullable|string',
            'items.*.detalle_id' => 'nullable|integer|min:1',
            'items.*.is_coming_soon' => 'nullable|boolean',
            'items.*.is_out_of_stock_encargo' => 'nullable|boolean',
            'items.*.desc_promo' => 'nullable|numeric',
            'items.*.user_offer_applies' => 'nullable|boolean',
            'items_for_volume_pricing' => 'nullable|array',
            'items_for_volume_pricing.*.price' => 'required|numeric|min:0',
            'items_for_volume_pricing.*.quantity' => 'required|integer|min:1',
            'items_for_volume_pricing.*.desc_promo' => 'nullable|numeric',
            'items_for_volume_pricing.*.user_offer_applies' => 'nullable|boolean',
            'delivery_type' => 'nullable|string|in:envio,retiro',
            'shipping_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0.01',
            'subtotal' => 'nullable|numeric|min:0',
            'discounted_total' => 'required|numeric|min:0',
            'descuento1' => 'nullable|numeric|min:0',
            'descuento2' => 'nullable|numeric|min:0',
        ];

        if ($deliveryType === 'envio') {
            $rules['address_id'] = 'required|exists:addresses,id';
        } else {
            $rules['address_id'] = 'nullable';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors(),
            ], 422);
        }

        // 1) Validar asociación vendor ↔ buyer (debe estar activa)
        $buyer = User::find($request->buyer_id);
        if (! $buyer) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $isAssociated = $vendor->buyers()
            ->wherePivot('is_active', true)
            ->where('users.id', $buyer->id)
            ->exists();

        if (! $isAssociated) {
            return response()->json([
                'success' => false,
                'message' => 'El cliente seleccionado no está asociado a este vendedor.',
            ], 403);
        }

        // 2) Validar disponibilidad real contra BD
        if ($availabilityError = $this->orderAvailabilityService->validateAvailablePieces($request->input('items', []))) {
            return $availabilityError;
        }

        // 3) Validar elegibilidad dinámica (categoría oro/diamante)
        if (! in_array($buyer->seller_category, VendorBuyer::ALLOWED_BUYER_CATEGORIES, true)) {
            return response()->json([
                'success' => false,
                'message' => 'El cliente ya no pertenece a las categorías oro/diamante y no puede recibir pedidos.',
            ], 403);
        }

        // 3) Validar dirección pertenece al buyer (cuando envío)
        $addressId = null;
        if ($deliveryType === 'envio') {
            $address = $buyer->addresses()->find($request->address_id);
            if (! $address) {
                return response()->json([
                    'success' => false,
                    'message' => 'La dirección no pertenece al cliente seleccionado',
                ], 404);
            }
            $addressId = $request->address_id;
        }

        // 4) Validar totales contra el cálculo del servidor (precios en base al BUYER)
        $bronzeShippingError = $this->rejectBronzeShippingWithoutPieces($buyer, $deliveryType, $request->input('items', []));
        if ($bronzeShippingError !== null) {
            return $bronzeShippingError;
        }

        $itemsForPricing = $this->pricingLinesFromRequestItems($request->items);
        $fullRaw = $request->input('items_for_volume_pricing');
        $fullItemsForPricing = is_array($fullRaw) && count($fullRaw) > 0
            ? $this->pricingLinesFromRequestItems($fullRaw)
            : null;

        if ($fullItemsForPricing !== null) {
            $expectedMerchandise = $this->orderPricingService->discountedMerchandiseForSubset(
                $buyer,
                $fullItemsForPricing,
                $itemsForPricing
            );
        } else {
            $summary = $this->orderPricingService->summarizeVolumeFromItems($buyer, $itemsForPricing);
            $expectedMerchandise = $summary['discounted_merchandise'];
        }

        $shippingAmount = (float) $request->input('shipping_amount', 0);
        $discountedTotalReq = round((float) $request->input('discounted_total'), 2);
        $totalAmountReq = round((float) $request->input('total_amount'), 2);

        if (! $this->orderPricingService->totalsMatchRequest(
            $expectedMerchandise,
            $discountedTotalReq,
            $totalAmountReq,
            $shippingAmount,
            2.0
        )) {
            $payload = [
                'success' => false,
                'message' => 'Los totales no coinciden con el cálculo del servidor. Actualiza el carrito e intenta de nuevo.',
            ];
            if (config('app.debug')) {
                $payload['expected_discounted_merchandise'] = $expectedMerchandise;
            }
            return response()->json($payload, 422);
        }

        // 5) Crear la orden con user_id = buyer, placed_by_vendor_id = vendor
        $descuento1 = (float) $request->input('descuento1', 0);
        $descuento2 = (float) $request->input('descuento2', 0);
        $summaryLines = $this->orderPricingService->summarizeVolumeFromItems($buyer, $itemsForPricing);
        $subtotal = (float) $request->input('subtotal', $summaryLines['lines_sum']);
        $sortedItems = $this->sortItems($request->items);
        $isAdvance = $this->linesContainComingSoon($sortedItems);

        try {
            /** @var Order $order */
            $order = DB::transaction(function () use ($request, $vendor, $buyer, $addressId, $deliveryType, $totalAmountReq, $subtotal, $discountedTotalReq, $shippingAmount, $descuento1, $descuento2, $sortedItems, $isAdvance) {
                $initialPaymentData = [
                    'delivery_type' => $deliveryType,
                    'shipping_amount' => $shippingAmount,
                    'placed_by_vendor_id' => $vendor->id,
                    'vendor_placed' => true,
                ];

                $order = Order::create([
                    'user_id' => $buyer->id,
                    'placed_by_vendor_id' => $vendor->id,
                    'address_id' => $addressId,
                    'total_amount' => $totalAmountReq,
                    'subtotal' => $subtotal,
                    'discounted_total' => $discountedTotalReq,
                    'shipping_amount' => $shippingAmount,
                    'descuento1' => $descuento1,
                    'descuento2' => $descuento2,
                    'credit_used' => 0,
                    'amount_paid' => 0,
                    'amount_pending' => $totalAmountReq,
                    'paid_with_credit' => false,
                    'status' => 'pendiente_pago',
                    'payment_method' => 'pedido_directo',
                    'external_reference' => uniqid('order_buyer'.$buyer->id.'_vendor'.$vendor->id.'_'),
                    'payment_data' => json_encode($initialPaymentData),
                    'is_advance_order' => $isAdvance,
                ]);

                foreach ($sortedItems as $item) {
                    OrderItem::create($this->orderItemPayload($order->id, $item));
                }

                return $order->fresh(['user', 'items', 'address']);
            });

            // 6) Email de confirmación (al correo del BUYER, que es el cliente real)
            try {
                Mail::to($buyer->email)->send(new OrderConfirmationMail($order));
                Log::info('Email de confirmación enviado (pedido directo via vendor)', [
                    'order_id' => $order->id,
                    'vendor_id' => $vendor->id,
                    'buyer_id' => $buyer->id,
                ]);
            } catch (\Exception $e) {
                Log::error('Error al enviar email de confirmación (vendor checkout)', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // 7) API externa: enviar al registrar el pedido (igual que createDirectOrder)
            try {
                $order->load(['user', 'items', 'address']);
                $apiResult = $this->externalSalesService->sendSaleToExternalApi($order);
                $this->externalSalesService->logSendResultIfApplicable(
                    $order,
                    $apiResult,
                    'Pedido directo via vendor (pendiente_pago) enviado a API externa'
                );
            } catch (\Exception $e) {
                Log::error('Error al enviar pedido (vendor) a API externa', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
                // No bloqueamos; el reintento se hace con orders:resend-external-api u otro flujo manual.
            }

            $this->orderSharePdfService->ensureStoredForOrder($order);

            return response()->json([
                'success' => true,
                'message' => 'Pedido registrado para el cliente. Queda pendiente de pago hasta liquidación.',
                'data' => [
                    'order_id' => $order->id,
                    'external_reference' => $order->external_reference,
                    'payment_method' => 'pedido_directo',
                    'order_status' => 'pendiente_pago',
                    'buyer_id' => $buyer->id,
                    'placed_by_vendor_id' => $vendor->id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error en vendor checkout', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'No se pudo confirmar el pedido: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Convierte los items del request al formato que espera OrderPricingService.
     * Replica el helper privado pricingLinesFromRequestItems de PaymentController.
     *
     * @return array<int, array<string, mixed>>
     */
    private function pricingLinesFromRequestItems(array $items): array
    {
        $out = [];
        foreach ($items as $item) {
            $out[] = [
                'price' => (float) ($item['price'] ?? 0),
                'quantity' => (int) ($item['quantity'] ?? 1),
                'desc_promo' => isset($item['desc_promo']) ? (float) $item['desc_promo'] : null,
                'user_offer_applies' => (bool) ($item['user_offer_applies'] ?? false),
            ];
        }
        return $out;
    }

    /**
     * Regla bronce: el envío a domicilio solo se permite si el cliente cumple el
     * mínimo de piezas sin `desc_promo` y sin oferta de usuario.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function rejectBronzeShippingWithoutPieces(User $user, string $deliveryType, array $items): ?\Illuminate\Http\JsonResponse
    {
        if (strtolower((string) ($user->seller_category ?? '')) !== 'bronce') {
            return null;
        }
        if ($deliveryType !== 'envio') {
            return null;
        }

        $pricingLines = $this->pricingLinesFromRequestItems($items);
        $pieces = 0;
        foreach ($pricingLines as $line) {
            $descPromo = $line['desc_promo'] ?? null;
            $hasPromo = $descPromo !== null && (float) $descPromo > 0.0001;
            $hasUserOffer = filter_var($line['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN);
            if ($hasPromo || $hasUserOffer) {
                continue;
            }
            $pieces += (int) ($line['quantity'] ?? 0);
        }

        $threshold = $user->first_purchase_completed_at === null
            ? 12
            : 6;

        if ($pieces < $threshold) {
            return response()->json([
                'success' => false,
                'message' => "El envío a domicilio requiere al menos {$threshold} prendas. Usa retiro en tienda.",
                'bronze_pieces_required' => $threshold,
                'bronze_pieces_counted' => $pieces,
            ], 422);
        }

        return null;
    }

    /**
     * Construye el payload para OrderItem::create a partir de una línea del request.
     */
    private function orderItemPayload(int $orderId, array $item): array
    {
        $quantity = (int) ($item['quantity'] ?? 1);
        $price = (float) ($item['price'] ?? 0);
        $subtotal = round($price * $quantity, 2);

        return [
            'order_id' => $orderId,
            'product_id' => (string) ($item['product_id'] ?? ''),
            'detalle_id' => $item['detalle_id'] ?? null,
            'name' => (string) ($item['name'] ?? ''),
            'size' => $item['size'] ?? null,
            'color' => $item['color'] ?? null,
            'barcode' => $item['barcode'] ?? null,
            'quantity' => $quantity,
            'price' => $price,
            'subtotal' => $subtotal,
            'product_details' => json_encode([
                'is_coming_soon' => (bool) ($item['is_coming_soon'] ?? false),
                'is_out_of_stock_encargo' => (bool) ($item['is_out_of_stock_encargo'] ?? false),
            ]),
        ];
    }

    /**
     * Orden estable de las líneas (mantener determinismo en el log).
     */
    private function sortItems(array $items): array
    {
        return collect($items)->sortBy('product_id')->values()->all();
    }

    /**
     * Indica si alguna línea representa un producto "Próximamente".
     */
    private function linesContainComingSoon(array $items): bool
    {
        foreach ($items as $item) {
            if (! empty($item['is_coming_soon']) || ! empty($item['is_out_of_stock_encargo'])) {
                return true;
            }
        }
        return false;
    }
}