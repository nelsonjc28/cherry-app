<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\MercadoPagoService;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Address;
use App\Models\DayFortyFive;
use App\Models\PaymentCard;
use App\Models\User;
use App\Models\Producto;
use App\Models\Notification;
use App\Models\VendorBuyer;
use App\Services\ExternalSalesService;
use App\Services\CreditAvailabilityService;
use App\Services\OrderCreditSplitService;
use App\Services\OrderPricingService;
use App\Services\ExternalClienteDiscountService;
use App\Services\UserSellerCategoryActivityService;
use App\Services\OrderPrintViewDataBuilder;
use App\Services\OrderSharePdfService;
use Illuminate\Support\Facades\Storage;
use App\Mail\OrderConfirmationMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;
use App\Support\OrderItemDetalleResolver;
use Illuminate\Support\Str;
use Dompdf\Dompdf;
use Dompdf\Options;

class PaymentController extends Controller
{
    protected $mercadoPagoService;
    protected $externalSalesService;
    protected CreditAvailabilityService $creditAvailabilityService;

    protected OrderCreditSplitService $orderCreditSplitService;

    protected OrderPricingService $orderPricingService;

    protected ExternalClienteDiscountService $externalClienteDiscountService;

    protected UserSellerCategoryActivityService $sellerCategoryActivityService;

    protected OrderPrintViewDataBuilder $orderPrintViewDataBuilder;

    protected OrderSharePdfService $orderSharePdfService;

    public function __construct(
        MercadoPagoService $mercadoPagoService,
        ExternalSalesService $externalSalesService,
        CreditAvailabilityService $creditAvailabilityService,
        OrderCreditSplitService $orderCreditSplitService,
        OrderPricingService $orderPricingService,
        ExternalClienteDiscountService $externalClienteDiscountService,
        UserSellerCategoryActivityService $sellerCategoryActivityService,
        OrderPrintViewDataBuilder $orderPrintViewDataBuilder,
        OrderSharePdfService $orderSharePdfService
    ) {
        $this->mercadoPagoService = $mercadoPagoService;
        $this->externalSalesService = $externalSalesService;
        $this->creditAvailabilityService = $creditAvailabilityService;
        $this->orderCreditSplitService = $orderCreditSplitService;
        $this->orderPricingService = $orderPricingService;
        $this->externalClienteDiscountService = $externalClienteDiscountService;
        $this->sellerCategoryActivityService = $sellerCategoryActivityService;
        $this->orderPrintViewDataBuilder = $orderPrintViewDataBuilder;
        $this->orderSharePdfService = $orderSharePdfService;
    }

    /**
     * Misma noción que el front {@see hasApiVolumeMainPercent}: descuento1 de la API de clientes presente y &gt; 0.
     * Usa `users.volume_descuento1` si ya está sincronizado; si no, consulta la API externa.
     */
    protected function userHasApiVolumeMainPercent(User $user): bool
    {
        $raw = $user->getAttribute('volume_descuento1');
        if ($raw !== null && $raw !== '' && (float) $raw > 0) {
            return true;
        }

        $r = $this->externalClienteDiscountService->fetchDiscountPercents((int) $user->id);

        return $r['success']
            && $r['descuento1'] !== null
            && (float) $r['descuento1'] > 0;
    }

    /**
     * Construye el array para persistir un order_item con detalle_id (variante talla/color) cuando exista.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    /**
     * Añade contexto tipo e‑commerce (id interno, categoría, grupo) a la carga hacia {@see MercadoPagoService::createPreference}.
     *
     * @param  array{
     *   order_group_id?: string|null,
     *   sibling_order_id?: int|string|null,
     *   is_split?: bool
     * }  $options
     * @return array<string, mixed>
     */
    protected function withMercadopagoCherryOrderContext(array $orderData, User $user, ?Order $order, array $options = []): array
    {
        if ($order) {
            $order->loadMissing('user');
            if ($order->user) {
                $user = $order->user;
            }
        }
        $orderData['cherry_user_id'] = (int) $user->id;
        $orderData['cherry_seller_category'] = (string) ($user->seller_category ?? '');

        if ($order) {
            $orderData['cherry_order_id'] = (int) $order->id;
            $prefix = $order->orderNumberPrefixForDisplay();
            $orderData['cherry_order_number'] = $prefix.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT);
        }

        $g = $options['order_group_id'] ?? $order?->order_group_id;
        if (! empty($g)) {
            $orderData['cherry_order_group_id'] = (string) $g;
        }

        if (! empty($options['sibling_order_id'])) {
            $orderData['cherry_sibling_order_id'] = (string) $options['sibling_order_id'];
        }

        if (! empty($options['is_split'])) {
            $orderData['cherry_is_split'] = '1';
        }

