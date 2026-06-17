<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogOffer;
use App\Services\CatalogOfferScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserDiscountController extends Controller
{
    public function __construct(
        private readonly CatalogOfferScopeService $offerScopeService
    ) {}

    /**
     * Verificar descuentos aplicables para un usuario y productos específicos.
     */
    public function checkUserDiscounts(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_ids' => 'required|array',
                'product_ids.*' => 'string|max:50',
            ]);

            $userId = $request->user()?->id;
            $productIds = array_values(array_filter(array_map('strval', $validated['product_ids']), static fn (string $id): bool => trim($id) !== ''));

            if (! $userId || $productIds === []) {
                return response()->json([
                    'success' => true,
                    'discounts' => [],
                ]);
            }

            $offers = CatalogOffer::query()
                ->whereHas('offerUsers', fn ($q) => $q->where('user_id', $userId))
                ->active()
                ->ordered()
                ->orderByDesc('id')
                ->get();

            $offerByProduct = $this->offerScopeService->mapProductIdsToOffers($offers, $productIds);

            $discounts = [];
            foreach ($offerByProduct as $productId => $offer) {
                $discounts[$productId] = $this->formatDiscountPayload($offer);
            }

            $activeOffers = $offers->map(fn (CatalogOffer $offer) => $this->formatDiscountPayload($offer))->values();

            return response()->json([
                'success' => true,
                'discounts' => $discounts,
                'active_offers' => $activeOffers,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al verificar descuentos',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener IDs de productos que tienen ofertas para el usuario actual.
     */
    public function getUserOfferProducts(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()?->id;

            if (! $userId) {
                return response()->json([
                    'success' => true,
                    'product_ids' => [],
                ]);
            }

            $offers = CatalogOffer::query()
                ->whereHas('offerUsers', fn ($q) => $q->where('user_id', $userId))
                ->active()
                ->ordered()
                ->orderByDesc('id')
                ->get();

            $productIds = [];
            foreach ($offers as $offer) {
                $productIds = array_merge(
                    $productIds,
                    $this->offerScopeService->resolveProductIdsForOffer($offer)
                );
            }

            $productIds = array_values(array_unique($productIds));

            return response()->json([
                'success' => true,
                'product_ids' => $productIds,
                'count' => count($productIds),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function formatDiscountPayload(CatalogOffer $offer): array
    {
        $discountData = [
            'offer_id' => $offer->id,
            'title' => $offer->title,
            'discount_category' => $offer->discount_category,
            'end_date' => $offer->end_date,
            'target_scope' => $offer->target_scope,
        ];

        if ($offer->discount_category === 'buy_x_get_y') {
            $discountData['buy_quantity'] = $offer->buy_quantity;
            $discountData['get_quantity'] = $offer->get_quantity;
            $discountData['discount_type'] = 'buy_x_get_y';
            $discountData['discount_percentage'] = 0;
            $discountData['min_purchase_amount'] = $offer->min_purchase_amount;
        } elseif ($offer->discount_category === 'free_shipping') {
            $discountData['discount_type'] = 'free_shipping';
            $discountData['discount_percentage'] = 0;
            $discountData['min_purchase_amount'] = $offer->min_purchase_amount;
        } else {
            $discountData['discount_percentage'] = $offer->discount_percentage;
            $discountData['discount_type'] = $offer->discount_type;
            $discountData['max_discount_amount'] = $offer->max_discount_amount;
            $discountData['min_purchase_amount'] = $offer->min_purchase_amount;
        }

        return $discountData;
    }
}
