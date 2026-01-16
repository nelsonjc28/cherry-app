<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateFileSize
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Verificar si hay archivos en la petición
        if ($request->hasFile('image') || $request->hasFile('file') || $request->hasFile('pdfs')) {
            $files = $request->allFiles();
            
            foreach ($files as $file) {
                if (is_array($file)) {
                    foreach ($file as $singleFile) {
                        if ($singleFile && $singleFile->isValid()) {
                            $sizeInMB = $singleFile->getSize() / (1024 * 1024);
                            
                            if ($sizeInMB > 100) { // 100MB límite
                                return response()->json([
                                    'success' => false,
                                    'message' => 'El archivo excede el tamaño máximo permitido (100MB)',
                                    'file_size' => round($sizeInMB, 2) . 'MB',
                                    'max_size' => '100MB'
                                ], 422);
                            }
                        }
                    }
                } else {
                    if ($file && $file->isValid()) {
                        $sizeInMB = $file->getSize() / (1024 * 1024);
                        
                        if ($sizeInMB > 100) { // 100MB límite
                            return response()->json([
                                'success' => false,
                                'message' => 'El archivo excede el tamaño máximo permitido (100MB)',
                                'file_size' => round($sizeInMB, 2) . 'MB',
                                'max_size' => '100MB'
                            ], 422);
                        }
                    }
                }
            }
        }

        return $next($request);
    }
}
