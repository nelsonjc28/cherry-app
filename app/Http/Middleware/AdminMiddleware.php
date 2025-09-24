<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // Verificar que el usuario esté autenticado
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado'
            ], 401);
        }

        $user = Auth::user();

        // Verificar que el usuario tenga rol de admin
        if (!$user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Acceso denegado. Se requieren permisos de administrador.'
            ], 403);
        }

        return $next($request);
    }
}