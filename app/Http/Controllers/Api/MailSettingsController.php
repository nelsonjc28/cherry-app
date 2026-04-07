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
    /** @var array<string, string> */
    protected array $typeLabels = [
        MailConfig::TYPE_WELCOME => 'WelcomeEmail — Bienvenida (hero y franja promocional)',
        MailConfig::TYPE_ORDER_CONFIRMATION => 'OrderConfirmationMail — Confirmación de pedido (hero)',
        MailConfig::TYPE_ABANDONED_CART => 'AbandonedCartEmail — Carrito abandonado (hero y promo)',
        MailConfig::TYPE_ORDER_STATUS => 'OrderStatusEmail — Actualización de estado (cabecera)',
        MailConfig::TYPE_PRODUCT_AVAILABLE => 'ProductAvailableEmail — Producto disponible (banner inferior)',
    ];

    public function index(): JsonResponse
    {
        $items = [];
        foreach (MailConfig::allTypes() as $type) {
            $row = MailConfig::query()->where('mail_type', $type)->first();
            $path = $row?->image_path;
            $hasFile = is_string($path) && $path !== '' && $this->mailAssetFileOk($path);
            $items[] = [
                'mail_type' => $type,
                'label' => $this->typeLabels[$type] ?? $type,
                'image_path' => $hasFile ? $path : null,
                'image_url' => MailImageService::bannerAbsoluteUrl($type),
                /** Misma ruta que el correo pero solo pathname: la vista previa usa el host de la pestaña (evita http/https distinto a APP_URL). */
                'image_preview_path' => $hasFile && is_string($path) ? MailImageService::mailAssetWebPathFromDbPath($path) : null,
                'uses_uploaded' => $hasFile,
            ];
        }

        return response()->json([
            'success' => true,
            'configs' => $items,
        ]);
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