        return $orderData;
    }

    protected function orderItemPayloadFromLine(int $orderId, array $item): array
    {
        $qty = (int) ($item['quantity'] ?? 0);
        $price = (float) ($item['price'] ?? 0);
        $pid = (string) ($item['product_id'] ?? '');
        $name = $item['name'] ?? 'Producto';
        $lowerName = strtolower((string) $name);
        $isShippingLine = $pid === '0' || str_contains($lowerName, 'envío') || str_contains($lowerName, 'envio') || str_contains($lowerName, 'ajuste');
        $detalleId = $isShippingLine ? null : OrderItemDetalleResolver::resolve($item);

        $productDetails = null;
        if (! $isShippingLine) {
            $productDetails = array_filter([
                'desc_promo' => $item['desc_promo'] ?? null,
                'precio1' => isset($item['precio1']) ? (float) $item['precio1'] : null,
                'user_offer_applies' => filter_var($item['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'offer_discount_percentage' => isset($item['offer_discount_percentage'])
                    ? (float) $item['offer_discount_percentage']
                    : null,
                'offer_discount_type' => $item['offer_discount_type'] ?? null,
                'offer_discount_category' => $item['offer_discount_category'] ?? null,
            ], static fn ($v) => $v !== null && $v !== '');
        }

        return [
            'order_id' => $orderId,
            'product_id' => $pid,
            'name' => $name,
            'size' => $item['size'] ?? null,
            'color' => $item['color'] ?? null,
            'barcode' => $item['barcode'] ?? null,
            'detalle_id' => $detalleId,
            'quantity' => $qty,
            'price' => $price,
            'subtotal' => round($qty * $price, 2),
            'product_details' => $productDetails ?: null,
        ];
    }

    /**
     * Líneas para {@see OrderPricingService::summarizeVolumeFromItems} / subset.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    protected function pricingLinesFromRequestItems(array $items): array
    {
        $out = [];
        foreach ($items as $item) {
            $out[] = [
                'price' => (float) ($item['price'] ?? 0),
                'quantity' => (int) ($item['quantity'] ?? 0),
                'desc_promo' => $item['desc_promo'] ?? null,
                'user_offer_applies' => filter_var($item['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN),
            ];
        }

        return $out;
    }

    /**
     * "En oferta": precio oferta de catálogo o oferta de usuario.
     */
    protected function lineRequestIsOnPromo(array $item): bool
    {
        $d = (float) ($item['desc_promo'] ?? 0);

        if ($d > 0.0001) {
            return true;
        }

        return filter_var($item['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    protected function requestItemsHavePromoAndRegularMix(array $items): bool
    {
        $nPromo = 0;
        $nReg = 0;
        foreach ($items as $item) {
            if ($this->lineRequestIsOnPromo($item)) {
                $nPromo++;
            } else {
                $nReg++;
            }
        }

        return $nPromo > 0 && $nReg > 0;
    }

    /**
     * Items hacia Mercado Pago: ajusta por la diferencia entre total_amount y suma de ítems (envío o factor).
     */
    protected function buildItemsForMercadoPagoForCheckout(Request $request): array
    {
        $itemsTotal = 0;
        foreach ($request->items as $item) {
            $itemsTotal += ((float) $item['price'] * (int) $item['quantity']);
        }
        $totalAmount = (float) $request->total_amount;
        $difference = $totalAmount - $itemsTotal;

        Log::info('Cálculo de totales para Mercado Pago', [
            'items_total' => $itemsTotal,
            'total_amount_recibido' => $totalAmount,
            'diferencia' => $difference,
        ]);

        $itemsForMercadoPago = $request->items;
        if (abs($difference) > 0.01) {
            if ($difference > 0) {
                $itemsForMercadoPago[] = [
                    'product_id' => 0,
                    'name' => 'Envío',
                    'quantity' => 1,
                    'price' => $difference,
                    'size' => null,
                    'color' => null,
                    'barcode' => null,
                ];
            } else {
                $adjustmentFactor = $totalAmount / $itemsTotal;
                foreach ($itemsForMercadoPago as &$item) {
                    $item['price'] = round((float) $item['price'] * $adjustmentFactor, 2);
                }
                unset($item);
                Log::info('Ajuste de precios aplicado', [
                    'factor_ajuste' => $adjustmentFactor,
                    'total_original_items' => $itemsTotal,
                    'total_ajustado' => array_sum(array_map(function ($item) {
                        return (float) $item['price'] * (int) $item['quantity'];
                    }, $itemsForMercadoPago)),
                ]);
            }
        }

        return $itemsForMercadoPago;
    }

    /**
     * Fusiona el payload del webhook con payment_data del pedido (delivery, envío, metadatos de order_group).
     */
    protected function paymentDataArrayAfterWebhookMerge(Order $order, $rawFromResult): array
    {
        $previousPaymentData = $order->payment_data ?? [];
        if (is_string($previousPaymentData)) {
            $previousPaymentData = json_decode($previousPaymentData, true) ?? [];
        }
        $newPaymentData = $rawFromResult;
        if (is_string($newPaymentData)) {
            $newPaymentData = json_decode($newPaymentData, true) ?? [];
        }
        if (is_object($newPaymentData)) {
            $newPaymentData = (array) $newPaymentData;
        }
        if (isset($previousPaymentData['delivery_type'])) {
            $newPaymentData['delivery_type'] = $previousPaymentData['delivery_type'];
        }
        if ($order->shipping_amount !== null) {
            $newPaymentData['shipping_amount'] = (float) $order->shipping_amount;
        } elseif (isset($previousPaymentData['shipping_amount'])) {
            $newPaymentData['shipping_amount'] = $previousPaymentData['shipping_amount'];
        }
        if (isset($previousPaymentData['order_group_id'])) {
            $newPaymentData['order_group_id'] = $previousPaymentData['order_group_id'];
        }
        if (isset($previousPaymentData['order_group_sibling_ids'])) {
            $newPaymentData['order_group_sibling_ids'] = $previousPaymentData['order_group_sibling_ids'];
        }
        if (array_key_exists('order_group', $previousPaymentData)) {
            $newPaymentData['order_group'] = $previousPaymentData['order_group'];
        }
        if (array_key_exists('order_group_is_mp_primary', $previousPaymentData)) {
            $newPaymentData['order_group_is_mp_primary'] = $previousPaymentData['order_group_is_mp_primary'];
        }
        if (array_key_exists('order_group_sibling_id', $previousPaymentData)) {
            $newPaymentData['order_group_sibling_id'] = $previousPaymentData['order_group_sibling_id'];
        }

        return is_array($newPaymentData) ? $newPaymentData : [];
    }

    /**
     * Misma base que {@see createOfferSplitMercadoPagoPaymentPreference} / pedido directo oro-diamante con split.
     */
    protected function requestVolumePricingLineCountInvalidResponse(Request $request): ?\Illuminate\Http\JsonResponse
    {
        $allItems = $request->items;
        $volRaw = $request->input('items_for_volume_pricing');
        if (is_array($volRaw) && count($volRaw) > 0 && count($volRaw) !== count($allItems)) {
            return response()->json([
                'success' => false,
                'message' => 'items_for_volume_pricing debe tener la misma cantidad de líneas que items para el split oferta/regular.',
            ], 422);
        }

        return null;
    }

    /**
     * Totales por mitad (oferta vs precio de lista) para mezcla promo + regular.
     * El envío del request se asigna por completo a la orden de oferta (shipP); la de lista queda en 0 (shipR).
     *
     * @param  array<int, array<string, mixed>>  $itemsForPricing
     * @param  array<int, array<string, mixed>>|null  $fullItemsForPricing
     * @return array{
     *   onPromoItems: array,
     *   regularItems: array,
     *   mPromo: float,
     *   mReg: float,
     *   totalA: float,
     *   totalB: float,
     *   shipP: float,
     *   shipR: float,
     *   grossPromo: float,
     *   grossReg: float
     * }
     */
    protected function computePromoRegularSplitFromRequest(
        Request $request,
        User $user,
        array $itemsForPricing,
        ?array $fullItemsForPricing
    ): array {
        $onPromoItems = [];
        $regularItems = [];
        foreach ($request->items as $row) {
            if ($this->lineRequestIsOnPromo($row)) {
                $onPromoItems[] = $row;
            } else {
                $regularItems[] = $row;
            }
        }

        $linesFull = $fullItemsForPricing !== null
            ? $fullItemsForPricing
            : $itemsForPricing;

        $onPromoPricing = $this->pricingLinesFromRequestItems($onPromoItems);
        $regularPricing = $this->pricingLinesFromRequestItems($regularItems);

        $mPromo0 = $this->orderPricingService->discountedMerchandiseForSubset(
            $user,
            $linesFull,
            $onPromoPricing
        );
        $mReg0 = $this->orderPricingService->discountedMerchandiseForSubset(
            $user,
            $linesFull,
            $regularPricing
        );

        $targetMerc = round((float) $request->input('discounted_total'), 2);
        $mPromo = (float) $mPromo0;
        $mReg = (float) $mReg0;
        $drift = round($targetMerc - ($mPromo + $mReg), 2);
        if (abs($drift) > 0.0001) {
            if ($mPromo >= $mReg) {
                $mPromo = round($mPromo + $drift, 2);
            } else {
                $mReg = round($mReg + $drift, 2);
            }
        }

        $shipping = (float) $request->input('shipping_amount', 0);
        // Split oferta/lista: el envío va entero a la orden de oferta (primary MP); la otra queda en 0.
        $shipP = round($shipping, 2);
        $shipR = 0.0;

        $totalA = round($mPromo + $shipP, 2);
        $totalB = round($mReg + $shipR, 2);
        $taTarget = round((float) $request->input('total_amount'), 2);
        $tsum = $totalA + $totalB;
        $cfix = round($taTarget - $tsum, 2);
        if (abs($cfix) > 0.0001) {
            if ($totalA >= $totalB) {
                $totalA = round($totalA + $cfix, 2);
            } else {
                $totalB = round($totalB + $cfix, 2);
            }
        }

        $grossPromo = 0.0;
        foreach ($onPromoItems as $it) {
            $grossPromo += round((float) $it['price'] * (int) $it['quantity'], 2);
        }
        $grossReg = 0.0;
        foreach ($regularItems as $it) {
            $grossReg += round((float) $it['price'] * (int) $it['quantity'], 2);
        }

        return [
            'onPromoItems' => $onPromoItems,
            'regularItems' => $regularItems,
            'mPromo' => $mPromo,
            'mReg' => $mReg,
            'totalA' => $totalA,
            'totalB' => $totalB,
            'shipP' => $shipP,
            'shipR' => $shipR,
            'grossPromo' => $grossPromo,
            'grossReg' => $grossReg,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $itemsForPricing
     * @param  array<int, array<string, mixed>>|null  $fullItemsForPricing
     */
    protected function createOfferSplitMercadoPagoPaymentPreference(
        Request $request,
        User $user,
        $address,
        ?int $addressId,
        string $deliveryType,
        array $itemsForPricing,
        ?array $fullItemsForPricing
    ) {
        $err = $this->requestVolumePricingLineCountInvalidResponse($request);
        if ($err !== null) {
            return $err;
        }

        $split = $this->computePromoRegularSplitFromRequest($request, $user, $itemsForPricing, $fullItemsForPricing);
        $onPromoItems = $split['onPromoItems'];
        $regularItems = $split['regularItems'];
        $mPromo = $split['mPromo'];
        $mReg = $split['mReg'];
        $totalA = $split['totalA'];
        $totalB = $split['totalB'];
        $shipP = $split['shipP'];
        $shipR = $split['shipR'];
        $grossPromo = $split['grossPromo'];
        $grossReg = $split['grossReg'];

        $d1 = (float) $request->input('descuento1', 0);
        $d2 = (float) $request->input('descuento2', 0);

        $orderGroupId = (string) Str::uuid();
        $refOnPromo = uniqid('order_' . $user->id . '_oferta_');
        $refReg = uniqid('order_' . $user->id . '_reg_');

        $orderOnPromo = null;
        $orderReg = null;
        $preference = null;

        try {
            DB::beginTransaction();

            $orderOnPromo = Order::create([
                'user_id' => $user->id,
                'address_id' => $addressId,
                'order_group_id' => $orderGroupId,
                'total_amount' => $totalA,
                'subtotal' => (float) $grossPromo,
                'discounted_total' => (float) $mPromo,
                'shipping_amount' => (float) $shipP,
                'descuento1' => $d1,
                'descuento2' => $d2,
                'status' => 'pending',
                'payment_method' => 'mercadopago',
                'external_reference' => $refOnPromo,
            ]);
            $orderReg = Order::create([
                'user_id' => $user->id,
                'address_id' => $addressId,
                'order_group_id' => $orderGroupId,
                'total_amount' => $totalB,
                'subtotal' => (float) $grossReg,
                'discounted_total' => (float) $mReg,
                'shipping_amount' => (float) $shipR,
                'descuento1' => $d1,
                'descuento2' => $d2,
                'status' => 'pending',
                'payment_method' => 'mercadopago',
                'external_reference' => $refReg,
            ]);

            foreach ($onPromoItems as $item) {
                OrderItem::create($this->orderItemPayloadFromLine($orderOnPromo->id, $item));
            }
            foreach ($regularItems as $item) {
                OrderItem::create($this->orderItemPayloadFromLine($orderReg->id, $item));
            }

            $siblingIds = [$orderOnPromo->id, $orderReg->id];
            $primaryOrder = $orderOnPromo;

            $itemsForMercadoPago = $this->buildItemsForMercadoPagoForCheckout($request);
            $orderData = [
                'order_id' => $primaryOrder->external_reference,
                'user' => [
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                ],
                'address' => $addressId && $address ? [
                    'street_address' => $address->street_address,
                    'city' => $address->city,
                    'state' => $address->state,
                    'postal_code' => $address->postal_code,
                    'country' => $address->country,
                ] : [
                    'street_address' => '',
                    'city' => '',
                    'state' => '',
                    'postal_code' => '',
                    'country' => 'México',
                ],
                'items' => $itemsForMercadoPago,
                'delivery_type' => $deliveryType,
                'shipping_amount' => $request->input('shipping_amount', 0),
            ];
            $orderData = $this->withMercadopagoCherryOrderContext(
                $orderData,
                $user,
                $orderOnPromo,
                [
                    'order_group_id' => $orderGroupId,
                    'sibling_order_id' => $orderReg->id,
                    'is_split' => true,
                ]
            );

            Log::info('Creando preferencia MercadoPago (split oferta/regular)', [
                'order_on_promo_id' => $orderOnPromo->id,
                'order_regular_id' => $orderReg->id,
                'order_group_id' => $orderGroupId,
                'external_reference' => $primaryOrder->external_reference,
            ]);

            $preference = $this->mercadoPagoService->createPreference($orderData);

            $basePd = [
                'delivery_type' => $deliveryType,
                'shipping_amount' => (float) $request->input('shipping_amount', 0),
                'order_group_id' => $orderGroupId,
                'order_group' => true,
                'order_group_sibling_ids' => $siblingIds,
                'order_group_is_mp_primary' => true,
                'order_group_sibling_id' => $orderReg->id,
            ];
            $pdPrimary = $basePd;
            $pdSib = [
                'delivery_type' => $deliveryType,
                'shipping_amount' => (float) $orderReg->shipping_amount,
                'order_group_id' => $orderGroupId,
                'order_group' => true,
                'order_group_sibling_ids' => $siblingIds,
                'order_group_is_mp_primary' => false,
                'order_group_sibling_id' => $orderOnPromo->id,
            ];

            $orderOnPromo->update([
                'mercadopago_preference_id' => $preference->id,
                'payment_data' => json_encode($pdPrimary),
            ]);
            $orderReg->update([
                'payment_data' => json_encode($pdSib),
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear preferencia de MercadoPago (split oferta)', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear la preferencia de pago: ' . $e->getMessage(),
            ], 500);
        }

        $primaryOrder = $orderOnPromo;
        $primaryOrder->load(['user', 'address', 'items']);
        $orderReg->load(['user', 'address', 'items']);
        $mpUrls = $this->mercadoPagoCheckoutUrlsFromPreference($preference);

        return response()->json([
            'success' => true,
            'message' => 'Preferencia de pago creada correctamente (pedido dividido: oferta + regular).',
            'data' => [
                'order_id' => $primaryOrder->id,
                'order_group_id' => $orderGroupId,
                'order_split' => true,
                'orders' => [
                    [
                        'id' => $orderOnPromo->id,
                        'type' => 'on_promo',
                        'external_reference' => $orderOnPromo->external_reference,
                    ],
                    [
                        'id' => $orderReg->id,
                        'type' => 'regular',
                        'external_reference' => $orderReg->external_reference,
                    ],
                ],
                'external_reference' => $primaryOrder->external_reference,
                'preference_id' => $preference->id,
                'redirect_url' => $mpUrls['redirect_url'],
                'payment_url' => $mpUrls['pay_url'],
                'sandbox_payment_url' => $mpUrls['sandbox_url'],
                'init_point' => $mpUrls['init_point'],
                'sandbox_init_point' => $mpUrls['sandbox_init_point'],
            ],
        ]);
    }

    /**
     * Si falla Mercado Pago tras un split, elimina ambas órdenes y re-sincroniza cupo (no dejar crédito “confirmado” sin cobro MP).
     */
    protected function rollbackCreditSplitOrders(?Order $orderCredit, Order $orderPayment, User $user): void
    {
        DB::transaction(function () use ($orderCredit, $orderPayment) {
            if ($orderCredit !== null) {
                OrderItem::where('order_id', $orderCredit->id)->delete();
                Order::whereKey($orderCredit->id)->delete();
            }
            OrderItem::where('order_id', $orderPayment->id)->delete();
            Order::whereKey($orderPayment->id)->delete();
        });

        $fresh = User::query()->whereKey($user->id)->first();
        if ($fresh) {
            $this->creditAvailabilityService->syncCreditBalanceFromOrders($fresh);
        }

        Log::warning('Split crédito/Mercado Pago revertido tras fallo al crear preferencia', [
            'order_credit_id' => $orderCredit?->id,
            'order_payment_id' => $orderPayment->id,
            'user_id' => $user->id,
        ]);
    }

    /**
     * URLs de checkout Pro: MP puede devolver init_point como "" y el operador ?? no usa el fallback.
     *
     * @param  object{id?: ?string, init_point?: ?string, sandbox_init_point?: ?string}  $preference
     * @return array{pay_url: string, sandbox_url: string, redirect_url: string, init_point: ?string, sandbox_init_point: ?string}
     */
    protected function mercadoPagoCheckoutUrlsFromPreference(object $preference): array
    {
        $prefId = $preference->id ?? null;

        $rawInit = $preference->init_point ?? null;
        $rawSandbox = $preference->sandbox_init_point ?? null;

        $initTrim = is_string($rawInit) ? trim($rawInit) : '';
        $sandboxTrim = is_string($rawSandbox) ? trim($rawSandbox) : '';

        $fallbackPay = $this->mercadoPagoService->getPaymentUrl($prefId);
        $fallbackSandbox = $this->mercadoPagoService->getSandboxPaymentUrl($prefId);

        $payUrl = $initTrim !== '' ? $rawInit : $fallbackPay;
        $sandboxUrl = $sandboxTrim !== '' ? $rawSandbox : $fallbackSandbox;

        $redirectUrl = ($initTrim !== '' ? $rawInit : null)
            ?: ($sandboxTrim !== '' ? $rawSandbox : null)
            ?: $payUrl
            ?: $sandboxUrl;

        return [
            'pay_url' => $payUrl,
            'sandbox_url' => $sandboxUrl,
            'redirect_url' => $redirectUrl,
            'init_point' => $initTrim !== '' ? $rawInit : null,
            'sandbox_init_point' => $sandboxTrim !== '' ? $rawSandbox : null,
        ];
    }

    /**
     * Para split crédito/MP: primero líneas disponibles (no pre-order), luego "próximamente", para que el cupo cubra surtido inmediato antes que encargos.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    protected function sortItemsForCreditSplit(array $items): array
    {
        $sorted = array_values($items);
        usort($sorted, function ($a, $b) {
            $aSoon = $this->lineIsEncargo($a);
            $bSoon = $this->lineIsEncargo($b);
            if ($aSoon !== $bSoon) {
                return $aSoon <=> $bSoon;
            }
            $aLine = (float) ($a['price'] ?? 0) * (int) ($a['quantity'] ?? 0);
            $bLine = (float) ($b['price'] ?? 0) * (int) ($b['quantity'] ?? 0);
            if (abs($aLine - $bLine) > 0.0001) {
                return $aLine <=> $bLine;
            }

            return (float) ($a['price'] ?? 0) <=> (float) ($b['price'] ?? 0);
        });

        return $sorted;
    }

    /**
     * Línea de encargo: Próximamente o Agotado (Oro/Diamante).
     *
     * @param  array<string, mixed>  $line
     */
    protected function lineIsEncargo(array $line): bool
    {
        if (filter_var($line['is_coming_soon'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return true;
        }

        return filter_var($line['is_out_of_stock_encargo'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     */
    protected function orderLinesContainComingSoon(array $lines): bool
    {
        foreach ($lines as $line) {
            if ($this->lineIsEncargo($line)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Rebaja de catálogo (desc_promo > 0) agotada: no permite encargo / pedido adelantado.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    protected function rejectRebajaAgotadoEncargoLines(array $items): ?\Illuminate\Http\JsonResponse
    {
        $productIds = [];

        foreach ($items as $item) {
            if (! filter_var($item['is_out_of_stock_encargo'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
                continue;
            }
            $productId = (string) ($item['product_id'] ?? '');
            if ($productId !== '') {
                $productIds[] = $productId;
            }
        }

        if ($productIds === []) {
            return null;
        }

        $hasRebajaAgotadoEncargo = Producto::query()
            ->whereIn('id', array_unique($productIds))
            ->where('desc_promo', '>', 0)
            ->exists();

        if ($hasRebajaAgotadoEncargo) {
            return response()->json([
                'success' => false,
                'message' => 'Los productos en rebaja agotados no están disponibles para pedido adelantado.',
            ], 422);
        }

        return null;
    }

    /**
     * Regla bronce: el envío a domicilio solo se permite si el cliente cumple el
     * mínimo de piezas sin `desc_promo` y sin oferta de usuario.
     * Devuelve un 422 cuando un cliente bronce intenta `envio` sin alcanzar el umbral.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    protected function rejectBronzeShippingWithoutPieces(User $user, string $deliveryType, array $items): ?\Illuminate\Http\JsonResponse
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
     * Pedido directo (descuento por volumen desde API de clientes): sin Mercado Pago; pendiente de liquidación administrativa.
     */
    public function createDirectOrder(Request $request)
    {
        $deliveryType = $request->input('delivery_type', 'envio');

        $rules = [
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
            'buyer_id' => 'nullable|integer|exists:users,id',
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

        if ($rebajaEncargoError = $this->rejectRebajaAgotadoEncargoLines($request->input('items', []))) {
            return $rebajaEncargoError;
        }

        /** @var User $vendor */
        $vendor = Auth::user();

        if (! $vendor) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado',
            ], 401);
        }

        // Determinar si es vendedor haciendo pedido para un cliente
        $buyerId = $request->input('buyer_id');
        $isVendorOrder = $vendor->isVendedor() && ! empty($buyerId);

        // Resolver el usuario real de la orden (el comprador)
        $orderUser = $vendor;
        if ($isVendorOrder) {
            /** @var User|null $buyer */
            $buyer = User::find($buyerId);
            if (! $buyer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado.',
                ], 404);
            }

            // Validar que el buyer tenga el mismo idvendedor que el vendedor
            $vendorIdvendedor = $vendor->idvendedor;
            if (empty($vendorIdvendedor) || $buyer->idvendedor !== $vendorIdvendedor) {
                return response()->json([
                    'success' => false,
                    'message' => 'El cliente seleccionado no está asociado a este vendedor.',
                ], 403);
            }

            // Validar que el buyer siga siendo oro/diamante
            if (! in_array($buyer->seller_category, VendorBuyer::ALLOWED_BUYER_CATEGORIES, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El cliente ya no pertenece a las categorías oro/diamante.',
                ], 403);
            }

            $orderUser = $buyer;
        }

        $bronzeShippingError = $this->rejectBronzeShippingWithoutPieces($orderUser, $deliveryType, $request->input('items', []));
        if ($bronzeShippingError !== null) {
            return $bronzeShippingError;
        }

        // Para flujo no-vendor: validar premium
        if (! $isVendorOrder && ! $orderUser->isPremiumSeller()) {
            return response()->json([
                'success' => false,
                'message' => 'El pedido directo solo está disponible para clientes con categoría Oro o Diamante.',
            ], 403);
        }

        // Para vendor: el buyer debe ser premium (ya validado arriba con ALLOWED_BUYER_CATEGORIES)

        $pendingOrderCheck = $this->checkPendingOrdersWithSimilarProducts($orderUser, $request->items);
        if ($pendingOrderCheck['has_pending']) {
            return response()->json([
                'success' => false,
                'message' => $pendingOrderCheck['message'],
                'pending_order' => $pendingOrderCheck['order'],
                'has_pending_order' => true,
            ], 422);
        }

        $addressId = null;
        if ($deliveryType === 'envio') {
            // Si es vendedor, validar que la dirección pertenece al buyer
            $address = $orderUser->addresses()->find($request->address_id);
            if (! $address) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dirección no encontrada o no pertenece al cliente',
                ], 404);
            }
            $addressId = $request->address_id;
        }

        $itemsForPricing = $this->pricingLinesFromRequestItems($request->items);
        $fullRaw = $request->input('items_for_volume_pricing');
        $fullItemsForPricing = is_array($fullRaw) && count($fullRaw) > 0
            ? $this->pricingLinesFromRequestItems($fullRaw)
            : null;

        if ($fullItemsForPricing !== null) {
            $expectedMerchandise = $this->orderPricingService->discountedMerchandiseForSubset(
                $orderUser,
                $fullItemsForPricing,
                $itemsForPricing
            );
        } else {
            $summary = $this->orderPricingService->summarizeVolumeFromItems($orderUser, $itemsForPricing);
            $expectedMerchandise = $summary['discounted_merchandise'];
        }

        $summaryLines = $this->orderPricingService->summarizeVolumeFromItems($orderUser, $itemsForPricing);
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

        if ($this->requestItemsHavePromoAndRegularMix($request->items)) {
            $err = $this->requestVolumePricingLineCountInvalidResponse($request);
            if ($err !== null) {
                return $err;
            }

            return $this->createDirectOrderWithPromoRegularSplit(
                $request,
                $orderUser,
                $addressId,
                $deliveryType,
                $itemsForPricing,
                $fullItemsForPricing
            );
        }

        $descuento1 = (float) $request->input('descuento1', 0);
        $descuento2 = (float) $request->input('descuento2', 0);
        $subtotal = (float) $request->input('subtotal', $summaryLines['lines_sum']);
        $sortedItems = $this->sortItemsForCreditSplit($request->items);

        try {
            /** @var Order $order */
            $order = DB::transaction(function () use ($request, $vendor, $orderUser, $addressId, $deliveryType, $totalAmountReq, $subtotal, $discountedTotalReq, $shippingAmount, $descuento1, $descuento2, $sortedItems, $isVendorOrder) {
                $initialPaymentData = [
                    'delivery_type' => $deliveryType,
                    'shipping_amount' => $shippingAmount,
                ];

                // Si es vendedor, registrar quién colocó el pedido
                if ($isVendorOrder) {
                    $initialPaymentData['placed_by_vendor_id'] = $vendor->id;
                    $initialPaymentData['vendor_placed'] = true;
                }

                $order = Order::create([
                    'user_id' => $orderUser->id,
                    'placed_by_vendor_id' => $isVendorOrder ? $vendor->id : null,
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
                    'external_reference' => uniqid('order_'.$orderUser->id.'_'),
                    'payment_data' => json_encode($initialPaymentData),
                    'is_advance_order' => $this->orderLinesContainComingSoon($sortedItems),
                ]);

                foreach ($sortedItems as $item) {
                    OrderItem::create($this->orderItemPayloadFromLine($order->id, $item));
                }

                return $order->fresh(['user', 'items', 'address']);
            });

            // Email: si es vendedor, enviar al buyer (cliente real)
            $emailRecipient = $isVendorOrder ? $orderUser : $vendor;
            try {
                Mail::to($emailRecipient->email)->send(new OrderConfirmationMail($order));
                Log::info('Email de confirmación enviado (pedido directo)', [
                    'order_id' => $order->id,
                    'recipient_email' => $emailRecipient->email,
                    'vendor_placed' => $isVendorOrder,
                ]);
            } catch (\Exception $e) {
                Log::error('Error al enviar email de confirmación (pedido directo)', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // API externa: enviar al registrar el pedido (pendiente_pago)
            try {
                $order->load(['user', 'items', 'address']);
                $apiResult = $this->externalSalesService->sendSaleToExternalApi($order);
                $this->externalSalesService->logSendResultIfApplicable(
                    $order,
                    $apiResult,
                    'Pedido directo (pendiente_pago) enviado a API externa'
                );
            } catch (\Exception $e) {
                Log::error('Error al enviar pedido directo a API externa', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }

            $this->orderSharePdfService->ensureStoredForOrder($order);

            $message = $isVendorOrder
                ? 'Pedido registrado para el cliente. Queda pendiente de pago hasta liquidación.'
                : 'Pedido registrado. Queda pendiente de pago hasta liquidación.';

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'order_id' => $order->id,
                    'external_reference' => $order->external_reference,
                    'payment_method' => 'pedido_directo',
                    'order_status' => 'pendiente_pago',
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error en createDirectOrder', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'No se pudo confirmar el pedido: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Pedido directo (oro / diamante) con mezcla oferta + a precio de lista: dos órdenes y mismo order_group_id.
     *
     * @param  array<int, array<string, mixed>>  $itemsForPricing
     * @param  array<int, array<string, mixed>>|null  $fullItemsForPricing
     */
    protected function createDirectOrderWithPromoRegularSplit(
        Request $request,
        User $user,
        ?int $addressId,
        string $deliveryType,
        array $itemsForPricing,
        ?array $fullItemsForPricing
    ) {
        $split = $this->computePromoRegularSplitFromRequest($request, $user, $itemsForPricing, $fullItemsForPricing);
        $onPromoItems = $this->sortItemsForCreditSplit($split['onPromoItems']);
        $regularItems = $this->sortItemsForCreditSplit($split['regularItems']);
        $mPromo = $split['mPromo'];
        $mReg = $split['mReg'];
        $totalA = $split['totalA'];
        $totalB = $split['totalB'];
        $shipP = $split['shipP'];
        $shipR = $split['shipR'];
        $grossPromo = $split['grossPromo'];
        $grossReg = $split['grossReg'];

        $d1 = (float) $request->input('descuento1', 0);
        $d2 = (float) $request->input('descuento2', 0);
        $orderGroupId = (string) Str::uuid();
        $refOnPromo = uniqid('order_'.$user->id.'_oferta_');
        $refReg = uniqid('order_'.$user->id.'_reg_');

        try {
            $orders = DB::transaction(function () use ($user, $addressId, $deliveryType, $onPromoItems, $regularItems, $orderGroupId, $refOnPromo, $refReg, $d1, $d2, $grossPromo, $grossReg, $mPromo, $mReg, $shipP, $shipR, $totalA, $totalB) {
                $orderOnPromo = Order::create([
                    'user_id' => $user->id,
                    'address_id' => $addressId,
                    'order_group_id' => $orderGroupId,
                    'total_amount' => $totalA,
                    'subtotal' => (float) $grossPromo,
                    'discounted_total' => (float) $mPromo,
                    'shipping_amount' => (float) $shipP,
                    'descuento1' => $d1,
                    'descuento2' => $d2,
                    'credit_used' => 0,
                    'amount_paid' => 0,
                    'amount_pending' => $totalA,
                    'paid_with_credit' => false,
                    'status' => 'pendiente_pago',
                    'payment_method' => 'pedido_directo',
                    'external_reference' => $refOnPromo,
                    'is_advance_order' => $this->orderLinesContainComingSoon($onPromoItems),
                ]);

                $orderReg = Order::create([
                    'user_id' => $user->id,
                    'address_id' => $addressId,
                    'order_group_id' => $orderGroupId,
                    'total_amount' => $totalB,
                    'subtotal' => (float) $grossReg,
                    'discounted_total' => (float) $mReg,
                    'shipping_amount' => (float) $shipR,
                    'descuento1' => $d1,
                    'descuento2' => $d2,
                    'credit_used' => 0,
                    'amount_paid' => 0,
                    'amount_pending' => $totalB,
                    'paid_with_credit' => false,
                    'status' => 'pendiente_pago',
                    'payment_method' => 'pedido_directo',
                    'external_reference' => $refReg,
                    'is_advance_order' => $this->orderLinesContainComingSoon($regularItems),
                ]);

                $siblingIds = [$orderOnPromo->id, $orderReg->id];

                $pdPromo = [
                    'delivery_type' => $deliveryType,
                    'shipping_amount' => (float) $shipP,
                    'order_group_id' => $orderGroupId,
                    'order_group' => true,
                    'order_group_sibling_ids' => $siblingIds,
                    'order_group_sibling_id' => $orderReg->id,
                ];
                $pdReg = [
                    'delivery_type' => $deliveryType,
                    'shipping_amount' => (float) $shipR,
                    'order_group_id' => $orderGroupId,
                    'order_group' => true,
                    'order_group_sibling_ids' => $siblingIds,
                    'order_group_sibling_id' => $orderOnPromo->id,
                ];

                $orderOnPromo->update(['payment_data' => json_encode($pdPromo)]);
                $orderReg->update(['payment_data' => json_encode($pdReg)]);

                foreach ($onPromoItems as $item) {
                    OrderItem::create($this->orderItemPayloadFromLine($orderOnPromo->id, $item));
                }
                foreach ($regularItems as $item) {
                    OrderItem::create($this->orderItemPayloadFromLine($orderReg->id, $item));
                }

                return [
                    $orderOnPromo->fresh(['user', 'items', 'address']),
                    $orderReg->fresh(['user', 'items', 'address']),
                ];
            });
        } catch (\Exception $e) {
            Log::error('Error en createDirectOrderWithPromoRegularSplit', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'No se pudo confirmar el pedido: '.$e->getMessage(),
            ], 500);
        }

        [$orderOnPromo, $orderReg] = $orders;

        Log::info('Pedido directo (split oferta/regular oro-diamante)', [
            'order_oferta_id' => $orderOnPromo->id,
            'order_regular_id' => $orderReg->id,
            'order_group_id' => $orderGroupId,
        ]);

        foreach ([$orderOnPromo, $orderReg] as $ord) {
            try {
                Mail::to($user->email)->send(new OrderConfirmationMail($ord->load(['user', 'items', 'address'])));
            } catch (\Exception $e) {
                Log::error('Error al enviar email de confirmación (pedido directo split)', [
                    'order_id' => $ord->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        foreach ([$orderOnPromo, $orderReg] as $ord) {
            try {
                $ord->load(['user', 'items', 'address']);
                $this->externalSalesService->sendSaleToExternalApi($ord);
            } catch (\Exception $e) {
                Log::error('Error al enviar pedido directo (split) a API externa', [
                    'order_id' => $ord->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $this->orderSharePdfService->ensureStoredForOrder($orderOnPromo);

        return response()->json([
            'success' => true,
            'message' => 'Pedido registrado (dividido: oferta y precio de lista). Queda pendiente de pago hasta liquidación.',
            'data' => [
                'order_id' => $orderOnPromo->id,
                'order_group_id' => $orderGroupId,
                'order_split' => true,
                'orders' => [
                    [
                        'id' => $orderOnPromo->id,
                        'type' => 'on_promo',
                        'external_reference' => $orderOnPromo->external_reference,
                    ],
                    [
                        'id' => $orderReg->id,
                        'type' => 'regular',
                        'external_reference' => $orderReg->external_reference,
                    ],
                ],
                'external_reference' => $orderOnPromo->external_reference,
                'payment_method' => 'pedido_directo',
                'order_status' => 'pendiente_pago',
            ],
        ]);
    }

    /**
     * Crear una preferencia de pago con MercadoPago
     */
    public function createPaymentPreference(Request $request)
    {
        $deliveryType = $request->input('delivery_type', 'envio');
        
        $rules = [
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
        ];
        
        // address_id es requerido solo si es envío
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
                'errors' => $validator->errors()
            ], 422);
        }

        if ($rebajaEncargoError = $this->rejectRebajaAgotadoEncargoLines($request->input('items', []))) {
            return $rebajaEncargoError;
        }

        /** @var User $user */
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $bronzeShippingError = $this->rejectBronzeShippingWithoutPieces($user, $deliveryType, $request->input('items', []));
        if ($bronzeShippingError !== null) {
            return $bronzeShippingError;
        }

        if ($user->isPremiumSeller()) {
            return response()->json([
                'success' => false,
                'message' => 'Tu cuenta confirma el pedido sin Mercado Pago. Usa el botón Confirmar pedido en el carrito.',
            ], 422);
        }

        // Verificar si hay órdenes pendientes con productos similares
        $pendingOrderCheck = $this->checkPendingOrdersWithSimilarProducts($user, $request->items);
        if ($pendingOrderCheck['has_pending']) {
            return response()->json([
                'success' => false,
                'message' => $pendingOrderCheck['message'],
                'pending_order' => $pendingOrderCheck['order'],
                'has_pending_order' => true
            ], 422);
        }

        /*  try { */
        // Verificar que la dirección pertenece al usuario solo si es envío
        $addressId = null;
        $address = null;
        if ($deliveryType === 'envio') {
        $address = $user->addresses()->find($request->address_id);
        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Dirección no encontrada o no pertenece al usuario'
            ], 404);
            }
            $addressId = $request->address_id;
        }

        // Verificar si el pago es con crédito
        $useCredit = $request->input('use_credit', false);
        
        // Si es pago con crédito, procesar de manera diferente
        if ($useCredit) {
            return $this->processCreditPayment($request, $user, $addressId, $deliveryType);
        }

        $itemsForPricing = $this->pricingLinesFromRequestItems($request->items);
        $fullRaw = $request->input('items_for_volume_pricing');
        $fullItemsForPricing = is_array($fullRaw) && count($fullRaw) > 0
            ? $this->pricingLinesFromRequestItems($fullRaw)
            : null;

        if ($fullItemsForPricing !== null) {
            $expectedMerchandise = $this->orderPricingService->discountedMerchandiseForSubset(
                $user,
                $fullItemsForPricing,
                $itemsForPricing
            );
        } else {
            $summary = $this->orderPricingService->summarizeVolumeFromItems($user, $itemsForPricing);
            $expectedMerchandise = $summary['discounted_merchandise'];
        }

        $shippingAmountVal = (float) $request->input('shipping_amount', 0);
        $discountedTotalReq = round((float) $request->input('discounted_total'), 2);
        $totalAmountReq = round((float) $request->input('total_amount'), 2);

        if (! $this->orderPricingService->totalsMatchRequest(
            $expectedMerchandise,
            $discountedTotalReq,
            $totalAmountReq,
            $shippingAmountVal,
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

        if ($this->requestItemsHavePromoAndRegularMix($request->items)) {
            return $this->createOfferSplitMercadoPagoPaymentPreference(
                $request,
                $user,
                $address,
                $addressId,
                $deliveryType,
                $itemsForPricing,
                $fullItemsForPricing
            );
        }

        DB::beginTransaction();

        // Obtener descuentos del request (20% y 10% adicional)
        $descuento1 = $request->input('descuento1', 0);
        $descuento2 = $request->input('descuento2', 0);
        
        // Obtener subtotal y discounted_total del request
        $subtotal = $request->input('subtotal', 0);
        $discountedTotal = $request->input('discounted_total', 0);

        // Crear el pedido en la base de datos
        $order = Order::create([
            'user_id' => $user->id,
            'address_id' => $addressId,
            'total_amount' => $request->total_amount,
            'subtotal' => (float) $subtotal, // Monto total sin descuentos aplicados
            'discounted_total' => (float) $discountedTotal, // Monto total con descuentos aplicados (sin envío)
            'shipping_amount' => (float) $request->input('shipping_amount', 0),
            'descuento1' => (float) $descuento1, // 20% cuando total elegible >= 7000
            'descuento2' => (float) $descuento2, // 10% adicional cuando total elegible >= 15000
            'status' => 'pending',
            'payment_method' => 'mercadopago',
            'external_reference' => uniqid('order_' . $user->id . '_')
        ]);

        // Crear los items del pedido
        foreach ($request->items as $item) {
            OrderItem::create($this->orderItemPayloadFromLine($order->id, $item));
        }

        DB::commit();

        // Recargar el pedido con relaciones
        $order->load(['user', 'address', 'items']);

        // NO enviar email aquí - se enviará cuando el pago sea aprobado desde el webhook
        // Esto evita envíos duplicados de correo

        try {
            $itemsForMercadoPago = $this->buildItemsForMercadoPagoForCheckout($request);

        // Preparar datos para MercadoPago
        $orderData = [
            'order_id' => $order->external_reference,
            'user' => [
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone
            ],
                'address' => $addressId && $address ? [
                'street_address' => $address->street_address,
                'city' => $address->city,
                'state' => $address->state,
                'postal_code' => $address->postal_code,
                'country' => $address->country
                ] : [
                    'street_address' => '',
                    'city' => '',
                    'state' => '',
                    'postal_code' => '',
                    'country' => 'México'
                ],
                'items' => $itemsForMercadoPago,
                'delivery_type' => $deliveryType,
                'shipping_amount' => $request->input('shipping_amount', 0)
            ];
            $orderData = $this->withMercadopagoCherryOrderContext($orderData, $user, $order);

            Log::info('Creando preferencia de MercadoPago', [
                'order_id' => $order->id,
                'external_reference' => $order->external_reference,
                'items_count' => count($request->items)
            ]);

            // Crear preferencia en MercadoPago con timeout
        $preference = $this->mercadoPagoService->createPreference($orderData);
            
            Log::info('Preferencia creada exitosamente', [
                'preference_id' => $preference->id,
                'order_id' => $order->id
            ]);
            
        // Preparar payment_data inicial con delivery_type y shipping_amount
        $shippingAmount = (float) $request->input('shipping_amount', 0);
        $initialPaymentData = [
            'delivery_type' => $deliveryType,
            'shipping_amount' => $shippingAmount
        ];
        
        // Actualizar el pedido con el ID de preferencia, shipping_amount y payment_data inicial
        $order->update([
            'shipping_amount' => $shippingAmount,
            'mercadopago_preference_id' => $preference->id,
            'payment_data' => json_encode($initialPaymentData)
        ]);

        DB::commit();

            // Recargar el pedido con relaciones
            $order->load(['user', 'address', 'items']);

            // NO enviar email aquí - se enviará cuando el pago sea aprobado desde el webhook
            // Esto evita envíos duplicados de correo

        $mpUrls = $this->mercadoPagoCheckoutUrlsFromPreference($preference);

        return response()->json([
            'success' => true,
            'message' => 'Preferencia de pago creada correctamente',
            'data' => [
                'order_id' => $order->id,
                'external_reference' => $order->external_reference,
                'preference_id' => $preference->id,
                'redirect_url' => $mpUrls['redirect_url'],
                'payment_url' => $mpUrls['pay_url'],
                'sandbox_payment_url' => $mpUrls['sandbox_url'],
                'init_point' => $mpUrls['init_point'],
                'sandbox_init_point' => $mpUrls['sandbox_init_point'],
            ],
        ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error al crear preferencia de MercadoPago', [
                'order_id' => $order->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la preferencia de pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Webhook de MercadoPago
     * Recibe notificaciones de pagos (aprobados, rechazados, pendientes, etc.)
     */
    public function webhook(Request $request)
    {
        try {
            $data = $request->all();
            
            Log::info('Webhook de MercadoPago recibido', ['data' => $data]);

            $result = $this->mercadoPagoService->processWebhook($data);

            if ($result && isset($result['external_reference'])) {
                $externalReference = $result['external_reference'];
                $isRemainderPayment = str_ends_with($externalReference, '_remainder');
                
                // Si es un pago de saldo pendiente, buscar la orden original
                if ($isRemainderPayment) {
                    $originalReference = str_replace('_remainder', '', $externalReference);
                    $order = Order::where('external_reference', $originalReference)
                        ->with(['items', 'user', 'address'])
                        ->first();
                } else {
                    // Buscar el pedido por external_reference normal
                    $order = Order::where('external_reference', $externalReference)
                        ->with(['items', 'user', 'address'])
                        ->first();
                }

                if ($order) {
                    $previousStatus = $order->status;
                    $groupStatusBefore = $order->order_group_id
                        ? Order::where('order_group_id', $order->order_group_id)->pluck('status', 'id')->all()
                        : [$order->id => $order->status];
                    $newStatus = $this->mapPaymentStatus($result['status']);

                    Log::info('Procesando webhook para orden', [
                        'order_id' => $order->id,
                        'payment_status' => $result['status'],
                        'previous_order_status' => $previousStatus,
                        'new_order_status' => $newStatus
                    ]);

                    $newPaymentData = $this->paymentDataArrayAfterWebhookMerge($order, $result['payment_data'] ?? []);

                    // Obtener payment_method_id del pago y mapearlo
                    $paymentMethodId = null;
                    if (is_object($result['payment_data'])) {
                        $paymentMethodId = $result['payment_data']->payment_method_id ?? null;
                    } elseif (is_array($newPaymentData)) {
                        $paymentMethodId = $newPaymentData['payment_method_id'] ?? null;
                    }
                    
                    $paymentMethod = $this->mapPaymentMethodId($paymentMethodId);
                    
                    // Preparar datos de actualización
                    $updateData = [
                        'status' => $newStatus,
                        'mercadopago_payment_id' => $result['payment_id'],
                        'payment_method' => $paymentMethod,
                        'payment_data' => json_encode($newPaymentData)
                    ];
                    
                    // Si la orden fue pagada parcialmente con crédito y ahora se aprueba el pago de MercadoPago
                    // (que completa el saldo pendiente), actualizar amount_paid y amount_pending
                    // Y descontar el crédito que se había reservado pero no descontado
                    if ($isRemainderPayment && $order->paid_with_credit && $order->amount_pending > 0 && $result['status'] === 'approved') {
                        $updateData['amount_paid'] = $order->total_amount; // Total pagado ahora es el total completo
                        $updateData['amount_pending'] = 0; // Ya no hay pendiente
                        
                        // Descontar el crédito ahora que el pago está completo
                        $user = $order->user;
                        if ($user && $order->credit_used > 0) {
                            // Verificar si el crédito ya fue descontado comparando el balance actual
                            $currentBalance = (float) ($user->credit_balance ?? 0);
                            $creditUsed = (float) ($order->credit_used ?? 0);
                            
                            // Si el balance actual es mayor o igual al crédito usado, significa que aún no se descontó
                            // Descontarlo ahora
                            if ($currentBalance >= $creditUsed) {
                                $user->credit_balance = max(0, $currentBalance - $creditUsed);
                                $user->save();
                                
                                Log::info('Crédito descontado después de completar pago de MercadoPago', [
                                    'order_id' => $order->id,
                                    'credit_used' => $creditUsed,
                                    'credit_balance_before' => $currentBalance,
                                    'credit_balance_after' => $user->credit_balance
                                ]);
                            }
                        }
                    }
                    
                    // Actualizar estado del pedido
                    $order->update($updateData);

                    if (! $isRemainderPayment && $order->order_group_id) {
                        $siblingOrders = Order::where('order_group_id', $order->order_group_id)
                            ->where('id', '!=', $order->id)
                            ->get();
                        foreach ($siblingOrders as $sibling) {
                            $pdSib = $this->paymentDataArrayAfterWebhookMerge(
                                $sibling,
                                $result['payment_data'] ?? []
                            );
                            $sibling->update([
                                'status' => $newStatus,
                                'mercadopago_payment_id' => $result['payment_id'],
                                'payment_method' => $paymentMethod,
                                'payment_data' => json_encode($pdSib),
                            ]);
                        }
                    }

                    // === PAGO APROBADO ===
                    // Procesa cada pedido del grupo (oferta + regular) o solo el principal
                    if ($result['status'] === 'approved' && $newStatus === 'pagado') {
                        $toApprove = ! $isRemainderPayment && $order->order_group_id
                            ? Order::where('order_group_id', $order->order_group_id)->get()
                            : collect([$order]);
                        foreach ($toApprove as $orderInGroup) {
                            $ps = $groupStatusBefore[$orderInGroup->id] ?? 'pending';
                            if ($ps !== 'pagado') {
                                $this->handleApprovedPayment($orderInGroup, $ps);
                            }
                        }
                    }
                    
                    // === PAGO RECHAZADO ===
                    elseif ($result['status'] === 'rejected') {
                        $this->handleRejectedPayment($order);
                    }
                    
                    // === PAGO CANCELADO ===
                    elseif ($result['status'] === 'cancelled') {
                        $this->handleCancelledPayment($order, $previousStatus);
                    }
                    
                    // === PAGO PENDIENTE (para OXXO principalmente) ===
                    elseif (in_array($result['status'], ['pending', 'in_process'])) {
                        $this->handlePendingPayment($order);
                    }
                }
            }

            return response()->json(['status' => 'ok'], 200);
            
        } catch (\Exception $e) {
            Log::error('Error en webhook de MercadoPago', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Siempre responder 200 para que MercadoPago no reintente
            return response()->json(['status' => 'error_logged'], 200);
        }
    }

    /**
     * En split oferta+regular, solo el pedido vinculado a Mercado Pago debe gatillar
     * correo, notificación a usuario y aviso a admin; el hermano solo API externa + registro.
     */
    private function isOfferSplitSiblingOrderForApproval(Order $order): bool
    {
        $pd = $order->payment_data;
        if (is_string($pd)) {
            $pd = json_decode($pd, true) ?? [];
        }
        if (! is_array($pd)) {
            $pd = [];
        }
        if (empty($pd['order_group_id'])) {
            return false;
        }

        return array_key_exists('order_group_is_mp_primary', $pd) && $pd['order_group_is_mp_primary'] === false;
    }

    /**
     * Manejar pago aprobado
     * El inventario se descuenta desde la API externa al sincronizar productos
     */
    private function handleApprovedPayment(Order $order, string $previousStatus)
    {
        // Verificar que realmente cambió de estado para evitar procesamiento duplicado
        // Recargar el estado actual desde la BD para evitar condiciones de carrera
        $order->refresh();
        
        // Si el estado ya es 'pagado' y no cambió, significa que ya se procesó
        if ($order->status === 'pagado' && $previousStatus === 'pagado') {
            Log::info('Pago ya fue procesado anteriormente, omitiendo procesamiento duplicado', [
                'order_id' => $order->id,
                'current_status' => $order->status,
                'previous_status' => $previousStatus
            ]);
            return;
        }
        
        $siblingInOfferSplit = $this->isOfferSplitSiblingOrderForApproval($order);

        // Verificar si ya se envió a la API externa revisando payment_data
        $paymentData = $order->payment_data ?? [];
        if (is_string($paymentData)) {
            $paymentData = json_decode($paymentData, true) ?? [];
        }
        
        // Verificar si ya se envió a la API externa
        $alreadySentToExternalApi = (bool) $order->external_api_sent;
        
        // Verificar si ya se envió el correo
        $emailAlreadySent = isset($paymentData['confirmation_email_sent']) && $paymentData['confirmation_email_sent'] === true;
        
        Log::info('Procesando pago aprobado', [
            'order_id' => $order->id,
            'previous_status' => $previousStatus,
            'current_status' => $order->status,
            'already_sent_to_external_api' => $alreadySentToExternalApi,
            'email_already_sent' => $emailAlreadySent
        ]);
        
        // 1. Enviar información a la API externa (ella se encarga del inventario)
        // Solo si aún no se ha enviado
        if (!$alreadySentToExternalApi) {
            try {
                $apiResult = $this->externalSalesService->sendSaleToExternalApi($order);
                $this->externalSalesService->logSendResultIfApplicable(
                    $order,
                    $apiResult,
                    'Venta enviada a API externa exitosamente'
                );
            } catch (\Exception $e) {
                Log::error('Error al enviar venta a API externa', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                // No retornar aquí, continuar con el email aunque falle el envío a API externa
            }
        } else {
            Log::info('Venta ya fue enviada a API externa anteriormente, omitiendo envío duplicado', [
                'order_id' => $order->id
            ]);
        }
        
        // 2. Enviar email de confirmación al cliente (un solo envío: pedido vinculado a MP, no el hermano de grupo)
        // 3. Notificación al usuario y 4. admin: mismo criterio
        if (! $siblingInOfferSplit) {
            if (! $emailAlreadySent) {
                $order->load(['user', 'address', 'items']);
                try {
                    Mail::to($order->user->email)->send(new OrderConfirmationMail($order));
                    $paymentData['confirmation_email_sent'] = true;
                    $paymentData['confirmation_email_sent_at'] = now()->toIso8601String();
                    $order->update(['payment_data' => json_encode($paymentData)]);
                    Log::info('Email de confirmación enviado al cliente (webhook - approved)', ['order_id' => $order->id]);
                } catch (\Exception $e) {
                    Log::error('Error al enviar email de confirmación (webhook - approved)', [
                        'order_id' => $order->id,
                        'user_email' => $order->user->email ?? 'N/A',
                        'error' => $e->getMessage()
                    ]);
                }
            } else {
                Log::info('Email de confirmación ya fue enviado anteriormente, omitiendo envío duplicado', [
                    'order_id' => $order->id
                ]);
            }

            try {
                Notification::create([
                    'user_id' => $order->user_id,
                    'type' => 'payment_approved',
                    'title' => '¡Pago aprobado!',
                    'message' => "Tu pago para el pedido #{$order->id} ha sido aprobado. Estamos preparando tu envío.",
                    'data' => json_encode([
                        'order_id' => $order->id,
                        'amount' => $order->total_amount
                    ]),
                    'read' => false
                ]);
            } catch (\Exception $e) {
                Log::error('Error al crear notificación de pago aprobado', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage()
                ]);
            }

            $this->notifyAdminPaymentReceived($order, $order->user);
        }

        $this->orderSharePdfService->ensureStoredForOrder($order);

        if ($order->user && ! $siblingInOfferSplit) {
            try {
                $subForCategory = (float) ($order->subtotal ?? $order->total_amount);
                if (! empty($paymentData['order_group_id']) && ($paymentData['order_group_is_mp_primary'] ?? null) === true) {
                    $sibO = Order::query()
                        ->where('order_group_id', $paymentData['order_group_id'])
                        ->where('id', '!=', $order->id)
                        ->first();
                    if ($sibO) {
                        $subForCategory += (float) ($sibO->subtotal ?? 0);
                    }
                }
                $this->sellerCategoryActivityService->recordSuccessfulPurchase($order->user, $subForCategory);
            } catch (\Throwable $e) {
                Log::error('No se pudo actualizar vigencia de categoría tras pago aprobado', [
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Manejar pago rechazado
     */
    private function handleRejectedPayment(Order $order)
    {
        Log::info('Procesando pago rechazado', ['order_id' => $order->id]);
        
        // Crear notificación para el usuario
        try {
            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'payment_rejected',
                'title' => 'Pago rechazado',
                'message' => "El pago para tu pedido #{$order->id} fue rechazado. Por favor intenta con otro método de pago.",
                'data' => json_encode(['order_id' => $order->id]),
                'read' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear notificación de pago rechazado', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Manejar pago cancelado
     */
    private function handleCancelledPayment(Order $order, string $previousStatus)
    {
        Log::info('Procesando pago cancelado', ['order_id' => $order->id]);
        
        // Crear notificación para el usuario
        try {
            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'payment_cancelled',
                'title' => 'Pedido cancelado',
                'message' => "Tu pedido #{$order->id} ha sido cancelado.",
                'data' => json_encode(['order_id' => $order->id]),
                'read' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear notificación de pago cancelado', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Manejar pago pendiente (OXXO, transferencia, etc.)
     */
    private function handlePendingPayment(Order $order)
    {
        Log::info('Pago pendiente registrado', ['order_id' => $order->id]);
        
        // Crear notificación para el usuario
        try {
            $paymentMethod = $order->payment_method;
            $message = $paymentMethod === 'oxxo' 
                ? "Tu ticket de pago para el pedido #{$order->id} está listo. Tienes 72 horas para realizar el pago en OXXO."
                : "Tu pago para el pedido #{$order->id} está pendiente de confirmación.";
            
            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'payment_pending',
                'title' => 'Pago pendiente',
                'message' => $message,
                'data' => json_encode(['order_id' => $order->id]),
                'read' => false
            ]);
        } catch (\Exception $e) {
            Log::error('Error al crear notificación de pago pendiente', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Mapear payment_method_id de MercadoPago a nombre legible
     */
    private function mapPaymentMethodId($paymentMethodId)
    {
        if (!$paymentMethodId) {
            return 'mercadopago';
        }

        // Métodos de pago en efectivo
        $cashMethods = [
            'oxxo' => 'OXXO',
            'seven_eleven' => '7-Eleven',
            'extra' => 'Extra',
            'farmacias_del_ahorro' => 'Farmacias del Ahorro',
            'farmacias_benavides' => 'Farmacias Benavides',
            'farmacias_guadalajara' => 'Farmacias Guadalajara',
            'farmacias_similares' => 'Farmacias Similares',
            'soriana' => 'Soriana',
            'cfe' => 'CFE',
            'banamex' => 'Banamex',
            'bancomer' => 'Bancomer',
            'santander' => 'Santander',
            'hsbc' => 'HSBC',
            'scotiabank' => 'Scotiabank',
        ];

        // Métodos de tarjeta
        $cardMethods = [
            'visa' => 'Tarjeta',
            'master' => 'Tarjeta',
            'amex' => 'Tarjeta',
            'diners' => 'Tarjeta',
            'elo' => 'Tarjeta',
            'cabal' => 'Tarjeta',
            'naranja' => 'Tarjeta',
            'nativa' => 'Tarjeta',
            'tarshop' => 'Tarjeta',
            'cencosud' => 'Tarjeta',
            'argencard' => 'Tarjeta',
        ];

        // Otros métodos
        $otherMethods = [
            'account_money' => 'Saldo en cuenta',
            'debit_card' => 'Tarjeta de débito',
            'credit_card' => 'Tarjeta de crédito',
            'bank_transfer' => 'Transferencia bancaria',
            'atm' => 'Cajero automático',
            'ticket' => 'Ticket',
        ];

        // Buscar en métodos de efectivo
        if (isset($cashMethods[$paymentMethodId])) {
            return $cashMethods[$paymentMethodId];
        }

        // Buscar en métodos de tarjeta
        if (isset($cardMethods[$paymentMethodId])) {
            return $cardMethods[$paymentMethodId];
        }

        // Buscar en otros métodos
        if (isset($otherMethods[$paymentMethodId])) {
            return $otherMethods[$paymentMethodId];
        }

        // Si no se encuentra, capitalizar la primera letra
        return ucfirst(str_replace('_', ' ', $paymentMethodId));
    }

    /**
     * Mapear estados de MercadoPago a estados internos (para webhook)
     */
    private function mapPaymentStatus($mercadoPagoStatus)
    {
        return match ($mercadoPagoStatus) {
            'approved' => 'pagado',
            'pending' => 'pendiente_pago',
            'in_process' => 'pendiente_pago',
            'rejected' => 'pago_rechazado',
            'cancelled' => 'cancelado',
            default => 'pendiente_pago'
        };
    }

    /**
     * Mapear estados de MercadoPago a estados de orden (para creación inicial)
     */
    private function mapPaymentStatusToOrderStatus($mercadoPagoStatus)
    {
        return match ($mercadoPagoStatus) {
            'approved' => 'pagado',
            'pending' => 'pendiente_pago',
            'in_process' => 'pendiente_pago',
            'rejected' => 'pago_rechazado',
            'cancelled' => 'cancelado',
            default => 'pendiente_pago'
        };
    }

    /**
     * Procesar pago integrado (sin redirección)
     */
    public function processIntegratedPayment(Request $request)
    {
        // Convertir product_id a entero si viene como string
        $requestData = $request->all();
        if (isset($requestData['items'])) {
            foreach ($requestData['items'] as $index => $item) {
                if (isset($item['product_id'])) {
                    $requestData['items'][$index]['product_id'] = (string) $item['product_id'];
                }
                if (isset($item['quantity'])) {
                    $requestData['items'][$index]['quantity'] = (int) $item['quantity'];
                }
                if (isset($item['price'])) {
                    $requestData['items'][$index]['price'] = (float) $item['price'];
                }
            }
        }
        if (isset($requestData['address_id'])) {
            $requestData['address_id'] = (int) $requestData['address_id'];
        }

        $deliveryType = $requestData['delivery_type'] ?? 'envio';

        $rules = [
            'token' => 'required|string',
            'payment_method_id' => 'required|string',
            'transaction_amount' => 'required|numeric|min:0.01',
            'installments' => 'integer|min:1',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.barcode' => 'nullable|string',
            'items.*.detalle_id' => 'nullable|integer|min:1',
            'delivery_type' => 'nullable|string|in:envio,retiro',
            'shipping_amount' => 'nullable|numeric|min:0'
        ];
        
        // address_id es requerido solo si es envío
        if ($deliveryType === 'envio') {
            $rules['address_id'] = 'required|exists:addresses,id';
        } else {
            $rules['address_id'] = 'nullable';
        }
        
        $validator = Validator::make($requestData, $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        /** @var User $user */
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $bronzeShippingError = $this->rejectBronzeShippingWithoutPieces($user, $deliveryType, $requestData['items'] ?? []);
        if ($bronzeShippingError !== null) {
            return $bronzeShippingError;
        }

        // Verificar si hay órdenes pendientes con productos similares
        $pendingOrderCheck = $this->checkPendingOrdersWithSimilarProducts($user, $requestData['items']);
        if ($pendingOrderCheck['has_pending']) {
            return response()->json([
                'success' => false,
                'message' => $pendingOrderCheck['message'],
                'pending_order' => $pendingOrderCheck['order'],
                'has_pending_order' => true
            ], 422);
        }

        try {
            // Verificar que la dirección pertenece al usuario solo si es envío
            $addressId = null;
            if ($deliveryType === 'envio') {
            $address = $user->addresses()->find($requestData['address_id']);
            if (!$address) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dirección no encontrada o no pertenece al usuario'
                ], 404);
                }
                $addressId = $requestData['address_id'];
            }

            // Generar referencia externa antes de crear el pago
            $externalReference = uniqid('payment_' . $user->id . '_');

            // Preparar datos para MercadoPago (SIN crear orden aún)
            $paymentData = [
                'token' => $requestData['token'],
                'payment_method_id' => $requestData['payment_method_id'],
                'transaction_amount' => $requestData['transaction_amount'],
                'installments' => $requestData['installments'] ?? 1,
                'description' => $this->mercadoPagoService->buildDirectPaymentDescription(
                    $user,
                    $requestData['items']
                ),
                'metadata' => $this->mercadoPagoService->buildDirectPaymentMetadata(
                    $user,
                    $requestData['items']
                ),
                'external_reference' => $externalReference,
                'payer' => [
                    'email' => $user->email,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name
                ]
            ];


            // Crear pago en MercadoPago
            $payment = $this->mercadoPagoService->createPayment($paymentData);

            // Mapear estado del pago a estado de la orden
            $orderStatus = $this->mapPaymentStatusToOrderStatus($payment->status);
            
            // Crear orden para todos los estados excepto 'rejected' y 'cancelled'
            if (!in_array($payment->status, ['rejected', 'cancelled'])) {
                DB::beginTransaction();

                // Preparar payment_data con delivery_type y shipping_amount incluidos
                $paymentDataToStore = is_array($payment) ? $payment : (array) $payment;
                $paymentDataToStore['delivery_type'] = $deliveryType;
                // Obtener shipping_amount del request
                $shippingAmount = isset($requestData['shipping_amount']) ? (float) $requestData['shipping_amount'] : 0;
                $paymentDataToStore['shipping_amount'] = $shippingAmount;

                // Obtener payment_method_id del pago y mapearlo
                $paymentMethodId = $payment->payment_method_id ?? $requestData['payment_method_id'] ?? null;
                $paymentMethod = $this->mapPaymentMethodId($paymentMethodId);

                // Obtener descuentos del request (20% y 10% adicional)
                $descuento1 = isset($requestData['descuento1']) ? (float) $requestData['descuento1'] : 0;
                $descuento2 = isset($requestData['descuento2']) ? (float) $requestData['descuento2'] : 0;
                
                // Obtener subtotal y discounted_total del request
                $subtotal = isset($requestData['subtotal']) ? (float) $requestData['subtotal'] : 0;
                $discountedTotal = isset($requestData['discounted_total']) ? (float) $requestData['discounted_total'] : 0;

                // Crear el pedido en la base de datos
                $order = Order::create([
                    'user_id' => $user->id,
                    'address_id' => $addressId,
                    'total_amount' => $requestData['transaction_amount'],
                    'subtotal' => $subtotal, // Monto total sin descuentos aplicados
                    'discounted_total' => $discountedTotal, // Monto total con descuentos aplicados (sin envío)
                    'shipping_amount' => $shippingAmount,
                    'descuento1' => $descuento1, // 20% cuando total elegible >= 7000
                    'descuento2' => $descuento2, // 10% adicional cuando total elegible >= 15000
                    'status' => $orderStatus, // Estado según el estado del pago
                    'payment_method' => $paymentMethod,
                    'external_reference' => $externalReference,
                    'mercadopago_payment_id' => $payment->id,
                    'payment_data' => json_encode($paymentDataToStore)
                ]);

                // Crear los items del pedido
                foreach ($requestData['items'] as $item) {
                    OrderItem::create($this->orderItemPayloadFromLine($order->id, $item));
                }

                // Crear o actualizar registro dayFortyFive si se aplicó descuento
                // Solo si el frontend indica que se aplicó el descuento (day_forty_five_applied)
                if (isset($requestData['day_forty_five_applied']) && $requestData['day_forty_five_applied'] === true) {
                    $this->createOrUpdateDayFortyFive($user->id);
                }

                DB::commit();

                // Recargar el pedido con relaciones
                $order->load(['user', 'address', 'items']);

                // NO enviar email aquí - el webhook se encargará de enviar el correo cuando el pago sea aprobado
                // Esto evita envíos duplicados de correo
                // Para pagos pending/in_process, el webhook también los manejará cuando cambien de estado

                // Solo enviar a API externa si el pago fue aprobado
                // NOTA: El webhook también intentará enviar, pero tiene verificación de duplicados
                if ($payment->status === 'approved') {
                    try {
                        // Verificar si ya se envió antes de enviar
                        $paymentData = $order->payment_data ?? [];
                        if (is_string($paymentData)) {
                            $paymentData = json_decode($paymentData, true) ?? [];
                        }
                        
                        $alreadySent = (bool) $order->external_api_sent;

                        if (!$alreadySent) {
                            $apiResult = $this->externalSalesService->sendSaleToExternalApi($order);
                            $this->externalSalesService->logSendResultIfApplicable(
                                $order,
                                $apiResult,
                                'Venta enviada a API externa desde processIntegratedPayment'
                            );
                        } else {
                            Log::info('Venta ya fue enviada a API externa anteriormente, omitiendo duplicado', ['order_id' => $order->id]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Error al enviar venta a API externa desde processIntegratedPayment', [
                            'order_id' => $order->id,
                            'error' => $e->getMessage()
                        ]);
                        // No lanzar excepción, el webhook lo intentará de nuevo
                    }
                }

                // Notificar al admin del pago realizado (solo si está aprobado o pendiente)
                if (in_array($payment->status, ['approved', 'pending', 'in_process'])) {
                    $this->notifyAdminPaymentReceived($order, $user);
                }

                // Mensaje según el estado del pago
                $message = match($payment->status) {
                    'approved' => '¡Pago procesado exitosamente! Tu pedido ha sido creado.',
                    'pending' => 'Tu pago está pendiente de confirmación. Te notificaremos cuando se confirme.',
                    'in_process' => 'Tu pago está siendo procesado. Te notificaremos cuando se complete.',
                    default => 'Tu pedido ha sido creado. El estado del pago se actualizará automáticamente.'
                };

                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'data' => [
                        'order_id' => $order->id,
                        'payment_id' => $payment->id,
                        'payment_status' => $payment->status,
                        'order_status' => $orderStatus,
                        'external_reference' => $externalReference,
                        'requires_polling' => in_array($payment->status, ['pending', 'in_process']), // Indica si necesita verificación periódica
                        'status_detail' => $payment->status_detail ?? null
                    ]
                ]);
            } else {
                // Pago rechazado o cancelado - no crear orden
                return response()->json([
                    'success' => false,
                    'message' => 'El pago no fue aprobado. ' . ($payment->status_detail ?? 'Intenta nuevamente.'),
                    'data' => [
                        'payment_id' => $payment->id,
                        'payment_status' => $payment->status,
                        'status_detail' => $payment->status_detail ?? null
                    ]
                ], 422);
            }
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear o actualizar registro dayFortyFive
     * Se crea/actualiza cuando el cliente hace una compra >= 7000 MXN
     * (solo productos con desc_promo = 0 y sin descuentos personalizados)
     */
    private function createOrUpdateDayFortyFive($userId)
    {
        $now = Carbon::now();
        $endDate = $now->copy()->addDays(44);

        $dayFortyFive = DayFortyFive::where('user_id', $userId)->first();

        if ($dayFortyFive) {
            // Actualizar fechas existentes
            $dayFortyFive->update([
                'startDate' => $now->format('Y-m-d'),
                'endDate' => $endDate->format('Y-m-d'),
            ]);
        } else {
            // Crear nuevo registro
            DayFortyFive::create([
                'user_id' => $userId,
                'startDate' => $now->format('Y-m-d'),
                'endDate' => $endDate->format('Y-m-d'),
            ]);
        }
    }

    /**
     * Notificar al admin sobre pago recibido
     */
    private function notifyAdminPaymentReceived(Order $order, User $customer)
    {
        try {
            // Crear notificación en la base de datos
            Notification::createPaymentNotification($order);

            // Aquí puedes implementar el envío de email, SMS, o notificación push

            // Ejemplo de estructura para futuro email:
            /*
            Mail::to('admin@cherrycentral.com')->send(new PaymentReceivedMail([
                'order' => $order,
                'customer' => $customer,
                'items' => $order->items,
                'address' => $order->address
            ]));
            */
        } catch (\Exception $e) {
            // Error silencioso
        }
    }

    /**
     * Notificar al cliente sobre cambio de estado
     */
    private function notifyCustomerStatusChange(Order $order, string $newStatus, string $message = null)
    {
        try {
            // Crear notificación en la base de datos
            Notification::createOrderStatusNotification($order, $order->status, $newStatus);

            // Aquí puedes implementar el envío de email, SMS, o notificación push

            // Ejemplo de estructura para futuro email:
            /*
            Mail::to($order->user->email)->send(new OrderStatusChangeMail([
                'order' => $order,
                'status' => $newStatus,
                'message' => $message,
                'customer' => $order->user
            ]));
            */
        } catch (\Exception $e) {
            // Error silencioso
        }
    }


    /**
     * Pedidos del mismo checkout (split oferta/lista, crédito + MP, etc.) para el mismo usuario.
     *
     * @return \Illuminate\Support\Collection<int, Order>
     */
    protected function resolveCheckoutGroupOrders(Order $order): \Illuminate\Support\Collection
    {
        $userId = (int) $order->user_id;

        if (! empty($order->order_group_id)) {
            $group = Order::query()
                ->where('user_id', $userId)
                ->where('order_group_id', $order->order_group_id)
                ->with(['items', 'address'])
                ->orderBy('id')
                ->get();
            if ($group->count() > 1) {
                return $group;
            }
        }

        $pd = $order->payment_data;
        if (is_string($pd)) {
            $pd = json_decode($pd, true) ?? [];
        }
        $pd = is_array($pd) ? $pd : [];

        $extraIds = [];
        if (! empty($pd['order_group_sibling_ids']) && is_array($pd['order_group_sibling_ids'])) {
            foreach ($pd['order_group_sibling_ids'] as $sid) {
                $i = (int) $sid;
                if ($i > 0) {
                    $extraIds[] = $i;
                }
            }
        }
        if (! empty($pd['order_group_sibling_id'])) {
            $i = (int) $pd['order_group_sibling_id'];
            if ($i > 0) {
                $extraIds[] = $i;
            }
        }
        if (! empty($pd['split_paired_order_id'])) {
            $i = (int) $pd['split_paired_order_id'];
            if ($i > 0) {
                $extraIds[] = $i;
            }
        }

        $extraIds = array_values(array_unique($extraIds));
        $allIds = array_values(array_unique(array_merge([(int) $order->id], $extraIds)));

        if (count($allIds) <= 1) {
            return collect([$order]);
        }

        $group = Order::query()
            ->where('user_id', $userId)
            ->whereIn('id', $allIds)
            ->with(['items', 'address'])
            ->orderBy('id')
            ->get();

        return $group->count() > 1 ? $group : collect([$order]);
    }

    /**
     * @param  array<string, mixed>  $paymentDataArray
     * @param  array<string, mixed>  $previousPaymentData
     * @return array<string, mixed>
     */
    protected function mergePreviousCheckoutGroupIntoPaymentData(array $paymentDataArray, array $previousPaymentData): array
    {
        foreach ([
            'order_group_id',
            'order_group_sibling_ids',
            'order_group',
            'order_group_is_mp_primary',
            'order_group_sibling_id',
            'split_group_id',
            'split_role',
            'split_paired_order_id',
        ] as $key) {
            if (array_key_exists($key, $previousPaymentData)) {
                $paymentDataArray[$key] = $previousPaymentData[$key];
            }
        }

        return $paymentDataArray;
    }

    /**
     * Obtener estado del pago
     */
    public function getPaymentStatus($orderId)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $order = Order::where('id', $orderId)
            ->where('user_id', $user->id)
            ->with(['items', 'address'])
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Pedido no encontrado'
            ], 404);
        }

        $group = $this->resolveCheckoutGroupOrders($order);
        $payload = [
            'success' => true,
            'order' => $order,
        ];
        if ($group->count() > 1) {
            $payload['group_orders'] = $group->values()->all();
        }

        return response()->json($payload);
    }

    /**
     * Cambiar estado de orden (solo admin)
     */
    public function updateOrderStatus(Request $request, $orderId)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:pagado,en_espera_envio,enviado',
            'message' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        /** @var User $user */
        $user = Auth::user();

        if (!$user || !$user->isAdminOrOperator()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para cambiar el estado de órdenes'
            ], 403);
        }

        $order = Order::with('user')->find($orderId);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Orden no encontrada'
            ], 404);
        }

        $newStatus = $request->status;
        $oldStatus = $order->status;

        // Validar transiciones de estado válidas
        if (!$this->isValidStatusTransition($oldStatus, $newStatus)) {
            return response()->json([
                'success' => false,
                'message' => "No se puede cambiar de '$oldStatus' a '$newStatus'"
            ], 422);
        }

        try {
            DB::beginTransaction();

            $order->update([
                'status' => $newStatus,
                'updated_at' => now()
            ]);


            // Notificar al cliente según el nuevo estado
            if ($newStatus === 'en_espera_envio') {
                $this->notifyCustomerStatusChange(
                    $order,
                    $newStatus,
                    'Tu pedido ha sido confirmado y está siendo preparado para envío.'
                );
            } elseif ($newStatus === 'enviado') {
                $this->notifyCustomerStatusChange(
                    $order,
                    $newStatus,
                    'Tu pedido ha sido enviado. Ahora puedes calificar y comentar sobre los productos.'
                );
            }

            DB::commit();

            // NOTA: El email de confirmación se envía cuando el pago es aprobado desde el webhook
            // No enviar email aquí porque este método es para cambios manuales de estado

            if ($newStatus === 'pagado' && $oldStatus !== 'pagado' && $order->user_id) {
                $buyer = $order->user ?? User::find($order->user_id);
                try {
                    if ($buyer) {
                        $this->sellerCategoryActivityService->recordSuccessfulPurchase($buyer, (float) ($order->subtotal ?? $order->total_amount));
                    }
                } catch (\Throwable $e) {
                    Log::error('No se pudo actualizar vigencia de categoría al marcar orden pagada', [
                        'order_id' => $order->id,
                        'user_id' => $order->user_id,
                        'error' => $e->getMessage(),
                    ]);
                }

                $this->orderSharePdfService->ensureStoredForOrder($order);
            }

            return response()->json([
                'success' => true,
                'message' => 'Estado de orden actualizado correctamente',
                'data' => [
                    'order_id' => $order->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el estado de la orden'
            ], 500);
        }
    }


    /**
     * Validar si la transición de estado es válida
     */
    private function isValidStatusTransition(string $oldStatus, string $newStatus): bool
    {
        $validTransitions = [
            'pagado' => ['en_espera_envio'],
            'en_espera_envio' => ['enviado'],
            'enviado' => [] // Estado final - cliente puede calificar
        ];

        return in_array($newStatus, $validTransitions[$oldStatus] ?? []);
    }

    /**
     * Get user orders
     */
    public function getUserOrders(Request $request)
    {
        try {
            /** @var User $user */
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Obtener órdenes del usuario con items y productos relacionados (igual que AdminOrderController)
            $orders = Order::where('user_id', $user->id)
                ->with(['items.product', 'address', 'user'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Mapear órdenes al formato esperado por el frontend (igual que AdminOrderController)
            $formattedOrders = $orders->map(function ($order) use ($user) {
                // Calcular costo de envío
                $paymentData = is_array($order->payment_data) ? $order->payment_data : (is_string($order->payment_data) ? json_decode($order->payment_data, true) : []);
                $deliveryType = $paymentData['delivery_type'] ?? 'envio';
                
                // Subtotal bruto de líneas (catálogo); el total cobrado está en total_amount (neto con descuentos).
                $subtotalProducts = $order->items->sum('subtotal');
                $storedOrderTotal = (float) $order->total_amount;

                // Obtener costo de envío desde el campo dedicado o desde payment_data (fallback para órdenes antiguas)
                $shippingCost = 0;
                if ($order->shipping_amount !== null) {
                    $shippingCost = (float) $order->shipping_amount;
                } elseif (isset($paymentData['shipping_amount'])) {
                    $shippingCost = (float) $paymentData['shipping_amount'];
                } else {
                    if ($storedOrderTotal > $subtotalProducts) {
                        $shippingCost = $storedOrderTotal - $subtotalProducts;
                    }
                }

                // Si es retiro en tienda, el costo de envío es 0
                if ($deliveryType === 'retiro') {
                    $shippingCost = 0;
                }

                $totalAmount = $storedOrderTotal;
                
                return [
                    'id' => $order->id,
                    'date' => $order->created_at->format('d \d\e F Y'),
                    'created_at' => $order->created_at->toISOString(),
                    'orderNumber' => $order->orderNumberPrefixForDisplay() . str_pad($order->id, 4, '0', STR_PAD_LEFT),
                    'order_number_prefix' => $order->orderNumberPrefixForDisplay(),
                    'status' => $this->mapOrderStatus($order->status),
                    'statusDisplay' => $order->statusDisplay ?? $this->mapOrderStatus($order->status),
                    'statusRaw' => $order->status,
                    'statusColor' => $this->getStatusColor($order->status),
                    'shipping_cost' => (float) $shippingCost,
                    'items' => $order->items->map(function ($item) use ($user, $order) {
                        // Usar exactamente la misma lógica que AdminOrderController
                        // Verificar si ya existe una reseña para este producto en esta orden
                        $hasReview = \App\Models\Review::where('user_id', $user->id)
                            ->where('order_id', $order->id)
                            ->where('product_id', $item->product_id)
                            ->exists();

                        // Obtener información del producto para calcular descuento
                        // El product_id en order_items es el ID de Shopify, necesitamos buscar en detalles por idShopify
                        $product = null;
                        $originalPrice = null;
                        $detalle = null;
                        
                        // Estrategia 1: Buscar el detalle por idShopify (más común)
                        // Intentar con diferentes formatos del ID
                        $shopifyId = (string) $item->product_id;
                        $detalle = \App\Models\Detalle::where('idShopify', $shopifyId)->first();
                        
                        // Si no se encuentra, intentar sin conversión de tipo
                        if (!$detalle) {
                            $detalle = \App\Models\Detalle::whereRaw('CAST(idShopify AS CHAR) = ?', [$shopifyId])->first();
                        }
                        
                        // Si aún no se encuentra, buscar cualquier detalle que contenga este ID
                        if (!$detalle) {
                            $detalle = \App\Models\Detalle::where('idShopify', 'LIKE', "%{$shopifyId}%")->first();
                        }
                        
                        if ($detalle && $detalle->producto_id) {
                            // Buscar el producto usando el producto_id del detalle
                            $product = \App\Models\Producto::find($detalle->producto_id);
                        }
                        
                        // Estrategia 2: Si no se encontró por idShopify, intentar buscar directamente
                        // El ID del producto puede tener un cero al inicio (ej: 07422442106)
                        if (!$product) {
                            // Intentar con el ID tal cual
                            $product = \App\Models\Producto::find((string) $item->product_id);
                            
                            // Si no se encuentra, intentar con un cero al inicio
                            if (!$product) {
                                $productIdWithZero = '0' . (string) $item->product_id;
                                $product = \App\Models\Producto::find($productIdWithZero);
                            }
                            
                            // Si aún no se encuentra, intentar con padding a 6 dígitos (para IDs cortos)
                            if (!$product) {
                                $productIdNormalized = str_pad((string) $item->product_id, 6, '0', STR_PAD_LEFT);
                                $product = \App\Models\Producto::find($productIdNormalized);
                            }
                            
                            // Si aún no se encuentra, buscar con LIKE (para IDs que contengan el product_id)
                            if (!$product) {
                                $product = \App\Models\Producto::where('id', 'LIKE', '%' . $item->product_id . '%')->first();
                            }
                        }
                        
                        // Obtener precio original del producto
                        $originalPrice = $product ? (float) ($product->precio1 ?? 0) : null;
                        
                        // Calcular descuento: comparar precio original con precio pagado
                        // Siempre mostrar precio original si existe, incluso si no hay descuento
                        $hasDiscount = false;
                        $discountPercentage = 0;
                        
                        if ($originalPrice && $originalPrice > 0) {
                            // Hay descuento si el precio pagado es menor al precio original
                            if ($originalPrice > $item->price) {
                                $hasDiscount = true;
                                $discountPercentage = round((($originalPrice - $item->price) / $originalPrice) * 100);
                            }
                        }
                        
                        // Log para debugging
                        \Log::info('Calculando descuento para item', [
                            'product_id' => $item->product_id,
                            'shopify_id_string' => $shopifyId,
                            'item_price' => $item->price,
                            'original_price' => $originalPrice,
                            'has_discount' => $hasDiscount,
                            'discount_percentage' => $discountPercentage,
                            'product_found' => $product ? true : false,
                            'product_id_found' => $product ? $product->id : null,
                            'detalle_found' => $detalle ? true : false,
                            'detalle_id' => $detalle ? $detalle->id : null,
                            'detalle_producto_id' => $detalle ? $detalle->producto_id : null,
                            'detalle_idshopify' => $detalle ? $detalle->idShopify : null
                        ]);

                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'detalle_id' => $item->detalle_id,
                            'title' => $item->name ?? 'Producto',
                            'quantity' => (int) $item->quantity,
                            'price' => (float) $item->price,
                            'original_price' => $originalPrice, // Siempre incluir precio original si existe
                            'has_discount' => $hasDiscount,
                            'discount_percentage' => $hasDiscount ? $discountPercentage : 0,
                            'subtotal' => (float) $item->subtotal,
                            'image' => $this->getProductImageUrlSimple($item->product_id),
                            'size' => $item->size,
                            'color' => $item->color,
                            'barcode' => $item->barcode,
                            'hasReview' => $hasReview
                        ];
                    }),
                    'totalAmount' => (float) $totalAmount,
                    'subtotal' => (float) ($order->subtotal !== null ? $order->subtotal : $subtotalProducts),
                    'discounted_total' => (float) ($order->discounted_total !== null ? $order->discounted_total : $subtotalProducts),
                    'descuento1' => (float) ($order->descuento1 ?? 0),
                    'descuento2' => (float) ($order->descuento2 ?? 0),
                    'credit_used' => (float) ($order->credit_used ?? 0),
                    'amount_paid' => (float) ($order->amount_paid ?? $order->total_amount),
                    'amount_pending' => (float) ($order->amount_pending ?? 0),
                    'paid_with_credit' => (bool) ($order->paid_with_credit ?? false),
                    'payment_method' => $order->payment_method,
                    'is_advance_order' => (bool) ($order->is_advance_order ?? false),
                    'external_api_sent' => (bool) ($order->external_api_sent ?? false),
                    'external_api_sent_at' => $order->external_api_sent_at?->toIso8601String(),
                    'should_send_to_external_api' => $order->shouldSendToExternalApi(),
                    'address' => $order->address ? [
                        'street_address' => $order->address->street_address,
                        'street_number_ext' => $order->address->street_number_ext,
                        'street_number_int' => $order->address->street_number_int,
                        'colonia' => $order->address->colonia,
                        'city' => $order->address->city,
                        'municipality' => $order->address->municipality,
                        'state' => $order->address->state,
                        'postal_code' => $order->address->postal_code,
                        'country' => $order->address->country,
                        'additional_info' => $order->address->additional_info,
                        'full_address' => $order->address->full_address,
                        'name' => $order->address->name ?? null,
                    ] : null
                ];
            });

            return response()->json([
                'success' => true,
                'orders' => $formattedOrders
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las órdenes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Map order status to display text
     */
    private function mapOrderStatus($status)
    {
        $statusMap = [
            'pending' => 'Pendiente',
            'pendiente_pago' => 'Por Pagar',
            'pending_payment' => 'Por Pagar',
            'processing' => 'Procesando',
            'shipped' => 'En vía',
            'delivered' => 'Entregado',
            'cancelled' => 'Cancelado',
            'cancelado' => 'Cancelado',
            'pagado' => 'Pagado',
            'en_espera_envio' => 'En espera de envío',
            'enviado' => 'Enviado',
            'entregado' => 'Entregado',
            'pago_rechazado' => 'Pago Rechazado'
        ];

        return $statusMap[$status] ?? ucfirst($status);
    }

    /**
     * Get status color for display
     */
    private function getStatusColor($status)
    {
        $colorMap = [
            'pending' => 'yellow',
            'pendiente_pago' => 'credit-pending',
            'pending_payment' => 'credit-pending',
            'processing' => 'blue',
            'shipped' => 'orange',
            'delivered' => 'green',
            'cancelled' => 'red',
            'cancelado' => 'red',
            'pagado' => 'blue',
            'en_espera_envio' => 'blue',
            'enviado' => 'orange',
            'entregado' => 'green',
            'pago_rechazado' => 'red'
        ];

        return $colorMap[$status] ?? 'gray';
    }

    /**
     * Get orders pending review for the authenticated user
     */
    public function getPendingReviews(Request $request)
    {
        try {
            /** @var User $user */
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Obtener órdenes enviadas que no han sido calificadas con productos relacionados
            $orders = Order::where('user_id', $user->id)
                ->where('status', 'enviado')
                ->with(['items.product', 'user'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Filtrar órdenes que tienen productos sin calificar
            $pendingOrders = $orders->filter(function ($order) {
                foreach ($order->items as $item) {
                    // Verificar si existe una reseña para este producto en esta orden
                    $hasReview = \App\Models\Review::where('user_id', $order->user_id)
                        ->where('order_id', $order->id)
                        ->where('product_id', $item->product_id)
                        ->exists();

                    if (!$hasReview) {
                        return true; // Esta orden tiene productos sin calificar
                    }
                }
                return false;
            });

            $formattedOrders = $pendingOrders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'orderNumber' => $order->orderNumberPrefixForDisplay() . str_pad($order->id, 4, '0', STR_PAD_LEFT),
                    'order_number_prefix' => $order->orderNumberPrefixForDisplay(),
                    'date' => $order->created_at->format('d/m/Y'),
                    'totalAmount' => (float) $order->total_amount,
                    'items' => $order->items->map(function ($item) {
                        // Usar exactamente la misma lógica que AdminOrderController
                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'name' => $item->name ?? 'Producto',
                            'quantity' => $item->quantity,
                            'price' => (float) $item->price,
                            'image' => $this->getProductImageUrlSimple($item->product_id)
                        ];
                    })
                ];
            });

            return response()->json([
                'success' => true,
                'orders' => $formattedOrders->values()->toArray()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener órdenes pendientes de calificación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get product image URL - igual que AdminOrderController
     * Construye URL directamente desde productId sin verificaciones
     * 
     * @param string|int|null $productId The product ID
     * @return string The image URL
     */
    private function getProductImageUrlSimple($productId)
    {
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }
        
        // Convertir a string para manejar correctamente
        $productIdStr = (string) $productId;
        
        // Construir URL directamente como en AdminOrderController y el frontend
        // El frontend usa: https://cherry-fotos.s3.amazonaws.com/shopify/${externalProductId}/${externalProductId}_1.jpg
        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
    }

    /**
     * Get product image URL based on product ID
     * Tries both formatted and original ID formats to find the correct image
     * @deprecated Use getProductImageUrlFromProduct instead
     */
    private function getProductImageUrl($productId)
    {
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }

        // Primero probar con el ID original (sin ceros)
        $originalUrl = "https://cherry-fotos.s3.amazonaws.com/shopify/{$productId}/{$productId}_1.jpg";

        // Verificar rápidamente si la imagen original existe
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $originalUrl);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // Si la imagen original existe, usarla
        if ($httpCode === 200) {
            return $originalUrl;
        }

        // Si no existe, probar con formato con ceros a la izquierda
        $formattedId = str_pad($productId, 11, '0', STR_PAD_LEFT);
        $formattedUrl = "https://cherry-fotos.s3.amazonaws.com/shopify/{$formattedId}/{$formattedId}_1.jpg";

        // Verificar si la imagen formateada existe
        $ch2 = curl_init();
        curl_setopt($ch2, CURLOPT_URL, $formattedUrl);
        curl_setopt($ch2, CURLOPT_NOBODY, true);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);

        curl_exec($ch2);
        $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);

        // Si la imagen formateada existe, usarla
        if ($httpCode2 === 200) {
            return $formattedUrl;
        }

        // Si ninguna existe, devolver la original (será manejada por el fallback del frontend)
        return $originalUrl;
    }

    /**
     * Get MercadoPago public configuration
     */
    public function getMercadoPagoConfig()
    {
        return response()->json([
            'success' => true,
            'public_key' => config('services.mercadopago.public_key'),
            'currency_id' => config('services.mercadopago.currency_id', 'ARS')
        ]);
    }

    /**
     * Verificar si la URL del webhook es accesible públicamente
     */
    public function checkWebhookUrl()
    {
        try {
            $webhookUrl = $this->mercadoPagoService->getWebhookUrl();
            $appUrl = config('app.url');
            $ngrokUrl = env('NGROK_URL');
            
            $isLocalhost = str_contains($appUrl, 'localhost') || str_contains($appUrl, '127.0.0.1');
            $hasNgrok = !empty($ngrokUrl);
            
            // Intentar hacer una petición HEAD a la URL del webhook para verificar si es accesible
            $isAccessible = false;
            $error = null;
            
            if ($webhookUrl) {
                try {
                    $ch = curl_init($webhookUrl);
                    curl_setopt($ch, CURLOPT_NOBODY, true);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    
                    curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $curlError = curl_error($ch);
                    curl_close($ch);
                    
                    // Cualquier código HTTP significa que la URL es accesible
                    $isAccessible = $httpCode > 0 && empty($curlError);
                    if (!$isAccessible && $curlError) {
                        $error = $curlError;
                    }
                } catch (\Exception $e) {
                    $error = $e->getMessage();
                }
            }
            
            return response()->json([
                'success' => true,
                'webhook_url' => $webhookUrl,
                'is_accessible' => $isAccessible,
                'error' => $error,
                'environment' => [
                    'is_localhost' => $isLocalhost,
                    'has_ngrok' => $hasNgrok,
                    'app_url' => $appUrl,
                    'ngrok_url' => $ngrokUrl,
                    'environment_type' => $isLocalhost ? ($hasNgrok ? 'development_with_ngrok' : 'development_local') : 'production'
                ],
                'recommendations' => $this->getWebhookRecommendations($isLocalhost, $hasNgrok, $isAccessible)
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error verificando URL del webhook: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener recomendaciones según el entorno
     */
    private function getWebhookRecommendations($isLocalhost, $hasNgrok, $isAccessible)
    {
        $recommendations = [];
        
        if ($isLocalhost && !$hasNgrok) {
            $recommendations[] = 'Estás en desarrollo local sin ngrok. El webhook NO funcionará automáticamente.';
            $recommendations[] = 'Los pagos se procesarán cuando el usuario regrese de Mercado Pago.';
            $recommendations[] = 'Para desarrollo: instala ngrok y configura NGROK_URL en tu .env';
        } elseif ($isLocalhost && $hasNgrok) {
            if ($isAccessible) {
                $recommendations[] = '✅ Ngrok está funcionando correctamente. El webhook funcionará.';
            } else {
                $recommendations[] = '⚠️ Ngrok configurado pero la URL no es accesible. Verifica que ngrok esté corriendo.';
                $recommendations[] = 'Ejecuta: ngrok http 8000 (o el puerto de tu aplicación)';
            }
        } else {
            if ($isAccessible) {
                $recommendations[] = '✅ URL de producción accesible. El webhook funcionará correctamente.';
            } else {
                $recommendations[] = '⚠️ URL de producción no accesible. Verifica que tu servidor sea público.';
                $recommendations[] = 'Asegúrate de que el firewall permita conexiones entrantes.';
            }
        }
        
        return $recommendations;
    }

    /**
     * Endpoint de prueba para verificar conexión con MercadoPago
     */
    public function testMercadoPagoConnection()
    {
        try {
            Log::info('Probando conexión con MercadoPago');
            
            // Intentar crear una preferencia de prueba muy simple
            $testPreferenceData = [
                'items' => [
                    [
                        'id' => 'test-1',
                        'title' => 'Test Item',
                        'quantity' => 1,
                        'unit_price' => 10.00,
                        'currency_id' => 'MXN'
                    ]
                ],
                'payer' => [
                    'email' => 'test@test.com'
                ],
                'back_urls' => [
                    'success' => config('app.url') . '/compra-exitosa',
                    'failure' => config('app.url') . '/carrito-detalle',
                    'pending' => config('app.url') . '/carrito-detalle'
                ],
                'auto_return' => 'approved',
                'external_reference' => 'test_' . time()
            ];

            $startTime = microtime(true);
            $preference = $this->mercadoPagoService->createPreference($testPreferenceData);
            $elapsedTime = microtime(true) - $startTime;

            return response()->json([
                'success' => true,
                'message' => 'Conexión con MercadoPago exitosa',
                'preference_id' => $preference->id ?? 'N/A',
                'elapsed_time' => round($elapsedTime, 2) . 's',
                'config' => [
                    'environment' => config('services.mercadopago.environment', 'sandbox'),
                    'has_access_token' => !empty(config('services.mercadopago.access_token')),
                    'has_public_key' => !empty(config('services.mercadopago.public_key'))
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error en prueba de conexión MercadoPago', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con MercadoPago: ' . $e->getMessage(),
                'config' => [
                    'environment' => config('services.mercadopago.environment', 'sandbox'),
                    'has_access_token' => !empty(config('services.mercadopago.access_token')),
                    'has_public_key' => !empty(config('services.mercadopago.public_key'))
                ]
            ], 500);
        }
    }

    /**
     * Verificar y procesar pago cuando el usuario regresa de MercadoPago
     * Esta función se llama desde el frontend cuando el usuario es redirigido de vuelta
     */
    public function verifyAndProcessPayment(Request $request)
    {
        try {
            // Parámetros que envía MercadoPago en la URL de retorno
            $paymentId = $request->input('payment_id') ?? $request->input('collection_id');
            $status = $request->input('status') ?? $request->input('collection_status');
            $externalReference = $request->input('external_reference');
            $preferenceId = $request->input('preference_id');
            
            Log::info('Verificando pago de MercadoPago', [
                'payment_id' => $paymentId,
                'status' => $status,
                'external_reference' => $externalReference,
                'preference_id' => $preferenceId
            ]);

            // Si no hay payment_id, buscar por preference_id o external_reference
            $order = null;
            
            if ($externalReference) {
                $order = Order::where('external_reference', $externalReference)
                    ->with(['items', 'user', 'address'])
                    ->first();
            }
            
            if (!$order && $preferenceId) {
                $order = Order::where('mercadopago_preference_id', $preferenceId)
                    ->with(['items', 'user', 'address'])
                    ->first();
            }

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada',
                    'payment_status' => 'unknown'
                ], 404);
            }

            // Si tenemos payment_id, obtener el estado real desde MercadoPago
            $realStatus = $status;
            $paymentData = null;
            
            if ($paymentId) {
                try {
                    $payment = $this->mercadoPagoService->getPayment($paymentId);
                    $realStatus = $payment->status;
                    $paymentData = $payment;
                    
                    Log::info('Estado real del pago obtenido de MercadoPago', [
                        'payment_id' => $paymentId,
                        'status' => $realStatus
                    ]);
                } catch (\Exception $e) {
                    Log::warning('No se pudo obtener el pago de MercadoPago', [
                        'payment_id' => $paymentId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Mapear estado y actualizar orden
            $previousStatus = $order->status;
            $newStatus = $this->mapPaymentStatus($realStatus);
            
            // Actualizar la orden
            $updateData = [
                'status' => $newStatus
            ];
            
            if ($paymentId) {
                $updateData['mercadopago_payment_id'] = $paymentId;
            }
            
            if ($paymentData) {
                // Preservar delivery_type si existe en payment_data anterior
                $previousPaymentData = $order->payment_data ?? [];
                if (is_string($previousPaymentData)) {
                    $previousPaymentData = json_decode($previousPaymentData, true) ?? [];
                }
                $paymentDataArray = is_array($paymentData) ? $paymentData : (array) $paymentData;
                if (isset($previousPaymentData['delivery_type'])) {
                    $paymentDataArray['delivery_type'] = $previousPaymentData['delivery_type'];
                }
                // Preservar shipping_amount desde el campo dedicado o desde payment_data anterior
                if ($order->shipping_amount !== null) {
                    $paymentDataArray['shipping_amount'] = (float) $order->shipping_amount;
                } elseif (isset($previousPaymentData['shipping_amount'])) {
                    $paymentDataArray['shipping_amount'] = $previousPaymentData['shipping_amount'];
                }
                $paymentDataArray = $this->mergePreviousCheckoutGroupIntoPaymentData($paymentDataArray, $previousPaymentData);
                $updateData['payment_data'] = json_encode($paymentDataArray);
            }
            
            $order->update($updateData);

            // Procesar según el estado
            $processed = false;
            $message = '';
            
            if ($realStatus === 'approved' && $previousStatus !== 'pagado') {
                // Pago aprobado - procesar
                $this->handleApprovedPayment($order, $previousStatus);
                $processed = true;
                $message = '¡Pago aprobado! Tu pedido está siendo procesado.';
            } elseif ($realStatus === 'approved' && $previousStatus === 'pagado') {
                // Ya estaba procesado
                $processed = true;
                $message = 'Tu pedido ya fue procesado anteriormente.';
            } elseif (in_array($realStatus, ['pending', 'in_process'])) {
                $message = 'Tu pago está pendiente de confirmación.';
                if ($order->payment_method === 'oxxo') {
                    $message = 'Tu ticket de pago está listo. Tienes 72 horas para pagar en OXXO.';
                }
            } elseif ($realStatus === 'rejected') {
                $this->handleRejectedPayment($order);
                $message = 'El pago fue rechazado. Por favor intenta con otro método de pago.';
            } else {
                $message = 'Estado del pago: ' . $realStatus;
            }

            $order->refresh();
            $order->load(['items', 'address']);
            $groupOrders = $this->resolveCheckoutGroupOrders($order);

            $payload = [
                'success' => true,
                'payment_status' => $realStatus,
                'order_status' => $newStatus,
                'order_id' => $order->id,
                'processed' => $processed,
                'message' => $message,
                'order' => $order,
            ];
            if ($groupOrders->count() > 1) {
                $payload['group_orders'] = $groupOrders->values()->all();
            }

            return response()->json($payload);

        } catch (\Exception $e) {
            Log::error('Error verificando pago de MercadoPago', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar el pago: ' . $e->getMessage(),
                'payment_status' => 'error'
            ], 500);
        }
    }

    /**
     * Crear pago en efectivo (OXXO)
     */
    public function createOxxoPayment(Request $request)
    {
        $deliveryType = $request->input('delivery_type', 'envio');
        
        $rules = [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.size' => 'nullable|string',
            'items.*.color' => 'nullable|string',
            'items.*.barcode' => 'nullable|string',
            'delivery_type' => 'nullable|string|in:envio,retiro',
            'shipping_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|in:oxxo,paycash'
        ];
        
        // address_id es requerido solo si es envío
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
                'errors' => $validator->errors()
            ], 422);
        }

        /** @var User $user */
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $bronzeShippingError = $this->rejectBronzeShippingWithoutPieces($user, $deliveryType, $request->input('items', []));
        if ($bronzeShippingError !== null) {
            return $bronzeShippingError;
        }

        try {
            // Verificar que la dirección pertenece al usuario solo si es envío
            $addressId = null;
            if ($deliveryType === 'envio') {
                $address = $user->addresses()->find($request->address_id);
                if (!$address) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Dirección no encontrada o no pertenece al usuario'
                    ], 404);
                }
                $addressId = $request->address_id;
            }

            DB::beginTransaction();

            // Generar referencia externa
            $externalReference = uniqid('oxxo_' . $user->id . '_');

            // Obtener descuentos del request (20% y 10% adicional)
            $descuento1 = $request->input('descuento1', 0);
            $descuento2 = $request->input('descuento2', 0);
            
            // Obtener subtotal y discounted_total del request
            $subtotal = $request->input('subtotal', 0);
            $discountedTotal = $request->input('discounted_total', 0);

            // Crear el pedido en la base de datos con estado pendiente de pago
            $order = Order::create([
                'user_id' => $user->id,
                'address_id' => $addressId,
                'total_amount' => $request->total_amount,
                'subtotal' => (float) $subtotal, // Monto total sin descuentos aplicados
                'discounted_total' => (float) $discountedTotal, // Monto total con descuentos aplicados (sin envío)
                'shipping_amount' => (float) $request->input('shipping_amount', 0),
                'descuento1' => (float) $descuento1, // 20% cuando total elegible >= 7000
                'descuento2' => (float) $descuento2, // 10% adicional cuando total elegible >= 15000
                'status' => 'pendiente_pago',
                'payment_method' => 'oxxo',
                'external_reference' => $externalReference
            ]);

            // Crear los items del pedido
            foreach ($request->items as $item) {
                OrderItem::create($this->orderItemPayloadFromLine($order->id, $item));
            }

            // Preparar datos para MercadoPago - pago en efectivo
            $paymentData = [
                'transaction_amount' => (float) $request->total_amount,
                'description' => 'Pedido Cherry Central #' . $order->id,
                'payment_method_id' => $request->payment_method ?? 'oxxo',
                'payer' => [
                    'email' => $user->email,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name
                ],
                'external_reference' => $externalReference
            ];

            // Crear pago en efectivo con MercadoPago
            $payment = $this->mercadoPagoService->createCashPayment($paymentData);

            // Preparar payment_data con delivery_type y shipping_amount incluidos
            $paymentDataToStore = is_array($payment) ? $payment : (array) $payment;
            $paymentDataToStore['delivery_type'] = $deliveryType;
            // Obtener shipping_amount del request (ya está guardado en la orden, pero lo preservamos en payment_data)
            $shippingAmount = (float) $request->input('shipping_amount', 0);
            $paymentDataToStore['shipping_amount'] = $shippingAmount;

            // Obtener payment_method_id del pago y mapearlo
            $paymentMethodId = null;
            if (is_object($payment)) {
                $paymentMethodId = $payment->payment_method_id ?? null;
            } elseif (is_array($paymentDataToStore)) {
                $paymentMethodId = $paymentDataToStore['payment_method_id'] ?? null;
            }
            $paymentMethod = $this->mapPaymentMethodId($paymentMethodId);

            // Actualizar el pedido con los datos del pago
            $order->update([
                'mercadopago_payment_id' => is_object($payment) ? $payment->id : ($payment['id'] ?? null),
                'payment_method' => $paymentMethod,
                'payment_data' => json_encode($paymentDataToStore)
            ]);

            DB::commit();

            // Recargar el pedido con relaciones para el email
            $order->load(['user', 'address', 'items']);

            // Enviar email de confirmación al cliente (también en pendiente_pago para pruebas)
            try {
                Mail::to($user->email)->send(new OrderConfirmationMail($order));
                Log::info('Email de confirmación enviado al cliente (createOxxoPayment - pendiente_pago)', ['order_id' => $order->id]);
            } catch (\Exception $e) {
                Log::error('Error al enviar email de confirmación (createOxxoPayment)', [
                    'order_id' => $order->id,
                    'user_email' => $user->email,
                    'error' => $e->getMessage()
                ]);
            }

            // Obtener datos del ticket para mostrar al usuario
            $ticketData = [
                'payment_id' => $payment->id,
                'reference' => $payment->transaction_details->external_resource_url ?? null,
                'external_reference' => $externalReference,
                'barcode' => $payment->barcode->content ?? null,
                'expiration_date' => $payment->date_of_expiration ?? now()->addHours(72)->format('d/m/Y H:i'),
                'ticket_url' => $payment->transaction_details->external_resource_url ?? null
            ];

            // Notificar al admin
            $this->notifyAdminPaymentReceived($order, $user);

            return response()->json([
                'success' => true,
                'message' => 'Ticket de pago OXXO generado correctamente',
                'data' => [
                    'order_id' => $order->id,
                    'payment_id' => $payment->id,
                    'payment_status' => $payment->status,
                    'reference' => $ticketData['reference'] ?? $externalReference,
                    'external_reference' => $externalReference,
                    'barcode' => $ticketData['barcode'],
                    'expiration_date' => $ticketData['expiration_date'],
                    'ticket_url' => $ticketData['ticket_url'],
                    'total_amount' => $request->total_amount
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error creating OXXO payment', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al generar el ticket de pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener métodos de pago en efectivo disponibles
     */
    public function getCashPaymentMethods()
    {
        return response()->json([
            'success' => true,
            'methods' => $this->mercadoPagoService->getCashPaymentMethods()
        ]);
    }

    /**
     * Sincronizar estado de pago manualmente (para pagos pendientes)
     * Útil cuando el webhook no llegó o para verificar pagos antiguos
     */
    public function syncPaymentStatus($orderId)
    {
        try {
            /** @var User $user */
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            // Buscar la orden
            $order = Order::where('id', $orderId)
                ->where('user_id', $user->id)
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada o no pertenece al usuario'
                ], 404);
            }

            // Si no tiene payment_id de Mercado Pago, no se puede verificar
            if (!$order->mercadopago_payment_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden no tiene un ID de pago de Mercado Pago para verificar'
                ], 400);
            }

            $previousStatus = $order->status;

            // Obtener el estado actual del pago desde Mercado Pago
            $payment = $this->mercadoPagoService->getPayment($order->mercadopago_payment_id);
            $realStatus = $payment->status;
            $newStatus = $this->mapPaymentStatus($realStatus);

            Log::info('Sincronizando estado de pago', [
                'order_id' => $order->id,
                'payment_id' => $order->mercadopago_payment_id,
                'previous_status' => $previousStatus,
                'new_status' => $newStatus,
                'payment_status' => $realStatus
            ]);

            // Preservar delivery_type y shipping_amount si existen en payment_data anterior
            $previousPaymentData = $order->payment_data ?? [];
            if (is_string($previousPaymentData)) {
                $previousPaymentData = json_decode($previousPaymentData, true) ?? [];
            }
            $paymentArray = is_array($payment) ? $payment : (array) $payment;
            if (isset($previousPaymentData['delivery_type'])) {
                $paymentArray['delivery_type'] = $previousPaymentData['delivery_type'];
            }
            // Preservar shipping_amount desde el campo dedicado o desde payment_data anterior
            if ($order->shipping_amount !== null) {
                $paymentArray['shipping_amount'] = (float) $order->shipping_amount;
            } elseif (isset($previousPaymentData['shipping_amount'])) {
                $paymentArray['shipping_amount'] = $previousPaymentData['shipping_amount'];
            }
            
            // Obtener payment_method_id del pago y mapearlo
            $paymentMethodId = null;
            if (is_object($payment)) {
                $paymentMethodId = $payment->payment_method_id ?? null;
            } elseif (is_array($paymentArray)) {
                $paymentMethodId = $paymentArray['payment_method_id'] ?? null;
            }
            $paymentMethod = $this->mapPaymentMethodId($paymentMethodId);
            
            // Actualizar la orden
            $order->update([
                'status' => $newStatus,
                'payment_method' => $paymentMethod,
                'payment_data' => json_encode($paymentArray)
            ]);

            // Procesar según el estado
            $processed = false;
            $message = '';

            if ($realStatus === 'approved' && $previousStatus !== 'pagado') {
                // Pago aprobado - procesar
                $this->handleApprovedPayment($order, $previousStatus);
                $processed = true;
                $message = '¡Pago aprobado! Tu pedido está siendo procesado.';
            } elseif ($realStatus === 'approved' && $previousStatus === 'pagado') {
                $processed = true;
                $message = 'Tu pedido ya fue procesado anteriormente.';
            } elseif (in_array($realStatus, ['pending', 'in_process'])) {
                $message = 'Tu pago sigue pendiente de confirmación.';
                if ($order->payment_method === 'oxxo') {
                    $message = 'Tu ticket de pago sigue pendiente. Tienes 72 horas para pagar en OXXO.';
                }
            } elseif ($realStatus === 'rejected') {
                $this->handleRejectedPayment($order);
                $message = 'El pago fue rechazado. Por favor intenta con otro método de pago.';
            } elseif ($realStatus === 'cancelled') {
                $this->handleCancelledPayment($order, $previousStatus);
                $message = 'El pago fue cancelado.';
            } else {
                $message = 'Estado del pago: ' . $realStatus;
            }

            return response()->json([
                'success' => true,
                'payment_status' => $realStatus,
                'order_status' => $newStatus,
                'previous_status' => $previousStatus,
                'processed' => $processed,
                'message' => $message,
                'order' => [
                    'id' => $order->id,
                    'total_amount' => $order->total_amount,
                    'status' => $newStatus,
                    'payment_method' => $order->payment_method
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error sincronizando estado de pago', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al sincronizar el estado del pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process payment with credit (only for oro category users).
     * Si el total supera el cupo disponible, divide en dos pedidos: uno pagado con crédito y otro pendiente en Mercado Pago.
     */
    private function processCreditPayment(Request $request, User $user, $addressId, $deliveryType)
    {
        // Verificar que el usuario tenga categoría oro o diamante
        if (!in_array($user->seller_category, ['oro', 'diamante'])) {
            return response()->json([
                'success' => false,
                'message' => 'Solo los usuarios con categoría Oro o Diamante pueden pagar con crédito'
            ], 403);
        }

        // Verificar si hay órdenes pendientes con productos similares
        $pendingOrderCheck = $this->checkPendingOrdersWithSimilarProducts($user, $request->items);
        if ($pendingOrderCheck['has_pending']) {
            return response()->json([
                'success' => false,
                'message' => $pendingOrderCheck['message'],
                'pending_order' => $pendingOrderCheck['order'],
                'has_pending_order' => true
            ], 422);
        }

        $totalAmount = round((float) $request->total_amount, 2);
        $payRemainderWithMercadoPago = $request->boolean('pay_remainder_with_mercadopago', true);

        try {
            $tx = DB::transaction(function () use ($request, $user, $addressId, $deliveryType, $totalAmount, $payRemainderWithMercadoPago) {
                /** @var User $lockedUser */
                $lockedUser = User::query()
                    ->whereKey($user->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $sortedItems = $this->sortItemsForCreditSplit($request->items);

                $validation = $this->creditAvailabilityService->validateNewCreditOrder(
                    $lockedUser,
                    $totalAmount,
                    $payRemainderWithMercadoPago
                );

                if (! $validation['ok']) {
                    return ['error_response' => response()->json([
                        'success' => false,
                        'message' => $validation['message'],
                        'credit_limit' => $validation['credit_limit'],
                        'credit_committed' => $validation['credit_committed'],
                        'credit_available' => $validation['credit_available'],
                        'amount_requested' => $totalAmount,
                        'amount_exceeded' => $validation['amount_exceeded'],
                    ], 422)];
                }

                $creditToUse = (float) $validation['credit_to_use'];
                $amountPending = (float) $validation['amount_pending'];
                $creditAvailable = (float) $validation['credit_available'];

                Log::info('Crédito mixto: validación previa al reparto', [
                    'total_pedido' => round($totalAmount, 2),
                    'credito_aplicado' => round($creditToUse, 2),
                    'monto_pendiente_mercadopago' => round($amountPending, 2),
                    'cupo_disponible' => round($creditAvailable, 2),
                ]);

                $descuento1 = (float) $request->input('descuento1', 0);
                $descuento2 = (float) $request->input('descuento2', 0);
                $subtotal = (float) $request->input('subtotal', 0);
                $discountedTotal = (float) $request->input('discounted_total', 0);
                $shippingAmount = (float) $request->input('shipping_amount', 0);

                $linesSum = $this->orderCreditSplitService->sumLines($sortedItems);
                // Coherencia: total ≈ mercancía neta + envío (no subtotal bruto + envío)
                if (abs($discountedTotal + $shippingAmount - $totalAmount) > 0.05) {
                    $shippingAmount = round($totalAmount - $discountedTotal, 2);
                    if ($shippingAmount < 0) {
                        $shippingAmount = 0;
                    }
                }

                // Pago 100 % con crédito: una sola orden (sin split). Remanentes ≤ $0.01 se consideran cubiertos.
                if ($amountPending <= 0.01) {
                    $initialPaymentData = [
                        'delivery_type' => $deliveryType,
                        'shipping_amount' => $shippingAmount,
                    ];

                    $order = Order::create([
                        'user_id' => $lockedUser->id,
                        'address_id' => $addressId,
                        'total_amount' => $totalAmount,
                        'subtotal' => $subtotal,
                        'discounted_total' => $discountedTotal,
                        'shipping_amount' => $shippingAmount,
                        'descuento1' => $descuento1,
                        'descuento2' => $descuento2,
                        'credit_used' => $creditToUse,
                        'amount_paid' => 0.0,
                        'amount_pending' => 0.0,
                        'paid_with_credit' => $creditToUse > 0,
                        'status' => 'pendiente_pago',
                        'payment_method' => 'credito',
                        'external_reference' => uniqid('order_'.$lockedUser->id.'_'),
                        'payment_data' => json_encode($initialPaymentData),
                        'is_advance_order' => $this->orderLinesContainComingSoon($sortedItems),
                    ]);

                    foreach ($sortedItems as $item) {
                        OrderItem::create($this->orderItemPayloadFromLine($order->id, $item));
                    }

                    $freshUser = User::query()->whereKey($lockedUser->id)->firstOrFail();
                    $this->creditAvailabilityService->syncCreditBalanceFromOrders($freshUser);

                    return [
                        'mode' => 'single',
                        'order' => $order->fresh(['user', 'items', 'address']),
                        'credit_to_use' => $creditToUse,
                        'amount_pending' => 0.0,
                    ];
                }

                // Split: cupo contra total NETO de mercancía; reparto de líneas en bruto proporcional al neto
                $merchandiseNet = round(max(0, $discountedTotal), 2);
                $netCreditForMerch = round(min($merchandiseNet, $creditToUse), 2);
                $grossCreditCap = $this->orderCreditSplitService->grossCapForNetCredit(
                    $linesSum,
                    $merchandiseNet,
                    $netCreditForMerch
                );
                $split = $this->orderCreditSplitService->splitItemsByCreditCap($sortedItems, $grossCreditCap);
                $creditItems = $split['credit_items'];
                $mpItems = $split['mp_items'];
                $creditSubtotal = $split['credit_subtotal'];
                $mpLinesSubtotal = $split['mp_lines_subtotal'];

                $splitGroupId = uniqid('split_'.$lockedUser->id.'_', true);

                $amtA = count($creditItems) > 0
                    ? $this->orderCreditSplitService->prorateOrderAmounts(
                        $creditSubtotal,
                        $linesSum,
                        $subtotal,
                        $discountedTotal,
                        $descuento1,
                        $descuento2
                    )
                    : null;

                $amtB = $this->orderCreditSplitService->prorateOrderAmounts(
                    $mpLinesSubtotal,
                    $linesSum,
                    $subtotal,
                    $discountedTotal,
                    $descuento1,
                    $descuento2
                );

                $totalNetA = $amtA ? round((float) $amtA['discounted_total'], 2) : 0.0;
                $netOrderB = round((float) $amtB['discounted_total'], 2);
                $driftNet = round($merchandiseNet - $totalNetA - $netOrderB, 2);
                if (abs($driftNet) >= 0.01) {
                    $netOrderB = round($netOrderB + $driftNet, 2);
                }

                $validatedPending = round((float) $amountPending, 2);
                $orderBTotal = round($netOrderB + $shippingAmount, 2);

                // Alinear siempre al pendiente validado (CreditAvailabilityService). Si no, puede quedar orden MP al 100% del carrito sin orden de crédito (reparto por piezas con precio unitario > cupo bruto).
                if ($validatedPending > 0.01 && ($orderBTotal <= 0.01 || abs($orderBTotal - $validatedPending) > 0.05)) {
                    Log::info('Crédito mixto: alineando total orden Mercado Pago al pendiente validado', [
                        'total_pedido' => round($totalAmount, 2),
                        'credito_aplicado' => round($creditToUse, 2),
                        'pendiente_validado' => $validatedPending,
                        'order_b_total_antes_split' => $orderBTotal,
                        'mercancia_neta' => $merchandiseNet,
                        'envio' => $shippingAmount,
                        'lineas_credito_reparto' => count($creditItems),
                    ]);
                    $orderBTotal = $validatedPending;
                    $netOrderB = round($orderBTotal - $shippingAmount, 2);
                    $totalNetA = round($merchandiseNet - $netOrderB, 2);
                }

                // Cupo aplicado en dinero pero ninguna línea entró al reparto (p. ej. todas las piezas cuestan más que el tope bruto por unidad).
                if (count($creditItems) === 0 && $totalNetA > 0.01 && round((float) $creditToUse, 2) > 0.01) {
                    $creditGross = $merchandiseNet > 0.0001
                        ? round($linesSum * min(1.0, max(0.0, $totalNetA / $merchandiseNet)), 2)
                        : round($totalNetA, 2);
                    if ($creditGross < 0.01) {
                        $creditGross = round($totalNetA, 2);
                    }
                    Log::info('Crédito mixto: orden crédito con línea única (reparto por piezas vacío)', [
                        'total_neto_credito' => $totalNetA,
                        'subtotal_bruto_linea' => $creditGross,
                    ]);
                    $creditItems = [[
                        'product_id' => '0',
                        'name' => 'Mercancía cubierta con cupo de crédito',
                        'quantity' => 1,
                        'price' => $creditGross,
                        'size' => null,
                        'color' => null,
                        'barcode' => null,
                        'is_coming_soon' => false,
                    ]];
                    $creditSubtotal = $this->orderCreditSplitService->sumLines($creditItems);
                    $amtA = $this->orderCreditSplitService->prorateOrderAmounts(
                        $creditSubtotal,
                        $linesSum,
                        $subtotal,
                        $discountedTotal,
                        $descuento1,
                        $descuento2
                    );
                    $totalNetA = round((float) $amtA['discounted_total'], 2);
                    $netOrderB = round($merchandiseNet - $totalNetA, 2);
                    $orderBTotal = round($netOrderB + $shippingAmount, 2);
                    if (abs($orderBTotal - $validatedPending) > 0.05 && $validatedPending > 0.01) {
                        $orderBTotal = $validatedPending;
                        $netOrderB = round($orderBTotal - $shippingAmount, 2);
                        $totalNetA = round($merchandiseNet - $netOrderB, 2);
                    }
                }

                $ratioA = $merchandiseNet > 0.0001
                    ? min(1.0, max(0.0, $totalNetA / $merchandiseNet))
                    : ($totalNetA > 0 ? 1.0 : 0.0);
                $ratioB = $merchandiseNet > 0.0001
                    ? min(1.0, max(0.0, $netOrderB / $merchandiseNet))
                    : ($netOrderB > 0 ? 1.0 : 0.0);
                $orderASubtotal = round($subtotal * $ratioA, 2);
                $orderBSubtotal = round($subtotal * $ratioB, 2);
                $orderADesc1 = round($descuento1 * $ratioA, 2);
                $orderADesc2 = round($descuento2 * $ratioA, 2);
                $orderBDesc1 = round($descuento1 * $ratioB, 2);
                $orderBDesc2 = round($descuento2 * $ratioB, 2);

                $pdB = [
                    'delivery_type' => $deliveryType,
                    'shipping_amount' => $shippingAmount,
                    'split_group_id' => $splitGroupId,
                    'split_role' => 'mercadopago_remainder',
                    'split_paired_order_id' => null,
                ];

                $orderB = Order::create([
                    'user_id' => $lockedUser->id,
                    'address_id' => $addressId,
                    'total_amount' => $orderBTotal,
                    'subtotal' => $orderBSubtotal,
                    'discounted_total' => $netOrderB,
                    'shipping_amount' => $shippingAmount,
                    'descuento1' => $orderBDesc1,
                    'descuento2' => $orderBDesc2,
                    'credit_used' => 0.0,
                    'amount_paid' => 0.0,
                    'amount_pending' => $orderBTotal,
                    'paid_with_credit' => false,
                    'status' => 'pendiente_pago',
                    'payment_method' => 'mercadopago',
                    'external_reference' => uniqid('order_'.$lockedUser->id.'_mp_'),
                    'payment_data' => json_encode($pdB),
                    'is_advance_order' => $this->orderLinesContainComingSoon($mpItems),
                ]);

                $orderCredit = null;
                if (count($creditItems) > 0) {
                    $pdA = [
                        'delivery_type' => $deliveryType,
                        'shipping_amount' => 0,
                        'split_group_id' => $splitGroupId,
                        'split_role' => 'credit',
                        'split_paired_order_id' => $orderB->id,
                    ];

                    $orderCredit = Order::create([
                        'user_id' => $lockedUser->id,
                        'address_id' => $addressId,
                        'total_amount' => $totalNetA,
                        'subtotal' => $orderASubtotal,
                        'discounted_total' => $totalNetA,
                        'shipping_amount' => 0,
                        'descuento1' => $orderADesc1,
                        'descuento2' => $orderADesc2,
                        'credit_used' => $totalNetA,
                        'amount_paid' => 0.0,
                        'amount_pending' => 0.0,
                        'paid_with_credit' => true,
                        'status' => 'pendiente_pago',
                        'payment_method' => 'credito',
                        'external_reference' => uniqid('order_'.$lockedUser->id.'_cr_'),
                        'payment_data' => json_encode($pdA),
                        'is_advance_order' => $this->orderLinesContainComingSoon($creditItems),
                    ]);

                    foreach ($creditItems as $item) {
                        OrderItem::create($this->orderItemPayloadFromLine($orderCredit->id, $item));
                    }

                    $pdB['split_paired_order_id'] = $orderCredit->id;
                    $orderB->update(['payment_data' => json_encode($pdB)]);
                }

                if (count($mpItems) > 0) {
                    foreach ($mpItems as $item) {
                        OrderItem::create($this->orderItemPayloadFromLine($orderB->id, $item));
                    }
                } elseif ($shippingAmount > 0.001) {
                    OrderItem::create($this->orderItemPayloadFromLine($orderB->id, [
                        'product_id' => '0',
                        'name' => 'Envío',
                        'size' => null,
                        'color' => null,
                        'barcode' => null,
                        'quantity' => 1,
                        'price' => $shippingAmount,
                    ]));
                }

                $freshUser = User::query()->whereKey($lockedUser->id)->firstOrFail();
                $this->creditAvailabilityService->syncCreditBalanceFromOrders($freshUser);

                return [
                    'mode' => 'split',
                    'order_credit' => $orderCredit ? $orderCredit->fresh(['user', 'items', 'address']) : null,
                    'order_payment' => $orderB->fresh(['user', 'items', 'address']),
                    'credit_subtotal' => $orderCredit ? (float) $orderCredit->discounted_total : 0.0,
                    'amount_pending' => $orderBTotal,
                    'split_group_id' => $splitGroupId,
                ];
            });

            if (isset($tx['error_response'])) {
                return $tx['error_response'];
            }

            if (($tx['mode'] ?? '') === 'single') {
                /** @var Order $order */
                $order = $tx['order'];
                $creditToUse = $tx['credit_to_use'];

                try {
                    Mail::to($user->email)->send(new OrderConfirmationMail($order));
                    Log::info('Email de confirmación enviado al cliente (crédito completo)', ['order_id' => $order->id]);
                } catch (\Exception $e) {
                    Log::error('Error al enviar email de confirmación (crédito completo)', [
                        'order_id' => $order->id,
                        'error' => $e->getMessage()
                    ]);
                }

                // API externa: se envía cuando la orden pase a «pagado» (liquidación admin o pago MP aprobado), no al crear en pendiente_pago con crédito.

                // Vigencia categoría: se registra al marcar la orden como pagada (admin o MP), no al crear con crédito pendiente de liquidación.

                return response()->json([
                    'success' => true,
                    'message' => 'Pedido realizado con éxito. Tu saldo pendiente se ha actualizado.',
                    'data' => [
                        'order_split' => false,
                        'order_id' => $order->id,
                        'credit_used' => $creditToUse,
                        'amount_pending' => 0,
                        'payment_method' => 'credito',
                        'order_status' => 'pendiente_pago',
                    ]
                ]);
            }

            // Split: la parte Mercado Pago sigue pendiente_pago hasta aprobación; la parte crédito queda pendiente_pago hasta liquidación admin.

            /** @var Order|null $orderCredit */
            $orderCredit = $tx['order_credit'];
            /** @var Order $orderPayment */
            $orderPayment = $tx['order_payment'];
            $creditSubtotal = $tx['credit_subtotal'];
            $amountPending = $tx['amount_pending'];

            $address = $addressId ? $user->addresses()->find($addressId) : null;

            $prefLineItems = [];
            foreach ($orderPayment->items as $oi) {
                $prefLineItems[] = [
                    'product_id' => $oi->product_id,
                    'name' => $oi->name,
                    'quantity' => (int) $oi->quantity,
                    'price' => (float) $oi->price,
                    'size' => $oi->size,
                    'color' => $oi->color,
                    'barcode' => $oi->barcode,
                ];
            }

            $sumPref = 0.0;
            foreach ($prefLineItems as $li) {
                $sumPref += $li['price'] * $li['quantity'];
            }
            $sumPref = round($sumPref, 2);
            if (abs($sumPref - $amountPending) > 0.05) {
                $diff = round($amountPending - $sumPref, 2);
                if (abs($diff) > 0.001) {
                    $prefLineItems[] = [
                        'product_id' => '0',
                        'name' => 'Ajuste de total',
                        'quantity' => 1,
                        'price' => $diff,
                        'size' => null,
                        'color' => null,
                        'barcode' => null,
                    ];
                }
            }

            $orderData = [
                'order_id' => $orderPayment->external_reference,
                'user' => [
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone
                ],
                'address' => $address ? [
                    'street_address' => $address->street_address,
                    'city' => $address->city,
                    'state' => $address->state,
                    'postal_code' => $address->postal_code,
                    'country' => $address->country
                ] : [
                    'street_address' => '',
                    'city' => '',
                    'state' => '',
                    'postal_code' => '',
                    'country' => 'México'
                ],
                'items' => $prefLineItems,
                'delivery_type' => $deliveryType
            ];
            $orderData = $this->withMercadopagoCherryOrderContext(
                $orderData,
                $user,
                $orderPayment,
                $orderPayment->order_group_id ? ['order_group_id' => (string) $orderPayment->order_group_id] : []
            );

            Log::info('Crédito mixto: creando preferencia Mercado Pago (orden secundaria)', [
                'total_pedido' => round($totalAmount, 2),
                'credito_aplicado' => $orderCredit ? round((float) $orderCredit->total_amount, 2) : 0.0,
                'monto_enviado_mercadopago' => round((float) $orderPayment->total_amount, 2),
                'order_payment_id' => $orderPayment->id,
                'order_credit_id' => $orderCredit ? $orderCredit->id : null,
            ]);

            try {
                $preference = $this->mercadoPagoService->createPreference($orderData);
            } catch (\Exception $e) {
                Log::error('Crédito mixto: error Mercado Pago; revirtiendo órdenes del split', [
                    'error' => $e->getMessage(),
                    'order_payment_id' => $orderPayment->id,
                    'order_credit_id' => $orderCredit ? $orderCredit->id : null,
                ]);
                $this->rollbackCreditSplitOrders($orderCredit, $orderPayment, $user);

                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo iniciar el pago en Mercado Pago. No se registró el pedido. Intenta de nuevo o elige otro método de pago.',
                ], 502);
            }

            $orderPayment->update([
                'mercadopago_preference_id' => $preference->id
            ]);

            if ($orderCredit) {
                try {
                    Mail::to($user->email)->send(new OrderConfirmationMail($orderCredit));
                } catch (\Exception $e) {
                    Log::error('Email orden crédito (split)', ['order_id' => $orderCredit->id, 'error' => $e->getMessage()]);
                }

                // API externa (parte crédito del split): al liquidar como «pagado» desde admin o flujo equivalente.
            }

            try {
                Mail::to($user->email)->send(new OrderConfirmationMail($orderPayment));
            } catch (\Exception $e) {
                Log::error('Email orden MP (split)', ['order_id' => $orderPayment->id, 'error' => $e->getMessage()]);
            }

            $mpUrls = $this->mercadoPagoCheckoutUrlsFromPreference($preference);

            $checkoutUrl = $mpUrls['redirect_url'];
            $orderIds = array_values(array_filter([
                $orderCredit ? $orderCredit->id : null,
                $orderPayment->id,
            ]));

            return response()->json([
                'success' => true,
                'status' => 'success',
                'message' => 'Pedido dividido: una parte con tu crédito y el resto pendiente en Mercado Pago.',
                'data' => [
                    'order_split' => true,
                    'requires_mercadopago_redirect' => true,
                    'requires_payment' => true,
                    'redirect_url' => $checkoutUrl,
                    'payment_url' => $checkoutUrl,
                    'order_id' => $orderPayment->id,
                    'order_credit_id' => $orderCredit ? $orderCredit->id : null,
                    'order_payment_id' => $orderPayment->id,
                    'credit_used' => $creditSubtotal,
                    'amount_pending' => $amountPending,
                    'orders' => $orderIds,
                    'order_credit' => $orderCredit ? [
                        'id' => $orderCredit->id,
                        'total_amount' => (float) $orderCredit->total_amount,
                        'credit_used' => (float) $orderCredit->credit_used,
                        'message' => 'Orden aplicada a tu crédito (pendiente de facturación según tu flujo habitual).',
                    ] : null,
                    'order_payment' => [
                        'id' => $orderPayment->id,
                        'total_amount' => (float) $orderPayment->total_amount,
                        'amount_pending' => (float) $orderPayment->amount_pending,
                        'message' => 'Orden pendiente de pago externo (Mercado Pago).',
                    ],
                    'preference_id' => $preference->id,
                    'sandbox_payment_url' => $mpUrls['sandbox_url'],
                    'init_point' => $mpUrls['init_point'],
                    'sandbox_init_point' => $mpUrls['sandbox_init_point'],
                    'split_group_id' => $tx['split_group_id'],
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error procesando pago con crédito', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al procesar pago con crédito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear pedido adelantado (sin pago)
     */
    public function createAdvanceOrder(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        if (! $user->canMakeAdvanceOrders()) {
            return response()->json([
                'success' => false,
                'message' => 'Los pedidos de encargo (Próximamente o Agotado) solo están disponibles para clientes con categoría Oro o Diamante.',
            ], 403);
        }

        // Validar datos
        $validator = Validator::make($request->all(), [
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
            'total_amount' => 'required|numeric|min:0',
            'subtotal' => 'nullable|numeric|min:0',
            'discounted_total' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($rebajaEncargoError = $this->rejectRebajaAgotadoEncargoLines($request->input('items', []))) {
            return $rebajaEncargoError;
        }

        $bronzeShippingError = $this->rejectBronzeShippingWithoutPieces(
            $user,
            $request->input('delivery_type', 'envio'),
            $request->input('items', [])
        );
        if ($bronzeShippingError !== null) {
            return $bronzeShippingError;
        }

        $itemsForPricingSubset = $this->pricingLinesFromRequestItems($request->items);
        $fullRaw = $request->input('items_for_volume_pricing');
        $fullItemsForPricing = is_array($fullRaw) && count($fullRaw) > 0
            ? $this->pricingLinesFromRequestItems($fullRaw)
            : null;

        if ($fullItemsForPricing !== null) {
            $expectedMerchandise = $this->orderPricingService->discountedMerchandiseForSubset(
                $user,
                $fullItemsForPricing,
                $itemsForPricingSubset
            );
        } else {
            $summary = $this->orderPricingService->summarizeVolumeFromItems($user, $itemsForPricingSubset);
            $expectedMerchandise = $summary['discounted_merchandise'];
        }

        $shippingAmountVal = (float) $request->input('shipping_amount', 0);
        $discountedTotalReq = round((float) $request->input('discounted_total'), 2);
        $totalAmountReq = round((float) $request->input('total_amount'), 2);

        if (! $this->orderPricingService->totalsMatchRequest(
            $expectedMerchandise,
            $discountedTotalReq,
            $totalAmountReq,
            $shippingAmountVal,
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

        // Verificar si hay órdenes pendientes con productos similares
        $pendingOrderCheck = $this->checkPendingOrdersWithSimilarProducts($user, $request->items);
        if ($pendingOrderCheck['has_pending']) {
            return response()->json([
                'success' => false,
                'message' => $pendingOrderCheck['message'],
                'pending_order' => $pendingOrderCheck['order'],
                'has_pending_order' => true
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Obtener descuentos del request (20% y 10% adicional)
            $descuento1 = $request->input('descuento1', 0);
            $descuento2 = $request->input('descuento2', 0);
            
            // Obtener subtotal y discounted_total del request
            $subtotal = $request->input('subtotal', 0);
            $discountedTotal = $request->input('discounted_total', 0);

            // Crear el pedido adelantado
            $order = Order::create([
                'user_id' => $user->id,
                'address_id' => null, // Los pedidos adelantados no tienen dirección hasta que se paguen
                'total_amount' => $request->total_amount,
                'subtotal' => (float) $subtotal, // Monto total sin descuentos aplicados
                'discounted_total' => (float) $discountedTotal, // Monto total con descuentos aplicados (sin envío)
                'shipping_amount' => (float) $request->input('shipping_amount', 0),
                'descuento1' => (float) $descuento1, // 20% cuando total elegible >= 7000
                'descuento2' => (float) $descuento2, // 10% adicional cuando total elegible >= 15000
                'status' => 'pendiente_pago', // Pendiente hasta que el admin lo marque como pagado
                'payment_method' => 'pedido_adelantado',
                'is_advance_order' => true,
                'external_reference' => uniqid('advance_' . $user->id . '_')
            ]);

            // Crear los items del pedido
            foreach ($request->items as $item) {
                OrderItem::create($this->orderItemPayloadFromLine($order->id, $item));
            }

            DB::commit();

            // Recargar el pedido con relaciones necesarias para enviar a API externa
            $order->load(['user', 'items', 'address']);

            // Preparar payment_data inicial con delivery_type y shipping_amount
            $deliveryType = $request->input('delivery_type', 'envio'); // Por defecto envío, pero los pedidos anticipados pueden no tener dirección aún
            $shippingAmount = (float) $request->input('shipping_amount', 0);
            $initialPaymentData = [
                'delivery_type' => $deliveryType,
                'shipping_amount' => $shippingAmount
            ];
            
            // Actualizar payment_data
            $order->update(['payment_data' => json_encode($initialPaymentData)]);

            // Enviar inmediatamente a la API externa
            try {
                $apiResult = $this->externalSalesService->sendSaleToExternalApi($order);
                $this->externalSalesService->logSendResultIfApplicable(
                    $order,
                    $apiResult,
                    'Pedido anticipado enviado a API externa inmediatamente al crearse',
                    ['is_advance_order' => true]
                );
            } catch (\Exception $e) {
                Log::error('Error al enviar pedido anticipado a API externa al crearse', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                // No bloquear la creación del pedido si falla el envío a API externa
                // El admin podrá reenviarlo manualmente si es necesario
            }

            // Crear notificación para el admin
            Notification::create([
                'user_id' => $user->id,
                'type' => 'order_created',
                'title' => 'Nuevo pedido adelantado',
                'message' => "El usuario {$user->name} ha creado un pedido adelantado por $" . number_format($order->total_amount, 2),
                'data' => json_encode(['order_id' => $order->id])
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pedido adelantado creado exitosamente',
                'data' => [
                    'order_id' => $order->id,
                    'total_amount' => $order->total_amount,
                    'status' => $order->status
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear pedido adelantado', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear el pedido adelantado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reintentar pago del saldo pendiente de una orden pagada con crédito
     */
    public function retryRemainderPayment(Request $request, $orderId)
    {
        try {
            $user = Auth::user();
            
            // Buscar la orden
            $order = Order::where('id', $orderId)
                ->where('user_id', $user->id)
                ->with(['user', 'address'])
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada'
                ], 404);
            }

            // Verificar que la orden tenga saldo pendiente
            if (!$order->paid_with_credit || $order->amount_pending <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden no tiene saldo pendiente'
                ], 400);
            }

            // Verificar que la orden esté en estado pendiente_pago
            if ($order->status !== 'pendiente_pago') {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden no está pendiente de pago'
                ], 400);
            }

            // Crear preferencia de MercadoPago solo para el monto pendiente
            $address = $order->address;
            
            $orderData = [
                'order_id' => $order->external_reference . '_remainder',
                'user' => [
                    'first_name' => $order->user->first_name,
                    'last_name' => $order->user->last_name,
                    'email' => $order->user->email,
                    'phone' => $order->user->phone
                ],
                'address' => $address ? [
                    'street_address' => $address->street_address,
                    'city' => $address->city,
                    'state' => $address->state,
                    'postal_code' => $address->postal_code,
                    'country' => $address->country
                ] : [
                    'street_address' => '',
                    'city' => '',
                    'state' => '',
                    'postal_code' => '',
                    'country' => 'México'
                ],
                'items' => [[
                    'product_id' => 0,
                    'name' => 'Saldo pendiente de orden #' . str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'quantity' => 1,
                    'price' => $order->amount_pending,
                    'size' => null,
                    'color' => null,
                    'barcode' => null
                ]],
                'delivery_type' => $order->address_id ? 'envio' : 'retiro'
            ];
            $orderData = $this->withMercadopagoCherryOrderContext($orderData, $order->user, $order, []);

            $preference = $this->mercadoPagoService->createPreference($orderData);
            
            $order->update([
                'mercadopago_preference_id' => $preference->id
            ]);

            $mpUrls = $this->mercadoPagoCheckoutUrlsFromPreference($preference);

            return response()->json([
                'success' => true,
                'message' => 'Preferencia de pago creada para el saldo pendiente',
                'data' => [
                    'order_id' => $order->id,
                    'amount_pending' => $order->amount_pending,
                    'preference_id' => $preference->id,
                    'redirect_url' => $mpUrls['redirect_url'],
                    'init_point' => $mpUrls['init_point'],
                    'sandbox_init_point' => $mpUrls['sandbox_init_point'],
                    'payment_url' => $mpUrls['pay_url'],
                    'sandbox_payment_url' => $mpUrls['sandbox_url'],
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al reintentar pago del saldo pendiente', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear la preferencia de pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear preferencia de pago para una orden pendiente
     */
    public function payPendingOrder(Request $request, $orderId)
    {
        try {
            $user = Auth::user();
            
            // Buscar la orden
            $order = Order::where('id', $orderId)
                ->where('user_id', $user->id)
                ->with(['user', 'address', 'items'])
                ->first();

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada'
                ], 404);
            }

            // Verificar que la orden esté en estado pendiente
            if (!in_array($order->status, ['pending', 'pendiente_pago'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden no está pendiente de pago'
                ], 400);
            }

            // Verificar que la orden no haya sido pagada completamente
            if ($order->status === 'pagado') {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta orden ya ha sido pagada'
                ], 400);
            }

            // Preparar items de la orden para MercadoPago
            $items = [];
            foreach ($order->items as $orderItem) {
                $items[] = [
                    'product_id' => (string) $orderItem->product_id,
                    'name' => $orderItem->name,
                    'quantity' => (int) $orderItem->quantity,
                    'price' => (float) $orderItem->price,
                    'size' => $orderItem->size,
                    'color' => $orderItem->color,
                    'barcode' => $orderItem->barcode
                ];
            }

            // Si hay diferencia entre el total de items y el total_amount, agregar envío o ajuste
            $itemsTotal = $order->items->sum(function($item) {
                return $item->price * $item->quantity;
            });
            $difference = (float) $order->total_amount - $itemsTotal;

            if (abs($difference) > 0.01) {
                if ($difference > 0) {
                    // Diferencia positiva (envío agregado)
                    $items[] = [
                        'product_id' => '0',
                        'name' => 'Envío',
                        'quantity' => 1,
                        'price' => $difference,
                        'size' => null,
                        'color' => null,
                        'barcode' => null
                    ];
                } else {
                    // Diferencia negativa (descuento adicional) - ajustar precios proporcionalmente
                    $adjustmentFactor = (float) $order->total_amount / $itemsTotal;
                    foreach ($items as &$item) {
                        $item['price'] = round($item['price'] * $adjustmentFactor, 2);
                    }
                    unset($item);
                }
            }

            // Crear preferencia de MercadoPago
            $address = $order->address;
            
            $orderData = [
                'order_id' => $order->external_reference,
                'user' => [
                    'first_name' => $order->user->first_name,
                    'last_name' => $order->user->last_name,
                    'email' => $order->user->email,
                    'phone' => $order->user->phone
                ],
                'address' => $address ? [
                    'street_address' => $address->street_address,
                    'city' => $address->city,
                    'state' => $address->state,
                    'postal_code' => $address->postal_code,
                    'country' => $address->country
                ] : [
                    'street_address' => '',
                    'city' => '',
                    'state' => '',
                    'postal_code' => '',
                    'country' => 'México'
                ],
                'items' => $items,
                'delivery_type' => $order->address_id ? 'envio' : 'retiro'
            ];
            $orderData = $this->withMercadopagoCherryOrderContext($orderData, $order->user, $order, []);

            $preference = $this->mercadoPagoService->createPreference($orderData);
            
            // Actualizar la orden con el ID de preferencia
            $order->update([
                'mercadopago_preference_id' => $preference->id
            ]);

            $mpUrls = $this->mercadoPagoCheckoutUrlsFromPreference($preference);

            return response()->json([
                'success' => true,
                'message' => 'Preferencia de pago creada correctamente',
                'data' => [
                    'order_id' => $order->id,
                    'preference_id' => $preference->id,
                    'redirect_url' => $mpUrls['redirect_url'],
                    'init_point' => $mpUrls['init_point'],
                    'sandbox_init_point' => $mpUrls['sandbox_init_point'],
                    'payment_url' => $mpUrls['pay_url'],
                    'sandbox_payment_url' => $mpUrls['sandbox_url'],
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error al crear preferencia de pago para orden pendiente', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear la preferencia de pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Print order as HTML printable view (single order).
     */
    public function printOrder(Request $request, $orderId)
    {
        try {
            $auth = $this->resolvePrintOrderAuth($request, $orderId, 'printOrder');
            if ($auth['error']) {
                return $auth['error'];
            }

            $order = Order::with(['user', 'items', 'address'])->findOrFail($orderId);
            $section = $this->buildPrintSectionData($order);

            return view('orders.print', $section);
        } catch (\Exception $e) {
            Log::error('Error al imprimir orden', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al generar la vista de impresión: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PDF del pedido para compartir (incluye órdenes divididas del mismo checkout).
     */
    public function printOrderPdf(Request $request, $orderId)
    {
        try {
            $auth = $this->resolvePrintOrderAuth($request, $orderId, 'printOrderPdf');
            if ($auth['error']) {
                return $auth['error'];
            }

            $order = Order::with(['user', 'items', 'address'])->findOrFail($orderId);

            if (! $order->share_pdf_path || ! Storage::disk('public')->exists($order->share_pdf_path)) {
                $this->orderSharePdfService->ensureStoredForOrder($order);
                $order->refresh();
            }

            if ($order->share_pdf_path && Storage::disk('public')->exists($order->share_pdf_path)) {
                $filename = $order->share_pdf_name ?? 'pedido.pdf';

                return response()->file(
                    Storage::disk('public')->path($order->share_pdf_path),
                    [
                        'Content-Type' => 'application/pdf',
                        'Content-Disposition' => 'inline; filename="' . $filename . '"',
                        'Cache-Control' => 'private, max-age=3600',
                    ]
                );
            }

            $group = $this->orderSharePdfService->resolveCheckoutGroupOrders($order);
            $rendered = $this->orderSharePdfService->renderPdfForGroup($group);

            return response($rendered['content'], 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $rendered['filename'] . '"',
            ]);
        } catch (\Exception $e) {
            Log::error('Error al generar PDF de orden', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al generar el PDF del pedido: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * @return array{user: User|null, error: \Illuminate\Http\JsonResponse|null}
     */
    private function resolvePrintOrderAuth(Request $request, $orderId, string $context): array
    {
        /** @var User|null $user */
        $user = Auth::user();

        if (! $user) {
            $token = $request->query('token') ?? $request->header('Authorization');

            if ($token) {
                if (strpos($token, 'Bearer ') === 0) {
                    $token = substr($token, 7);
                }

                try {
                    $user = \Tymon\JWTAuth\Facades\JWTAuth::setToken($token)->authenticate();
                    if ($user) {
                        Auth::setUser($user);
                    }
                } catch (\Exception $e) {
                    Log::error('Error al autenticar con token en ' . $context, [
                        'error' => $e->getMessage(),
                        'order_id' => $orderId,
                    ]);
                }
            }
        }

        if (! $user) {
            return [
                'user' => null,
                'error' => response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado',
                ], 401),
            ];
        }

        if (! $user->relationLoaded('role')) {
            $user->load('role');
        }

        $order = Order::find($orderId);
        if (! $order) {
            return [
                'user' => $user,
                'error' => response()->json([
                    'success' => false,
                    'message' => 'Orden no encontrada',
                ], 404),
            ];
        }

        if ((int) $order->user_id !== (int) $user->id && ! $user->isAdminOrOperator()) {
            return [
                'user' => $user,
                'error' => response()->json([
                    'success' => false,
                    'message' => 'No tienes permiso para ver esta orden',
                ], 403),
            ];
        }

        return ['user' => $user, 'error' => null];
    }

    /**
     * Datos de vista para imprimir/compartir una orden.
     *
     * @return array<string, mixed>
     */
    private function buildPrintSectionData(Order $order): array
    {
        return $this->orderPrintViewDataBuilder->buildSection($order);
    }

    /**
     * Verificar si el usuario bronce tiene órdenes pendientes con productos similares del mismo día.
     * Oro y diamante pueden repetir pedidos con la misma mercancía.
     */
    private function checkPendingOrdersWithSimilarProducts(User $user, $newItems)
    {
        if (! $user->isBronceSeller()) {
            return [
                'has_pending' => false,
                'message' => null,
                'order' => null,
            ];
        }

        // Normalizar los items de la nueva orden: crear un array con product_id => cantidad total
        $newItemsNormalized = [];
        foreach ($newItems as $item) {
            $productId = (string) $item['product_id'];
            $quantity = (int) ($item['quantity'] ?? 1);
            
            if (!isset($newItemsNormalized[$productId])) {
                $newItemsNormalized[$productId] = 0;
            }
            $newItemsNormalized[$productId] += $quantity;
        }

        // Ordenar por product_id para comparación consistente
        ksort($newItemsNormalized);

        // Obtener la fecha de hoy (solo fecha, sin hora)
        $today = Carbon::today();

        // Buscar órdenes pendientes del usuario creadas hoy
        $pendingOrders = Order::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'pendiente_pago'])
            ->whereDate('created_at', $today) // Solo órdenes del mismo día
            ->with(['items', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($pendingOrders as $order) {
            // No bloquear por duplicado si la pendiente es solo la parte Mercado Pago de un split (crédito + saldo MP)
            $paymentData = $order->payment_data;
            if (! is_array($paymentData)) {
                $paymentData = is_string($paymentData) ? (json_decode($paymentData, true) ?? []) : [];
            }
            if (($paymentData['split_role'] ?? '') === 'mercadopago_remainder') {
                continue;
            }

            // Normalizar los items de la orden pendiente: crear un array con product_id => cantidad total
            $orderItemsNormalized = [];
            foreach ($order->items as $orderItem) {
                $productId = (string) $orderItem->product_id;
                $quantity = (int) $orderItem->quantity;
                
                if (!isset($orderItemsNormalized[$productId])) {
                    $orderItemsNormalized[$productId] = 0;
                }
                $orderItemsNormalized[$productId] += $quantity;
            }

            // Ordenar por product_id para comparación consistente
            ksort($orderItemsNormalized);

            // Comparar si son exactamente iguales (mismos productos y mismas cantidades)
            if ($newItemsNormalized === $orderItemsNormalized) {
                // Las órdenes son exactamente iguales
                $orderNumber = $order->orderNumberPrefixForDisplay() . str_pad($order->id, 4, '0', STR_PAD_LEFT);
                
                // Obtener nombres de productos para el mensaje
                $productNames = $order->items->pluck('name')
                    ->unique()
                    ->take(3)
                    ->implode(', ');
                
                $totalProducts = count($newItemsNormalized);
                $message = "Ya tienes una orden pendiente del día de hoy con la misma mercancía (Orden #{$orderNumber}). " .
                          "Por favor, completa esa orden antes de crear una nueva.";

                return [
                    'has_pending' => true,
                    'message' => $message,
                    'order' => [
                        'id' => $order->id,
                        'number' => $orderNumber,
                        'status' => $order->status,
                        'total_amount' => $order->total_amount,
                        'created_at' => $order->created_at
                    ]
                ];
            }
        }

        return [
            'has_pending' => false,
            'message' => null,
            'order' => null
        ];
    }
}
