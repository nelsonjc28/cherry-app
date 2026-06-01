<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MailConfig;
use App\Services\MailImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class MailSettingsController extends Controller
{
    /**
     * @var array<string, array{
     *   label: string,
     *   size_hint: string,
     *   template: string,
     *   template_label: string,
     *   template_description?: string,
     *   area_label: string,
     *   area_description: string,
     *   sort?: int
     * }>
     */
    protected array $typeMeta = [
        MailConfig::TYPE_WELCOME_HERO => [
            'label' => 'Hero superior',
            'template' => 'welcome',
            'template_label' => 'Correo de bienvenida',
            'area_label' => 'Hero superior — Lookbook de modelos',
            'area_description' => 'Debajo del logo Cherry. Bloque visual principal con las fotos de modelos (collage o imagen ancho completo).',
            'size_hint' => '600 × 400 px (3:2). Collage de 3 modelos: tres fotos de 200 × 400 px sin espacio entre ellas.',
            'sort' => 1,
        ],
        MailConfig::TYPE_WELCOME_PROMO => [
            'label' => 'Banner promociones',
            'template' => 'welcome',
            'template_label' => 'Correo de bienvenida',
            'area_label' => 'Banner inferior — Promociones y novedades',
            'area_description' => 'Sobre el pie negro del correo, después de los iconos de redes sociales.',
            'size_hint' => '600 × 200 px (3:1). Puedes incluir el texto en la imagen o dejar el texto del correo debajo.',
            'sort' => 2,
        ],
        MailConfig::TYPE_ORDER_CONFIRMATION => [
            'label' => 'Hero confirmación',
            'template' => 'order_confirmation',
            'template_label' => 'Confirmación de pedido',
            'template_description' => 'Se envía al completar una compra.',
            'area_label' => 'Cabecera — Imagen principal',
            'area_description' => 'Parte superior del correo, debajo del encabezado.',
            'size_hint' => '600 × 320 px recomendado.',
            'sort' => 1,
        ],
        MailConfig::TYPE_ABANDONED_CART_HERO => [
            'label' => 'Hero superior',
            'template' => 'abandoned_cart',
            'template_label' => 'Carrito abandonado',
            'template_description' => 'Recordatorio automático cuando el carrito lleva ítems sin comprar (cron diario).',
            'area_label' => 'Hero — Debajo del logo',
            'area_description' => 'Banner amarillo con el mensaje «¡Ups! Parece que dejaste algo en tu carrito.» Puedes incluir el texto en la imagen.',
            'size_hint' => '600 × 320 px recomendado (ancho completo).',
            'sort' => 1,
        ],
        MailConfig::TYPE_ABANDONED_CART_PROMO => [
            'label' => 'Banner promociones',
            'template' => 'abandoned_cart',
            'template_label' => 'Carrito abandonado',
            'area_label' => 'Banner inferior — Promociones y novedades',
            'area_description' => 'Sobre el pie negro del correo, después de redes sociales.',
            'size_hint' => '600 × 200 px (3:1). Puedes incluir el texto en la imagen o dejar el texto del correo debajo.',
            'sort' => 2,
        ],
        MailConfig::TYPE_ORDER_STATUS => [
            'label' => 'Cabecera estado',
            'template' => 'order_status',
            'template_label' => 'Actualización de estado del pedido',
            'template_description' => 'Se envía cuando cambia el estado de un pedido.',
            'area_label' => 'Cabecera del correo',
            'area_description' => 'Imagen superior que acompaña el mensaje de estado.',
            'size_hint' => '600 × 200 px recomendado.',
            'sort' => 1,
        ],
        MailConfig::TYPE_PRODUCT_AVAILABLE => [
            'label' => 'Banner producto',
            'template' => 'product_available',
            'template_label' => 'Producto disponible',
            'template_description' => 'Aviso cuando un producto vuelve a estar en stock.',
            'area_label' => 'Banner inferior',
            'area_description' => 'Franja visual al final del cuerpo del correo.',
            'size_hint' => '600 × 200 px recomendado.',
            'sort' => 1,
        ],
    ];

    public function index(): JsonResponse
    {
        $items = [];
        foreach (MailConfig::allTypes() as $type) {
            $row = MailConfig::query()->where('mail_type', $type)->first();
            $path = $row?->image_path;
            $hasFile = is_string($path) && $path !== '' && $this->mailAssetFileOk($path);
            $meta = $this->typeMeta[$type] ?? [
                'label' => $type,
                'size_hint' => '',
                'template' => $type,
                'template_label' => $type,
                'area_label' => $type,
                'area_description' => '',
            ];
            $items[] = [
                'mail_type' => $type,
                'label' => $meta['label'],
                'size_hint' => $meta['size_hint'],
                'template' => $meta['template'],
                'template_label' => $meta['template_label'],
                'template_description' => $meta['template_description'] ?? '',
                'area_label' => $meta['area_label'],
                'area_description' => $meta['area_description'],
                'sort' => $meta['sort'] ?? 99,
                'image_path' => $hasFile ? $path : null,
                'image_url' => MailImageService::bannerAbsoluteUrl($type),
                /** Pathname para admin: mismo host/puerto que la pestaña (mail-assets o /images/…). */
                'image_preview_path' => MailImageService::bannerPreviewPath($type),
                'uses_uploaded' => $hasFile,
            ];
        }

        return response()->json([
            'success' => true,
            'configs' => $items,
            'templates' => $this->buildTemplates($items),
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    protected function buildTemplates(array $items): array
    {
        $byTemplate = [];
        foreach ($items as $item) {
            $templateId = (string) ($item['template'] ?? $item['mail_type']);
            if (! isset($byTemplate[$templateId])) {
                $byTemplate[$templateId] = [
                    'id' => $templateId,
                    'title' => $item['template_label'],
                    'description' => $item['template_description'] ?? '',
                    'slots' => [],
                ];
            }
            $byTemplate[$templateId]['slots'][] = $item;
        }

        $templates = array_values($byTemplate);
        foreach ($templates as &$template) {
            usort($template['slots'], static fn (array $a, array $b): int => ($a['sort'] ?? 99) <=> ($b['sort'] ?? 99));
            $template['slot_count'] = count($template['slots']);
            $template['custom_count'] = count(array_filter(
                $template['slots'],
                static fn (array $s): bool => ! empty($s['uses_uploaded'])
            ));
        }
        unset($template);

        return $templates;
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'mail_type' => ['required', 'string', Rule::in(MailConfig::allTypes())],
            'image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp,gif', 'max:5120'],
        ]);

        $mailType = $request->string('mail_type')->toString();
        $file = $request->file('image');

        $dir = public_path('mail-assets');
        if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo crear la carpeta public/mail-assets.',
            ], 500);
        }

        $existing = MailConfig::query()->where('mail_type', $mailType)->first();
        $oldPath = $existing?->image_path;
        if (is_string($oldPath) && $oldPath !== '') {
            $this->deletePublicMailAsset($oldPath);
        }

        $ext = strtolower((string) ($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg'));
        if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            $ext = 'jpg';
        }
        $name = Str::random(40).'.'.$ext;
        $file->move($dir, $name);
        $storedPath = 'mail-assets/'.$name;

        MailConfig::query()->updateOrCreate(
            ['mail_type' => $mailType],
            ['image_path' => $storedPath]
        );

        return response()->json([
            'success' => true,
            'message' => 'Imagen actualizada.',
            'mail_type' => $mailType,
            'image_path' => $storedPath,
            'image_url' => MailImageService::publicAssetAbsoluteUrl($storedPath),
            'image_preview_path' => MailImageService::mailAssetWebPathFromDbPath($storedPath),
            'uses_uploaded' => true,
        ]);
    }

    protected function mailAssetFileOk(string $path): bool
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');
        if ($path === '' || str_contains($path, '..') || ! str_starts_with($path, 'mail-assets/')) {
            return false;
        }

        $filename = basename($path);
        foreach ([public_path('mail-assets/'.$filename), storage_path('app/public/mail-assets/'.$filename)] as $full) {
            if (is_file($full) && is_readable($full)) {
                return true;
            }
        }

        return false;
    }

    protected function deletePublicMailAsset(string $pathRelative): void
    {
        $path = ltrim(str_replace('\\', '/', $pathRelative), '/');
        if (! str_starts_with($path, 'mail-assets/') || str_contains($path, '..')) {
            return;
        }
        $filename = basename($path);
        foreach ([public_path('mail-assets/'.$filename), storage_path('app/public/mail-assets/'.$filename)] as $full) {
            if (is_file($full)) {
                @unlink($full);
            }
        }
    }
}
