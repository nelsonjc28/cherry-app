<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Permite el acceso únicamente a usuarios con rol 'vendedor'.
 * Los administradores NO pasan por este middleware (deben usar AdminMiddleware).
 */
class VendorMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (! Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado',
            ], 401);
        }

        $user = Auth::user();

        if (! $user->relationLoaded('role')) {
            $user->load('role');
        }

        if (! $user || ! $user->role || $user->role->name !== 'vendedor') {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. Se requieren permisos de vendedor.',
            ], 403);
        }

        return $next($request);
    }
}