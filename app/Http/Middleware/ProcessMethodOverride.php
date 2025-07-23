<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProcessMethodOverride
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
        // Procesar _method para simular otros métodos HTTP
        if ($request->has('_method')) {
            $method = strtoupper($request->input('_method'));
            Log::info('Method override detected:', [
                'original_method' => $request->method(),
                'new_method' => $method,
                '_method_value' => $request->input('_method')
            ]);
            
            // Cambiar el método de la request
            $request->setMethod($method);
        }

        return $next($request);
    }
} 