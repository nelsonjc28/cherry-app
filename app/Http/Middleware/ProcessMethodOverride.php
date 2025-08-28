<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;


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

            
            // Cambiar el método de la request
            $request->setMethod($method);
        }

        return $next($request);
    }
} 