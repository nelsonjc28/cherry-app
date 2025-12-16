<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ProductImageController extends Controller
{
    /**
     * Servir imagen de producto con caché local
     * Descarga desde S3 si no está en caché local
     * 
     * @param string $productId ID del producto
     * @param int $imageNumber Número de imagen (default: 1)
     * @return \Illuminate\Http\Response
     */
    public function serveImage($productId, $imageNumber = 1)
    {
        try {
            // Validar parámetros
            $productId = trim((string) $productId);
            $imageNumber = (int) $imageNumber;
            
            if (empty($productId) || $imageNumber < 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parámetros inválidos'
                ], 400);
            }
            
            // Ruta local donde se guardará la imagen
            $localPath = "product-images/{$productId}/{$productId}_{$imageNumber}.jpg";
            $fullLocalPath = storage_path("app/public/{$localPath}");
            
            // Verificar si la imagen ya está en caché local
            if (Storage::disk('public')->exists($localPath)) {
                $filePath = Storage::disk('public')->path($localPath);
                return response()->file($filePath, [
                    'Content-Type' => 'image/jpeg',
                    'Cache-Control' => 'public, max-age=31536000', // Cache por 1 año
                ]);
            }
            
            // Si no está en caché, descargar desde S3
            $s3Url = "https://cherry-fotos.s3.amazonaws.com/shopify/{$productId}/{$productId}_{$imageNumber}.jpg";
            
            Log::info('Descargando imagen desde S3', [
                'product_id' => $productId,
                'image_number' => $imageNumber,
                's3_url' => $s3Url
            ]);
            
            // Descargar imagen desde S3
            $response = Http::timeout(10)->get($s3Url);
            
            if (!$response->successful()) {
                // Si no existe, devolver placeholder
                $placeholderPath = public_path('images/placeholder-product.png');
                if (file_exists($placeholderPath)) {
                    return response()->file($placeholderPath, [
                        'Content-Type' => 'image/png',
                    ]);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Imagen no encontrada'
                ], 404);
            }
            
            // Crear directorio si no existe
            $directory = dirname($fullLocalPath);
            if (!file_exists($directory)) {
                mkdir($directory, 0755, true);
            }
            
            // Guardar imagen en caché local
            Storage::disk('public')->put($localPath, $response->body());
            
            Log::info('Imagen guardada en caché local', [
                'product_id' => $productId,
                'image_number' => $imageNumber,
                'local_path' => $localPath
            ]);
            
            // Servir la imagen
            return response($response->body(), 200)
                ->header('Content-Type', 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=31536000');
                
        } catch (\Exception $e) {
            Log::error('Error al servir imagen de producto', [
                'product_id' => $productId ?? 'N/A',
                'image_number' => $imageNumber ?? 'N/A',
                'error' => $e->getMessage()
            ]);
            
            // Devolver placeholder en caso de error
            $placeholderPath = public_path('images/placeholder-product.png');
            if (file_exists($placeholderPath)) {
                return response()->file($placeholderPath, [
                    'Content-Type' => 'image/png',
                ]);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener imagen'
            ], 500);
        }
    }
    
    /**
     * Obtener múltiples imágenes de un producto
     * Retorna URLs del servidor local para compartir
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProductImages(Request $request)
    {
        try {
            $productId = $request->input('product_id');
            $maxImages = (int) ($request->input('max_images', 12));
            
            if (empty($productId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'product_id es requerido'
                ], 400);
            }
            
            $productId = trim((string) $productId);
            $imageUrls = [];
            
            // Generar URLs del servidor local
            for ($i = 1; $i <= $maxImages; $i++) {
                $imageUrls[] = url("/api/product-images/{$productId}/{$i}");
            }
            
            return response()->json([
                'success' => true,
                'product_id' => $productId,
                'images' => $imageUrls,
                'base_url' => url('/api/product-images')
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error al obtener URLs de imágenes', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener imágenes'
            ], 500);
        }
    }
}
