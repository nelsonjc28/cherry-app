<?php

namespace App\Services;

use App\Models\CatalogProduct;
use App\Models\CategoryProduct;
use App\Models\Detalle;
use App\Models\Favorite;
use App\Models\Producto;
use App\Models\Rating;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ProductSyncPruneService
{
    /**
     * @param  array<int, array<string, mixed>>  $externalProducts
     * @return array{
     *     productos_eliminados: int,
     *     detalles_eliminados: int,
     *     referencias_limpiadas: int,
     *     omitido: bool,
     *     motivo_omision: ?string,
     *     ids_productos_eliminados: list<string>
     * }
     */
    public function pruneAfterSync(array $externalProducts): array
    {
        $empty = [
            'productos_eliminados' => 0,
            'detalles_eliminados' => 0,
            'referencias_limpiadas' => 0,
            'omitido' => false,
            'motivo_omision' => null,
            'ids_productos_eliminados' => [],
        ];

        if (! config('cherry.sync_prune_orphans', true)) {
            return array_merge($empty, [
                'omitido' => true,
                'motivo_omision' => 'CHERRY_SYNC_PRUNE_ORPHANS desactivado',
            ]);
        }

        $apiProductIds = $this->extractApiProductIds($externalProducts);
        $localCount = Producto::query()->count();
        $apiCount = count($apiProductIds);

        if ($apiCount === 0) {
            Log::warning('ProductSyncPrune: omitido — la API no devolvió productos válidos');

            return array_merge($empty, [
                'omitido' => true,
                'motivo_omision' => 'API sin productos válidos',
            ]);
        }

        $minRatio = (float) config('cherry.sync_prune_min_api_ratio', 0.8);
        if ($localCount > 0 && ($apiCount / $localCount) < $minRatio) {
            Log::warning('ProductSyncPrune: omitido — respuesta de API sospechosamente pequeña', [
                'api_count' => $apiCount,
                'local_count' => $localCount,
                'min_ratio' => $minRatio,
            ]);

            return array_merge($empty, [
                'omitido' => true,
                'motivo_omision' => "API devolvió {$apiCount} productos vs {$localCount} locales (umbral {$minRatio})",
            ]);
        }

        $detallesEliminados = $this->pruneOrphanDetalles($externalProducts);
        $orphanProductIds = Producto::query()
            ->pluck('id')
            ->map(fn ($id) => $this->normalizeId($id))
            ->filter()
            ->diff($apiProductIds)
            ->values()
            ->all();

        if ($orphanProductIds === []) {
            return array_merge($empty, [
                'detalles_eliminados' => $detallesEliminados,
            ]);
        }

        $referencias = $this->deleteProductReferences($orphanProductIds);

        $productosEliminados = Producto::query()
            ->whereIn('id', $orphanProductIds)
            ->delete();

        Log::info('ProductSyncPrune: productos huérfanos eliminados (hard delete)', [
            'count' => $productosEliminados,
            'ids' => $orphanProductIds,
            'detalles_huérfanos' => $detallesEliminados,
            'referencias' => $referencias,
        ]);

        return [
            'productos_eliminados' => (int) $productosEliminados,
            'detalles_eliminados' => $detallesEliminados,
            'referencias_limpiadas' => $referencias,
            'omitido' => false,
            'motivo_omision' => null,
            'ids_productos_eliminados' => $orphanProductIds,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $externalProducts
     * @return list<string>
     */
    public function extractApiProductIds(array $externalProducts): array
    {
        $ids = [];
        foreach ($externalProducts as $product) {
            if (! is_array($product) || ! isset($product['id_articulo'])) {
                continue;
            }
            $id = $this->normalizeId($product['id_articulo']);
            if ($id !== '') {
                $ids[$id] = true;
            }
        }

        return array_keys($ids);
    }

    /**
     * @param  array<int, array<string, mixed>>  $externalProducts
     */
    protected function pruneOrphanDetalles(array $externalProducts): int
    {
        $deleted = 0;

        foreach ($externalProducts as $product) {
            if (! is_array($product) || empty($product['id_articulo'])) {
                continue;
            }

            $productId = $this->normalizeId($product['id_articulo']);
            if ($productId === '' || ! Producto::query()->whereKey($productId)->exists()) {
                continue;
            }

            $apiDetalleIds = [];
            foreach ($product['detalles'] ?? [] as $detalle) {
                if (! is_array($detalle) || ! isset($detalle['id_artd'])) {
                    continue;
                }
                $detalleId = $this->normalizeId($detalle['id_artd']);
                if ($detalleId !== '') {
                    $apiDetalleIds[$detalleId] = true;
                }
            }

            $query = Detalle::query()->where('producto_id', $productId);
            if ($apiDetalleIds !== []) {
                $query->whereNotIn('id', array_keys($apiDetalleIds));
            }

            $deleted += $query->delete();
        }

        return $deleted;
    }

    /**
     * @param  list<string>  $productIds
     */
    protected function deleteProductReferences(array $productIds): int
    {
        $total = 0;

        $total += CategoryProduct::query()
            ->whereIn('external_product_id', $productIds)
            ->delete();

        $total += CatalogProduct::query()
            ->whereIn('external_product_id', $productIds)
            ->delete();

        $total += Favorite::query()
            ->whereIn('product_id', $productIds)
            ->delete();

        $total += DB::table('recent_products')
            ->whereIn('product_id', $productIds)
            ->delete();

        $total += Rating::query()
            ->whereIn('product_id', $productIds)
            ->delete();

        if (Schema::hasTable('catalog_offer_products')) {
            $total += DB::table('catalog_offer_products')
                ->whereIn('product_id', $productIds)
                ->delete();
        }

        return $total;
    }

    protected function normalizeId(mixed $id): string
    {
        if ($id === null) {
            return '';
        }

        return trim((string) $id);
    }
}
