<?php

namespace App\Services;

use App\Models\CatalogOffer;
use App\Models\Producto;
use App\Support\ProductNewEvaluator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CatalogOfferScopeService
{
    public const SCOPE_PRODUCTS = 'products';

    public const SCOPE_CATEGORY = 'category';

    public const SCOPE_CATALOG = 'catalog';

    public const SCOPE_NEW = 'new';

    public const SCOPE_REBAJAS = 'rebajas';

    /** @return list<string> */
    public static function allScopes(): array
    {
        return [
            self::SCOPE_PRODUCTS,
            self::SCOPE_CATEGORY,
            self::SCOPE_CATALOG,
            self::SCOPE_NEW,
            self::SCOPE_REBAJAS,
        ];
    }

    public function usesDynamicScope(CatalogOffer $offer): bool
    {
        $scope = $this->normalizeScope($offer->target_scope);

        return $scope !== self::SCOPE_PRODUCTS;
    }

    public function productMatchesOffer(CatalogOffer $offer, Producto $producto): bool
    {
        if ($producto->isProximamente()) {
            return false;
        }

        $scope = $this->normalizeScope($offer->target_scope);

        return match ($scope) {
            self::SCOPE_PRODUCTS => $offer->offerProducts()->where('product_id', $producto->id)->exists(),
            self::SCOPE_CATEGORY => $this->matchesCategory($producto, (string) ($offer->target_category_code ?? '')),
            self::SCOPE_CATALOG => $this->matchesCatalog($producto, (string) ($offer->target_catalog_id ?? '')),
            self::SCOPE_NEW => $this->matchesNew($producto),
            self::SCOPE_REBAJAS => $this->matchesRebajas($producto),
            default => $offer->offerProducts()->where('product_id', $producto->id)->exists(),
        };
    }

    /**
     * @param  list<string>  $productIds
     * @return array<string, CatalogOffer> product_id => offer (first matching offer per product)
     */
    public function mapProductIdsToOffers(Collection $offers, array $productIds): array
    {
        $productIds = array_values(array_unique(array_filter(array_map('strval', $productIds))));
        if ($productIds === [] || $offers->isEmpty()) {
            return [];
        }

        $productos = Producto::query()
            ->with('detalles')
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        $explicitProductIdsByOffer = $this->buildExplicitProductMap($offers);

        $result = [];
        foreach ($productIds as $productId) {
            $producto = $productos->get($productId);
            if ($producto === null) {
                continue;
            }

            foreach ($offers as $offer) {
                if ($this->productMatchesOfferWithCache($offer, $producto, $explicitProductIdsByOffer)) {
                    $result[$productId] = $offer;
                    break;
                }
            }
        }

        return $result;
    }

    /**
     * @return list<string>
     */
    public function resolveProductIdsForOffer(CatalogOffer $offer, int $limit = 5000): array
    {
        $scope = $this->normalizeScope($offer->target_scope);

        if ($scope === self::SCOPE_PRODUCTS) {
            return $this->filterOutProximamenteProductIds(
                $offer->offerProducts()->pluck('product_id')->map(fn ($id) => (string) $id)->all()
            );
        }

        $query = Producto::query()->select('productos.id');
        Producto::applyFechaAgotadoVisibilityToProductosQuery($query->toBase());

        return match ($scope) {
            self::SCOPE_CATEGORY => $this->filterOutProximamenteProductIds(
                $this->applyCategoryScopeToQuery($query, (string) ($offer->target_category_code ?? ''))
                    ->limit($limit)
                    ->pluck('id')
                    ->map(fn ($id) => (string) $id)
                    ->all()
            ),
            self::SCOPE_CATALOG => $this->filterOutProximamenteProductIds(
                $this->applyCatalogScopeToQuery($query, (string) ($offer->target_catalog_id ?? ''))
                    ->limit($limit)
                    ->pluck('id')
                    ->map(fn ($id) => (string) $id)
                    ->all()
            ),
            self::SCOPE_NEW => $this->resolveNewProductIds($limit),
            self::SCOPE_REBAJAS => $this->filterOutProximamenteProductIds(
                $query->where('desc_promo', '>', 0)
                    ->limit($limit)
                    ->pluck('id')
                    ->map(fn ($id) => (string) $id)
                    ->all()
            ),
            default => [],
        };
    }

    /**
     * @param  list<string>  $productIds
     * @return list<string>
     */
    public function filterOutProximamenteProductIds(array $productIds): array
    {
        $productIds = array_values(array_unique(array_filter(array_map('strval', $productIds))));
        if ($productIds === []) {
            return [];
        }

        return Producto::query()
            ->with('detalles:id,producto_id,inventario_d')
            ->whereIn('id', $productIds)
            ->get()
            ->reject(fn (Producto $producto) => $producto->isProximamente())
            ->pluck('id')
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    private function resolveNewProductIds(int $limit): array
    {
        $cutoff = now()->subDays(30)->toDateString();

        $candidates = Producto::query()
            ->select(['id', 'fecha_compra', 'inventario'])
            ->whereNotNull('fecha_compra')
            ->whereDate('fecha_compra', '>=', $cutoff)
            ->with('detalles:id,producto_id,inventario_d')
            ->limit($limit * 3)
            ->get();

        return $this->filterOutProximamenteProductIds(
            $candidates
                ->filter(fn (Producto $producto) => $this->matchesNew($producto))
                ->take($limit)
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->values()
                ->all()
        );
    }

    /**
     * @param  Collection<int, CatalogOffer>  $offers
     * @return array<int, array<string, bool>>
     */
    private function buildExplicitProductMap(Collection $offers): array
    {
        $productScopeOfferIds = $offers
            ->filter(fn (CatalogOffer $offer) => $this->normalizeScope($offer->target_scope) === self::SCOPE_PRODUCTS)
            ->pluck('id')
            ->all();

        if ($productScopeOfferIds === []) {
            return [];
        }

        $rows = DB::table('catalog_offer_products')
            ->whereIn('offer_id', $productScopeOfferIds)
            ->get(['offer_id', 'product_id']);

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row->offer_id][(string) $row->product_id] = true;
        }

        return $map;
    }

    /**
     * @param  array<int, array<string, bool>>  $explicitProductIdsByOffer
     */
    private function productMatchesOfferWithCache(
        CatalogOffer $offer,
        Producto $producto,
        array $explicitProductIdsByOffer
    ): bool {
        if ($producto->isProximamente()) {
            return false;
        }

        $scope = $this->normalizeScope($offer->target_scope);

        if ($scope === self::SCOPE_PRODUCTS) {
            return ($explicitProductIdsByOffer[$offer->id] ?? [])[(string) $producto->id] ?? false;
        }

        return $this->productMatchesOffer($offer, $producto);
    }

    private function normalizeScope(mixed $scope): string
    {
        $scope = is_string($scope) ? strtolower(trim($scope)) : self::SCOPE_PRODUCTS;

        return in_array($scope, self::allScopes(), true) ? $scope : self::SCOPE_PRODUCTS;
    }

    private function matchesCategory(Producto $producto, string $categoryCode): bool
    {
        $normalizedOffer = $this->normalizeCategoryCode($categoryCode);
        if ($normalizedOffer === null) {
            return false;
        }

        $normalizedProduct = $this->normalizeCategoryCode((string) ($producto->id_linea ?? ''));

        return $normalizedProduct !== null && $normalizedProduct === $normalizedOffer;
    }

    private function matchesCatalog(Producto $producto, string $catalogId): bool
    {
        $catalogId = trim($catalogId);
        if ($catalogId === '') {
            return false;
        }

        return (string) ($producto->catalogoId ?? '') === $catalogId;
    }

    private function matchesNew(Producto $producto): bool
    {
        $detalleRows = $producto->relationLoaded('detalles')
            ? $producto->detalles->all()
            : $producto->detalles()->get(['inventario_d'])->all();

        return ProductNewEvaluator::isNewLikeNuevosPage(
            $producto->fecha_compra,
            (float) ($producto->inventario ?? 0),
            $detalleRows
        );
    }

    private function matchesRebajas(Producto $producto): bool
    {
        return (float) ($producto->desc_promo ?? 0) > 0.00001;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<Producto>  $query
     * @return \Illuminate\Database\Eloquent\Builder<Producto>
     */
    private function applyCategoryScopeToQuery($query, string $categoryCode)
    {
        $normalized = $this->normalizeCategoryCode($categoryCode);
        if ($normalized === null) {
            return $query->whereRaw('1 = 0');
        }

        // id_linea en productos suele ser "01", "08", etc.; categories.code es "1", "8"
        return $query->whereRaw('CAST(id_linea AS UNSIGNED) = ?', [$normalized]);
    }

    /**
     * Normaliza códigos de categoría para comparar id_linea ("08") con code ("8").
     */
    private function normalizeCategoryCode(string $code): ?int
    {
        $code = trim($code);
        if ($code === '' || ! is_numeric($code)) {
            return null;
        }

        return (int) $code;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<Producto>  $query
     * @return \Illuminate\Database\Eloquent\Builder<Producto>
     */
    private function applyCatalogScopeToQuery($query, string $catalogId)
    {
        $catalogId = trim($catalogId);
        if ($catalogId === '') {
            return $query->whereRaw('1 = 0');
        }

        return $query->where('catalogoId', $catalogId);
    }
}
