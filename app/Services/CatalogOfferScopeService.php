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
        $scopes = $this->resolveScopeConfig($offer)['scopes'];

        return ! (count($scopes) === 1 && $scopes[0] === self::SCOPE_PRODUCTS);
    }

    /**
     * @return array{scopes: list<string>, category_codes: list<string>, catalog_ids: list<string>}
     */
    public function resolveScopeConfig(CatalogOffer $offer): array
    {
        $scopes = $offer->target_scopes;
        if (is_array($scopes) && $scopes !== []) {
            $normalizedScopes = $this->normalizeScopeList($scopes);

            return [
                'scopes' => $normalizedScopes,
                'category_codes' => $this->normalizeStringList($offer->target_category_codes ?? []),
                'catalog_ids' => $this->normalizeStringList($offer->target_catalog_ids ?? []),
            ];
        }

        $legacy = $this->normalizeScope($offer->target_scope);
        $categoryCodes = $offer->target_category_code
            ? [trim((string) $offer->target_category_code)]
            : [];
        $catalogIds = $offer->target_catalog_id
            ? [trim((string) $offer->target_catalog_id)]
            : [];

        return [
            'scopes' => [$legacy],
            'category_codes' => $this->normalizeStringList($categoryCodes),
            'catalog_ids' => $this->normalizeStringList($catalogIds),
        ];
    }

    public function productMatchesOffer(CatalogOffer $offer, Producto $producto): bool
    {
        return $this->productMatchesOfferWithCache($offer, $producto, []);
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
        $config = $this->resolveScopeConfig($offer);
        $ids = [];

        foreach ($config['scopes'] as $scope) {
            $ids = array_merge($ids, $this->resolveProductIdsForScope($offer, $scope, $config, $limit));
        }

        return $this->filterOutProximamenteProductIds(
            array_values(array_unique(array_map('strval', $ids)))
        );
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

        $config = $this->resolveScopeConfig($offer);

        foreach ($config['scopes'] as $scope) {
            if ($scope === self::SCOPE_PRODUCTS) {
                if (($explicitProductIdsByOffer[$offer->id] ?? [])[(string) $producto->id] ?? false) {
                    return true;
                }

                continue;
            }

            if ($this->productMatchesDynamicScope($producto, $scope, $config)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array{scopes: list<string>, category_codes: list<string>, catalog_ids: list<string>}  $config
     */
    private function productMatchesDynamicScope(Producto $producto, string $scope, array $config): bool
    {
        return match ($scope) {
            self::SCOPE_CATEGORY => $this->matchesAnyCategory($producto, $config['category_codes']),
            self::SCOPE_CATALOG => $this->matchesAnyCatalog($producto, $config['catalog_ids']),
            self::SCOPE_NEW => $this->matchesNew($producto),
            self::SCOPE_REBAJAS => $this->matchesRebajas($producto),
            default => false,
        };
    }

    /**
     * @param  array{scopes: list<string>, category_codes: list<string>, catalog_ids: list<string>}  $config
     * @return list<string>
     */
    private function resolveProductIdsForScope(CatalogOffer $offer, string $scope, array $config, int $limit): array
    {
        if ($scope === self::SCOPE_PRODUCTS) {
            return $offer->offerProducts()
                ->pluck('product_id')
                ->map(fn ($id) => (string) $id)
                ->all();
        }

        $query = Producto::query()->select('productos.id');
        Producto::applyFechaAgotadoVisibilityToProductosQuery($query->toBase());

        return match ($scope) {
            self::SCOPE_CATEGORY => $this->applyCategoriesScopeToQuery($query, $config['category_codes'])
                ->limit($limit)
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->all(),
            self::SCOPE_CATALOG => $this->applyCatalogsScopeToQuery($query, $config['catalog_ids'])
                ->limit($limit)
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->all(),
            self::SCOPE_NEW => $this->resolveNewProductIds($limit),
            self::SCOPE_REBAJAS => $query->where('desc_promo', '>', 0)
                ->limit($limit)
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->all(),
            default => [],
        };
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
            ->filter(function (CatalogOffer $offer) {
                $scopes = $this->resolveScopeConfig($offer)['scopes'];

                return in_array(self::SCOPE_PRODUCTS, $scopes, true);
            })
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
     * @param  list<string>  $scopes
     * @return list<string>
     */
    private function normalizeScopeList(array $scopes): array
    {
        $normalized = [];
        foreach ($scopes as $scope) {
            $value = $this->normalizeScope($scope);
            if (! in_array($value, $normalized, true)) {
                $normalized[] = $value;
            }
        }

        return $normalized;
    }

    /**
     * @param  mixed  $values
     * @return list<string>
     */
    private function normalizeStringList($values): array
    {
        if (! is_array($values)) {
            return [];
        }

        $result = [];
        foreach ($values as $value) {
            $trimmed = trim((string) $value);
            if ($trimmed !== '' && ! in_array($trimmed, $result, true)) {
                $result[] = $trimmed;
            }
        }

        return $result;
    }

    private function normalizeScope(mixed $scope): string
    {
        $scope = is_string($scope) ? strtolower(trim($scope)) : self::SCOPE_PRODUCTS;

        return in_array($scope, self::allScopes(), true) ? $scope : self::SCOPE_PRODUCTS;
    }

    /**
     * @param  list<string>  $categoryCodes
     */
    private function matchesAnyCategory(Producto $producto, array $categoryCodes): bool
    {
        foreach ($categoryCodes as $categoryCode) {
            if ($this->matchesCategory($producto, $categoryCode)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<string>  $catalogIds
     */
    private function matchesAnyCatalog(Producto $producto, array $catalogIds): bool
    {
        foreach ($catalogIds as $catalogId) {
            if ($this->matchesCatalog($producto, $catalogId)) {
                return true;
            }
        }

        return false;
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
     * @param  list<string>  $categoryCodes
     * @return \Illuminate\Database\Eloquent\Builder<Producto>
     */
    private function applyCategoriesScopeToQuery($query, array $categoryCodes)
    {
        $normalizedCodes = [];
        foreach ($categoryCodes as $categoryCode) {
            $normalized = $this->normalizeCategoryCode($categoryCode);
            if ($normalized !== null) {
                $normalizedCodes[] = $normalized;
            }
        }

        if ($normalizedCodes === []) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function ($inner) use ($normalizedCodes) {
            foreach ($normalizedCodes as $normalized) {
                $inner->orWhereRaw('CAST(id_linea AS UNSIGNED) = ?', [$normalized]);
            }
        });
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<Producto>  $query
     * @param  list<string>  $catalogIds
     * @return \Illuminate\Database\Eloquent\Builder<Producto>
     */
    private function applyCatalogsScopeToQuery($query, array $catalogIds)
    {
        $catalogIds = $this->normalizeStringList($catalogIds);
        if ($catalogIds === []) {
            return $query->whereRaw('1 = 0');
        }

        return $query->whereIn('catalogoId', $catalogIds);
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
}
