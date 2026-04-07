<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Sirve imágenes de correo por URL /mail-assets/{archivo}.
 * Busca primero en public/mail-assets y, si no existe, en storage/app/public/mail-assets (subidas antiguas).
 */
class MailPublicAssetController extends Controller
{
    public function show(string $filename): BinaryFileResponse
    {
        $filename = basename($filename);
        if ($filename === '' || $filename === '.' || $filename === '..') {
            abort(404);
        }
        if (! preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]*$/', $filename)) {
            abort(404);
        }

        $absolute = $this->resolveAbsolutePath($filename);
        if ($absolute === null) {
            abort(404);
        }

        $headers = [
            'Cache-Control' => 'public, max-age=86400',
        ];
        $mime = File::mimeType($absolute);
        if (is_string($mime) && $mime !== '') {
            $headers['Content-Type'] = $mime;
        }

        return response()->file($absolute, $headers);
    }

    /**
     * @return ?string Ruta absoluta legible
     */
    protected function resolveAbsolutePath(string $filename): ?string
    {
        $candidates = [
            public_path('mail-assets/'.$filename),
            storage_path('app/public/mail-assets/'.$filename),
        ];

        foreach ($candidates as $path) {
            if (is_file($path) && is_readable($path)) {
                return $path;
            }
        }

        return null;
    }
}
