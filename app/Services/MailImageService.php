<?php

namespace App\Services;

use App\Models\MailConfig;

/**
 * URLs absolutas de banners/cabeceras para correos (mail_configs + mail-assets).
 */
class MailImageService
{
    /**
     * URL absoluta del banner para un tipo de correo. Si no hay imagen en BD o el archivo no existe, usa respaldo.
     */
    public static function bannerAbsoluteUrl(string $mailType): string
    {
        $path = MailConfig::query()->where('mail_type', $mailType)->value('image_path');
        if (is_string($path) && $path !== '' && self::publicMailAssetFileExists($path)) {
            return self::publicAssetAbsoluteUrl($path);
        }

        return match ($mailType) {
            MailConfig::TYPE_ORDER_CONFIRMATION => self::fallbackOrderConfirmationHero(),
            default => self::defaultBannerUrl(),
        };
    }

    public static function defaultBannerUrl(): string
    {
        return rtrim((string) config('app.url'), '/').'/images/welcome-default.jpg';
    }

    protected static function fallbackOrderConfirmationHero(): string
    {
        $configured = config('cherry.mail_order_confirmation_hero_url');
        if (is_string($configured) && trim($configured) !== '') {
            return trim($configured);
        }

        return self::defaultBannerUrl();
    }

    /**
     * Ruta solo pathname, misma en navegador y correo (el host lo pone el cliente o APP_URL).
     */
    public static function mailAssetWebPathFromDbPath(string $pathRelative): string
    {
        $path = ltrim(str_replace('\\', '/', $pathRelative), '/');
        if (! str_starts_with($path, 'mail-assets/')) {
            return '/'.ltrim($path, '/');
        }

        return '/mail-assets/'.basename($path);
    }

    /**
     * URL absoluta para correos (usa APP_URL / asset).
     */
    public static function publicAssetAbsoluteUrl(string $pathRelativeToPublic): string
    {
        $path = ltrim(str_replace('\\', '/', $pathRelativeToPublic), '/');
        if (str_starts_with($path, 'mail-assets/')) {
            return asset('mail-assets/'.basename($path));
        }

        return rtrim((string) config('app.url'), '/').'/'.$path;
    }

    /** @deprecated usar publicAssetAbsoluteUrl */
    public static function storageAbsoluteUrl(string $pathRelativeToPublic): string
    {
        return self::publicAssetAbsoluteUrl($pathRelativeToPublic);
    }

    protected static function publicMailAssetFileExists(string $pathRelativeToPublic): bool
    {
        $path = ltrim(str_replace('\\', '/', $pathRelativeToPublic), '/');
        if ($path === '' || str_contains($path, '..') || ! str_starts_with($path, 'mail-assets/')) {
            return false;
        }

        $filename = basename($path);
        $candidates = [
            public_path('mail-assets/'.$filename),
            storage_path('app/public/mail-assets/'.$filename),
        ];

        foreach ($candidates as $full) {
            if (is_file($full) && is_readable($full)) {
                return true;
            }
        }

        return false;
    }
}
