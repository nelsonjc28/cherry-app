<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Producto;
use Illuminate\Database\Eloquent\Builder;

class RespondIoProductSearchService
{
    private const RESULT_LIMIT = 5;

    /**
     * @param  array<string, mixed>  $input
     * @return list<array<string, mixed>>
     */
    public function search(array $input): array
    {
        $nombreParam = trim((string) ($input['q'] ?? $input['nombre'] ?? ''));
        $parsed = $this->parseNaturalLanguageQuery($nombreParam);
        $searchText = $parsed['text'];

        $precioMax = $this->resolvePrecioMax($input, $parsed['precio_max']);
        $categoria = trim((string) ($input['categoria'] ?? $input['linea'] ?? ''));
        $catalogo = trim((string) ($input['catalogo'] ?? ''));
        $color = trim((string) ($input['color'] ?? ''));
        $talla = trim((string) ($input['talla'] ?? ''));
        $disponibilidad = $this->parseBool($input['disponibilidad'] ?? null);

        if (! $this->hasSearchCriteria($searchText, $categoria, $catalogo, $color, $talla, $precioMax, $disponibilidad)) {
            return [];
        }

        $query = Producto::query()->with(['detalles']);
        Producto::applyFechaAgotadoVisibilityToProductosQuery($query->toBase());

        if ($searchText !== '') {
            $this->applyFlexibleTextSearch($query, $searchText);
        }

        if ($categoria !== '') {
            $lineaCodes = $this->resolveLineaCodes($categoria);
            if ($lineaCodes === []) {
                return [];
            }
            $query->whereIn('id_linea', $lineaCodes);
        }

        if ($catalogo !== '') {
            $query->where('catalogoId', $catalogo);
        }

        if ($precioMax !== null && $precioMax > 0) {
            $query->where('precio1', '<=', $precioMax);
        }

        if ($color !== '' || $talla !== '' || $disponibilidad) {
            $query->whereHas('detalles', function (Builder $detalleQuery) use ($color, $talla, $disponibilidad) {
                if ($color !== '') {
                    $this->applyFlexibleColumnFilter($detalleQuery, 'nombreColor', $color);
                }
                if ($talla !== '') {
                    $this->applyFlexibleColumnFilter($detalleQuery, 'detalle', $talla);
                }
                if ($disponibilidad) {
                    $detalleQuery->where('inventario_d', '>', 0);
                }
            });
        }

        $productos = $query
            ->orderBy('precio1')
            ->limit(self::RESULT_LIMIT * 4)
            ->get()
            ->sortByDesc(fn (Producto $producto) => $producto->computeTotalInventoryQuantity())
            ->take(self::RESULT_LIMIT)
            ->values();

        return $productos
            ->map(fn (Producto $producto) => $this->formatProduct($producto, $color, $talla))
            ->all();
    }

