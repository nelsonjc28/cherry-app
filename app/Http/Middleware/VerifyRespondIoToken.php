<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyRespondIoToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('cherry.respondio_secret_token');
        if (! is_string($expected) || trim($expected) === '') {
            return response()->json([
                'error' => 'Webhook no configurado.',
            ], 401);
        }

        $authorization = (string) $request->header('Authorization', '');
        if (! preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
            return response()->json([
                'error' => 'Token no proporcionado.',
            ], 401);
        }

        $provided = trim($matches[1]);
        if (! hash_equals(trim($expected), $provided)) {
            return response()->json([
                'error' => 'Token inválido.',
            ], 401);
        }

        return $next($request);
    }
}