    /**
     * @return array{text: string, precio_max: float|null}
     */
    public function parseNaturalLanguageQuery(string $query): array
    {
        $text = trim($query);
        $precioMax = null;

        if ($text === '') {
            return ['text' => '', 'precio_max' => null];
        }

        if (preg_match_all('/\b(\d{1,3}(?:[,\s]?\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\b/u', $text, $matches)) {
            $lastNumber = (string) end($matches[1]);
            $normalized = (float) str_replace([',', ' '], '', $lastNumber);

            if ($normalized > 0) {
                $precioMax = $normalized;
                $text = trim((string) preg_replace(
                    '/\b(\d{1,3}(?:[,\s]?\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:pesos|mxn|dll|usd|\$)?\b/ui',
                    ' ',
                    $text
                ));
                $text = trim((string) preg_replace('/\s+/u', ' ', $text));
            }
        }

        return [
            'text' => $text,
            'precio_max' => $precioMax,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function resolvePrecioMax(array $input, ?float $fromQuery): ?float
    {
        if (isset($input['precio_max']) && $input['precio_max'] !== '' && $input['precio_max'] !== null) {
            $explicit = (float) $input['precio_max'];

            return $explicit > 0 ? $explicit : null;
        }

        return ($fromQuery !== null && $fromQuery > 0) ? $fromQuery : null;
    }

    private function hasSearchCriteria(
        string $searchText,
        string $categoria,
        string $catalogo,
        string $color,
        string $talla,
        ?float $precioMax,
        bool $disponibilidad
    ): bool {
        return $searchText !== ''
            || $categoria !== ''
            || $catalogo !== ''
            || $color !== ''
            || $talla !== ''
            || ($precioMax !== null && $precioMax > 0)
            || $disponibilidad;
    }

    /**
     * @return list<string>
     */
    private function resolveLineaCodes(string $categoria): array
    {
        $codes = [];

        if (Producto::query()->where('id_linea', $categoria)->exists()) {
            $codes[] = $categoria;
        }

        $like = '%'.mb_strtolower($categoria, 'UTF-8').'%';
        $fromCategories = Category::query()
            ->where(function (Builder $q) use ($categoria, $like) {
                $q->where('code', $categoria)
                    ->orWhere('slug', $categoria)
                    ->orWhereRaw('LOWER(name) LIKE ?', [$like]);
            })
            ->pluck('code')
            ->filter(fn ($code) => is_string($code) && trim($code) !== '')
            ->all();

        $codes = array_merge($codes, $fromCategories);

        if ($codes === []) {
            $fromProductLines = Producto::query()
                ->whereRaw('LOWER(id_linea) LIKE ?', [$like])
                ->distinct()
                ->pluck('id_linea')
                ->filter(fn ($linea) => is_string($linea) && trim($linea) !== '')
                ->all();
            $codes = array_merge($codes, $fromProductLines);
        }

        return array_values(array_unique($codes));
    }

    /**
     * @return array<string, mixed>
     */
    private function formatProduct(Producto $producto, string $colorFilter, string $tallaFilter): array
    {
        $detalles = $producto->detalles;

        if ($colorFilter !== '') {
            $detalles = $detalles->filter(
                fn ($detalle) => $this->flexibleContains((string) ($detalle->nombreColor ?? ''), $colorFilter)
            );
        }

        if ($tallaFilter !== '') {
            $detalles = $detalles->filter(
                fn ($detalle) => $this->flexibleContains((string) ($detalle->detalle ?? ''), $tallaFilter)
            );
        }

        $stockTotal = (int) round($producto->computeTotalInventoryQuantity());

        return [
            'id' => (string) $producto->id,
            'descripcion' => (string) ($producto->descripcion ?? ''),
            'precio' => round((float) ($producto->precio1 ?? 0), 2),
            'disponible' => $stockTotal > 0,
            'stock_total' => $stockTotal,
            'colores_disponibles' => $this->formatVariantList($detalles, 'nombreColor'),
            'tallas_disponibles' => $this->formatVariantList($detalles, 'detalle'),
            'url_imagen' => $this->resolveImageUrl($producto),
        ];
    }

    private function formatVariantList($detalles, string $field): string
    {
        return $detalles
            ->filter(fn ($detalle) => Producto::effectiveDetailInventoryContribution($detalle->inventario_d ?? null) > 0)
            ->pluck($field)
            ->filter(fn ($value) => is_string($value) && trim($value) !== '')
            ->map(fn ($value) => trim((string) $value))
            ->unique()
            ->values()
            ->implode(', ');
    }

    private function resolveImageUrl(Producto $producto): string
    {
        $imagen = trim((string) ($producto->imagen ?? ''));
        if ($imagen !== '' && (str_starts_with($imagen, 'http://') || str_starts_with($imagen, 'https://'))) {
            return $imagen;
        }

        $productId = trim((string) $producto->id);

        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productId}/{$productId}_1.jpg";
    }

    private function parseBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if ($value === null || $value === '') {
            return false;
        }

        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'si', 'sí', 'on'], true);
    }

    /**
     * Búsqueda por palabras con tolerancia singular/plural (español).
     * Ej.: "camisas" también encuentra "camisa"; "pantalon" encuentra "pantalones".
     */
    private function applyFlexibleTextSearch(Builder $query, string $searchText): void
    {
        $words = preg_split('/\s+/u', mb_strtolower(trim($searchText), 'UTF-8'), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if ($words === []) {
            return;
        }

        $query->where(function (Builder $outer) use ($words) {
            foreach ($words as $word) {
                $outer->where(function (Builder $inner) use ($word) {
                    $this->applyFlexibleColumnFilter($inner, 'descripcion', $word);
                    $inner->orWhere(function (Builder $marcaQuery) use ($word) {
                        $this->applyFlexibleColumnFilter($marcaQuery, 'marca', $word);
                    });
                });
            }
        });
    }

    private function applyFlexibleColumnFilter(Builder $query, string $column, string $term): void
    {
        $variants = $this->expandWordVariants($term);
        if ($variants === []) {
            return;
        }

        $query->where(function (Builder $variantQuery) use ($column, $variants) {
            foreach ($variants as $variant) {
                $variantQuery->orWhereRaw('LOWER('.$column.') LIKE ?', ['%'.$variant.'%']);
            }
        });
    }

    private function flexibleContains(string $haystack, string $needle): bool
    {
        $haystack = mb_strtolower($haystack, 'UTF-8');
        foreach ($this->expandWordVariants($needle) as $variant) {
            if (mb_stripos($haystack, $variant, 0, 'UTF-8') !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Genera variantes singular/plural comunes en español para una palabra.
     *
     * @return list<string>
     */
    private function expandWordVariants(string $word): array
    {
        $word = mb_strtolower(trim($word), 'UTF-8');
        if ($word === '') {
            return [];
        }

        if (mb_strlen($word) < 2) {
            return [$word];
        }

        $variants = [$word];

        if (mb_substr($word, -2) === 'es' && mb_strlen($word) > 3) {
            $variants[] = mb_substr($word, 0, -2);
        }

        if (mb_substr($word, -1) === 's' && mb_substr($word, -2) !== 'ss') {
            $variants[] = mb_substr($word, 0, -1);
        }

        $lastChar = mb_substr($word, -1);
        if (preg_match('/[aeiouáéíóúü]/u', $lastChar)) {
            $variants[] = $word.'s';
        } elseif ($lastChar !== 's') {
            $variants[] = $word.'es';
        }

        if (mb_substr($word, -2) === 'ces' && mb_strlen($word) > 3) {
            $variants[] = mb_substr($word, 0, -3).'z';
        }

        if (mb_substr($word, -1) === 'z') {
            $variants[] = $word.'ces';
        }

        $variants = array_values(array_unique(array_filter(
            $variants,
            static fn (string $variant): bool => mb_strlen($variant) >= 2
        )));

        return $variants !== [] ? $variants : [$word];
    }
}
