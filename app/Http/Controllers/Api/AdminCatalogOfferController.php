<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\CatalogOffer;
use App\Models\CatalogOfferProduct;
use App\Models\CatalogOfferUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class AdminCatalogOfferController extends Controller
{
    /**
     * Obtener información completa de un producto desde la API externa
     */
    private function getProductInfoFromApi(string $productId): array
    {
        try {
            // URL de la API externa Cherry (usar mismo formato que el frontend)
            $apiUrl = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';
            
            Log::info("🔍 Obteniendo producto desde API: {$productId}");
            
            // Probar con id_articulo (como en el frontend)
            $response = Http::withoutVerifying()->timeout(15)->get($apiUrl, [
                'id_articulo' => $productId
            ]);
            
            Log::info("📡 Respuesta API para {$productId}: " . $response->status());
            
            if ($response->successful()) {
                $data = $response->json();
                Log::info("📦 Datos recibidos para {$productId}: " . json_encode($data));
                
                // La API puede devolver un array directo o un objeto con productos
                $products = [];
                if (is_array($data) && !empty($data)) {
                    $products = $data;
                } elseif (isset($data['productos']) && !empty($data['productos'])) {
                    $products = $data['productos'];
                }
                
                if (!empty($products)) {
                    $product = $products[0];
                    $productInfo = [
                        'name' => $product['descripcion'] ?? $product['nombre'] ?? "Producto {$productId}",
                        'price' => floatval($product['precio1'] ?? $product['precio'] ?? 0),
                        'image' => $product['imagen'] ?? $product['image'] ?? null,
                        'description' => $product['descripcion'] ?? $product['nombre'] ?? null
                    ];
                    
                    Log::info("✅ Información extraída para {$productId}: " . json_encode($productInfo));
                    return $productInfo;
                }
            }
            
            // Si no funciona con id_articulo, probar con codigo
            Log::info("🔄 Probando con parámetro 'codigo' para {$productId}");
            $response = Http::withoutVerifying()->timeout(15)->get($apiUrl, [
                'codigo' => $productId
            ]);
            
            if ($response->successful()) {
                $data = $response->json();
                Log::info("📦 Datos recibidos (codigo) para {$productId}: " . json_encode($data));
                
                $products = [];
                if (is_array($data) && !empty($data)) {
                    $products = $data;
                } elseif (isset($data['productos']) && !empty($data['productos'])) {
                    $products = $data['productos'];
                }
                
                if (!empty($products)) {
                    $product = $products[0];
                    $productInfo = [
                        'name' => $product['descripcion'] ?? $product['nombre'] ?? "Producto {$productId}",
                        'price' => floatval($product['precio1'] ?? $product['precio'] ?? 0),
                        'image' => $product['imagen'] ?? $product['image'] ?? null,
                        'description' => $product['descripcion'] ?? $product['nombre'] ?? null
                    ];
                    
                    Log::info("✅ Información extraída (codigo) para {$productId}: " . json_encode($productInfo));
                    return $productInfo;
                }
            }
            
        } catch (\Exception $e) {
            Log::error("❌ Error obteniendo producto {$productId}: " . $e->getMessage());
        }
        
        Log::warning("⚠️ Usando datos por defecto para producto {$productId}");
        
        // Fallback: datos por defecto
        return [
            'name' => "Producto {$productId}",
            'price' => 0,
            'image' => null,
            'description' => null
        ];
    }

    /**
     * Obtener información completa de productos desde la base de datos
     */
    private function getProductsInfoFromDB(array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }

        // Obtener productos desde la base de datos
        $products = CatalogOfferProduct::whereIn('product_id', $productIds)
            ->select('product_id', 'product_name', 'product_price', 'product_image', 'product_description')
            ->get()
            ->keyBy('product_id');

        $productsInfo = [];
        
        foreach ($productIds as $productId) {
            $product = $products->get($productId);
            
            if ($product) {
                // Producto encontrado en BD
                $productsInfo[] = [
                    'id' => $productId,
                    'product_id' => $productId,
                    'title' => $product->product_name,
                    'name' => $product->product_name,
                    'price' => $product->product_price,
                    'precio1' => $product->product_price,
                    'image' => $product->product_image,
                    'codigo' => $productId,
                    'description' => $product->product_description
                ];
            } else {
                // Producto no encontrado, usar datos por defecto
                $productsInfo[] = [
                    'id' => $productId,
                    'product_id' => $productId,
                    'title' => "Producto {$productId}",
                    'name' => "Producto {$productId}",
                    'price' => 0,
                    'precio1' => 0,
                    'image' => null,
                    'codigo' => $productId,
                    'description' => null
                ];
            }
        }
        
        return $productsInfo;
    }

    /**
     * Obtener todas las ofertas con sus relaciones
     */
    public function index()
    {
        try {
            $offers = CatalogOffer::with(['catalog', 'offerProducts', 'offerUsers'])
                ->orderBy('display_order')
                ->orderBy('created_at', 'desc')
                ->get();

            // Formatear datos para compatibilidad con el frontend
            $formattedOffers = $offers->map(function ($offer) {
                // Obtener IDs de productos
                $productIds = $offer->offerProducts->pluck('product_id')->toArray();
                
                // Obtener información completa de productos desde la BD
                $productsInfo = $this->getProductsInfoFromDB($productIds);
                
                return [
                    'id' => $offer->id,
                    'catalog_id' => $offer->catalog_id,
                    'title' => $offer->title,
                    'description' => $offer->description,
                    'discount_percentage' => $offer->discount_percentage,
                    'discount_type' => $offer->discount_type,
                    'discount_category' => $offer->discount_category,
                    'start_date' => $offer->start_date,
                    'end_date' => $offer->end_date,
                    'is_active' => $offer->is_active,
                    'display_order' => $offer->display_order,
                    'banner_image' => $offer->banner_image,
                    'offer_code' => $offer->offer_code,
                    'max_uses' => $offer->max_uses,
                    'current_uses' => $offer->current_uses,
                    'min_purchase_amount' => $offer->min_purchase_amount,
                    'max_discount_amount' => $offer->max_discount_amount,
                    'buy_quantity' => $offer->buy_quantity,
                    'get_quantity' => $offer->get_quantity,
                    'created_at' => $offer->created_at,
                    'updated_at' => $offer->updated_at,
                    // Compatibilidad con frontend - IDs para compatibilidad
                    'target_products' => $productIds,
                    'target_users' => $offer->offerUsers->pluck('user_id')->toArray(),
                    // Información completa de productos para el frontend
                    'products_info' => $productsInfo,
                    'catalog' => $offer->catalog
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedOffers
            ]);
        } catch (\Exception $e) {
            Log::error('Error obteniendo ofertas: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Crear nueva oferta con relaciones optimizadas
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'discount_percentage' => 'required_if:discount_category,product_discount,order_discount|numeric|min:0|max:100',
                'discount_type' => 'required_if:discount_category,product_discount,order_discount|in:percentage,fixed',
                'discount_category' => 'required|in:product_discount,buy_x_get_y,order_discount,free_shipping',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'is_active' => 'boolean',
                'display_order' => 'integer|min:0',
                'offer_code' => 'nullable|string|max:50|unique:catalog_offers',
                'max_uses' => 'nullable|integer|min:1',
                'min_purchase_amount' => 'nullable|numeric|min:0',
                'max_discount_amount' => 'nullable|numeric|min:0',
                'buy_quantity' => 'required_if:discount_category,buy_x_get_y|integer|min:1',
                'get_quantity' => 'required_if:discount_category,buy_x_get_y|integer|min:1',
                'target_products' => 'nullable|string', // JSON string
                'target_users' => 'nullable|string', // JSON string
                'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp'
            ], [
                'banner_image.mimes' => 'La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP',
                'banner_image.image' => 'El archivo debe ser una imagen válida',
                'buy_quantity.required_if' => 'La cantidad a comprar es requerida para promociones Buy X Get Y',
                'get_quantity.required_if' => 'La cantidad gratis es requerida para promociones Buy X Get Y',
                'discount_percentage.required_if' => 'El descuento es requerido para este tipo de oferta',
                'discount_type.required_if' => 'El tipo de descuento es requerido para este tipo de oferta'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->all();
            
            // Remover catalog_id si no existe en la base de datos
            if (isset($data['catalog_id'])) {
                $catalogExists = \App\Models\Catalog::where('id', $data['catalog_id'])->exists();
                if (!$catalogExists) {
                    unset($data['catalog_id']);
                }
            }
            
            // Extraer y procesar productos y usuarios
            $targetProducts = [];
            $targetUsers = [];
            
            if (isset($data['target_products']) && is_string($data['target_products'])) {
                $targetProducts = json_decode($data['target_products'], true) ?: [];
                Log::info('📦 Productos decodificados (store):', ['products' => $targetProducts]);
            }
            if (isset($data['target_users']) && is_string($data['target_users'])) {
                $targetUsers = json_decode($data['target_users'], true) ?: [];
                Log::info('👥 Usuarios decodificados (store):', ['users' => $targetUsers]);
            }
            
            // Remover de los datos principales
            unset($data['target_products'], $data['target_users']);
            
            // Limpiar campos según el tipo de descuento
            if ($data['discount_category'] === 'buy_x_get_y') {
                unset($data['discount_percentage'], $data['discount_type']);
            } elseif ($data['discount_category'] === 'free_shipping') {
                unset($data['discount_percentage'], $data['discount_type'], $data['buy_quantity'], $data['get_quantity']);
            } else {
                unset($data['buy_quantity'], $data['get_quantity']);
            }
            
            // Manejar imagen
            if ($request->hasFile('banner_image')) {
                $image = $request->file('banner_image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $imagePath = 'catalog-offers/' . $imageName;
                
                if (!Storage::disk('public')->exists('catalog-offers')) {
                    Storage::disk('public')->makeDirectory('catalog-offers');
                }
                
                Storage::disk('public')->put($imagePath, file_get_contents($image));
                $data['banner_image'] = $imagePath;
            }

            // 🚀 Transacción para crear oferta y relaciones
            DB::beginTransaction();
            
            try {
                // Crear oferta principal
                $offer = CatalogOffer::create($data);
                
                // Crear relaciones de productos con información completa
                if (!empty($targetProducts)) {
                    foreach ($targetProducts as $product) {
                        // Manejar tanto strings como objetos/arrays
                        $productId = null;
                        $productInfo = null;
                        
                        if (is_string($product)) {
                            $productId = $product;
                        } elseif (is_array($product)) {
                            $productId = $product['id'] ?? $product['product_id'] ?? $product['id_articulo'] ?? $product['codigo'] ?? null;
                            
                            // Si el producto ya tiene información completa (del frontend)
                            if (isset($product['descripcion']) || isset($product['name']) || isset($product['title'])) {
                                $productInfo = [
                                    'name' => $product['descripcion'] ?? $product['name'] ?? $product['title'] ?? "Producto {$productId}",
                                    'price' => floatval($product['precio1'] ?? $product['price'] ?? $product['precio'] ?? 0),
                                    'image' => $product['imagen'] ?? $product['image'] ?? null,
                                    'description' => $product['descripcion'] ?? $product['description'] ?? null
                                ];
                                Log::info("✅ Usando información del frontend para producto {$productId}: " . json_encode($productInfo));
                            }
                        }
                        
                        // Convertir a string si es necesario
                        if ($productId !== null && !is_string($productId)) {
                            $productId = (string) $productId;
                        }
                        
                        if (!empty($productId) && is_string($productId)) {
                            // Si no tenemos información del frontend, obtener desde la API
                            if (!$productInfo) {
                                Log::info("🌐 Obteniendo información desde API para producto {$productId}");
                                $productInfo = $this->getProductInfoFromApi($productId);
                            }
                            
                            // Crear registro con información completa
                            CatalogOfferProduct::create([
                                'offer_id' => $offer->id,
                                'product_id' => $productId,
                                'product_name' => $productInfo['name'],
                                'product_price' => $productInfo['price'],
                                'product_image' => $productInfo['image'],
                                'product_description' => $productInfo['description']
                            ]);
                        }
                    }
                }
                
                // Crear relaciones de usuarios (súper eficiente)
                if (!empty($targetUsers)) {
                    $userData = [];
                    foreach ($targetUsers as $userId) {
                        if (is_numeric($userId)) {
                            $userData[] = [
                                'offer_id' => $offer->id,
                                'user_id' => $userId,
                                'created_at' => now(),
                                'updated_at' => now()
                            ];
                        }
                    }
                    if (!empty($userData)) {
                        CatalogOfferUser::insert($userData);
                    }
                }
                
                DB::commit();
                
                // Cargar relaciones para respuesta
                $offer->load(['offerProducts', 'offerUsers']);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Oferta creada exitosamente',
                    'data' => $offer
                ], 201);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Error creando oferta: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar oferta existente
     */
    public function update(Request $request, $id)
    {
        try {
            $offer = CatalogOffer::findOrFail($id);
            
            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'discount_percentage' => 'required_if:discount_category,product_discount,order_discount|numeric|min:0|max:100',
                'discount_type' => 'required_if:discount_category,product_discount,order_discount|in:percentage,fixed',
                'discount_category' => 'required|in:product_discount,buy_x_get_y,order_discount,free_shipping',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'is_active' => 'boolean',
                'display_order' => 'integer|min:0',
                'offer_code' => 'nullable|string|max:50|unique:catalog_offers,offer_code,' . $id,
                'max_uses' => 'nullable|integer|min:1',
                'min_purchase_amount' => 'nullable|numeric|min:0',
                'max_discount_amount' => 'nullable|numeric|min:0',
                'buy_quantity' => 'required_if:discount_category,buy_x_get_y|integer|min:1',
                'get_quantity' => 'required_if:discount_category,buy_x_get_y|integer|min:1',
                'target_products' => 'nullable|string',
                'target_users' => 'nullable|string',
                'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->all();
            
            // Remover catalog_id si no existe en la base de datos
            if (isset($data['catalog_id'])) {
                $catalogExists = \App\Models\Catalog::where('id', $data['catalog_id'])->exists();
                if (!$catalogExists) {
                    unset($data['catalog_id']);
                }
            }
            
            // Extraer productos y usuarios
            $targetProducts = [];
            $targetUsers = [];
            
            if (isset($data['target_products']) && is_string($data['target_products'])) {
                $targetProducts = json_decode($data['target_products'], true) ?: [];
            }
            if (isset($data['target_users']) && is_string($data['target_users'])) {
                $targetUsers = json_decode($data['target_users'], true) ?: [];
            }
            
            unset($data['target_products'], $data['target_users']);
            
            // Limpiar campos según tipo
            if ($data['discount_category'] === 'buy_x_get_y') {
                unset($data['discount_percentage'], $data['discount_type']);
            } elseif ($data['discount_category'] === 'free_shipping') {
                unset($data['discount_percentage'], $data['discount_type'], $data['buy_quantity'], $data['get_quantity']);
            } else {
                unset($data['buy_quantity'], $data['get_quantity']);
            }
            
            // Manejar imagen
            if ($request->hasFile('banner_image')) {
                // Eliminar imagen anterior
                if ($offer->banner_image && Storage::disk('public')->exists($offer->banner_image)) {
                    Storage::disk('public')->delete($offer->banner_image);
                }
                
                $image = $request->file('banner_image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $imagePath = 'catalog-offers/' . $imageName;
                
                if (!Storage::disk('public')->exists('catalog-offers')) {
                    Storage::disk('public')->makeDirectory('catalog-offers');
                }
                
                Storage::disk('public')->put($imagePath, file_get_contents($image));
                $data['banner_image'] = $imagePath;
            }

            // 🚀 Transacción para actualizar
            DB::beginTransaction();
            
            try {
                // Actualizar oferta principal
                $offer->update($data);
                
                // Actualizar relaciones de productos (eliminar y recrear con información completa)
                CatalogOfferProduct::where('offer_id', $offer->id)->delete();
                if (!empty($targetProducts)) {
                    foreach ($targetProducts as $product) {
                        // Manejar tanto strings como objetos/arrays
                        $productId = null;
                        $productInfo = null;
                        
                        if (is_string($product)) {
                            $productId = $product;
                        } elseif (is_array($product)) {
                            $productId = $product['id'] ?? $product['product_id'] ?? $product['id_articulo'] ?? $product['codigo'] ?? null;
                            
                            // Si el producto ya tiene información completa (del frontend)
                            if (isset($product['descripcion']) || isset($product['name']) || isset($product['title'])) {
                                $productInfo = [
                                    'name' => $product['descripcion'] ?? $product['name'] ?? $product['title'] ?? "Producto {$productId}",
                                    'price' => floatval($product['precio1'] ?? $product['price'] ?? $product['precio'] ?? 0),
                                    'image' => $product['imagen'] ?? $product['image'] ?? null,
                                    'description' => $product['descripcion'] ?? $product['description'] ?? null
                                ];
                                Log::info("✅ Usando información del frontend para producto {$productId} (update): " . json_encode($productInfo));
                            }
                        }
                        
                        // Convertir a string si es necesario
                        if ($productId !== null && !is_string($productId)) {
                            $productId = (string) $productId;
                        }
                        
                        if (!empty($productId) && is_string($productId)) {
                            // Si no tenemos información del frontend, obtener desde la API
                            if (!$productInfo) {
                                Log::info("🌐 Obteniendo información desde API para producto {$productId} (update)");
                                $productInfo = $this->getProductInfoFromApi($productId);
                            }
                            
                            // Crear registro con información completa
                            CatalogOfferProduct::create([
                                'offer_id' => $offer->id,
                                'product_id' => $productId,
                                'product_name' => $productInfo['name'],
                                'product_price' => $productInfo['price'],
                                'product_image' => $productInfo['image'],
                                'product_description' => $productInfo['description']
                            ]);
                        }
                    }
                }
                
                // Actualizar relaciones de usuarios
                CatalogOfferUser::where('offer_id', $offer->id)->delete();
                if (!empty($targetUsers)) {
                    $userData = [];
                    foreach ($targetUsers as $userId) {
                        if (is_numeric($userId)) {
                            $userData[] = [
                                'offer_id' => $offer->id,
                                'user_id' => $userId,
                                'created_at' => now(),
                                'updated_at' => now()
                            ];
                        }
                    }
                    if (!empty($userData)) {
                        CatalogOfferUser::insert($userData);
                    }
                }
                
                DB::commit();
                
                // Cargar relaciones actualizadas
                $offer->load(['offerProducts', 'offerUsers']);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Oferta actualizada exitosamente',
                    'data' => $offer
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Error actualizando oferta: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar oferta
     */
    public function destroy($id)
    {
        try {
            $offer = CatalogOffer::findOrFail($id);
            
            DB::beginTransaction();
            
            try {
                // Las relaciones se eliminan automáticamente por CASCADE
                // Eliminar imagen si existe
                if ($offer->banner_image && Storage::disk('public')->exists($offer->banner_image)) {
                    Storage::disk('public')->delete($offer->banner_image);
                }
                
                $offer->delete();
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Oferta eliminada exitosamente'
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Error eliminando oferta: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener oferta específica
     */
    public function show($id)
    {
        try {
            $offer = CatalogOffer::with(['catalog', 'offerProducts', 'offerUsers'])->findOrFail($id);
            
            // Obtener IDs de productos
            $productIds = $offer->offerProducts->pluck('product_id')->toArray();
            
            // Obtener información completa de productos desde la BD
            $productsInfo = $this->getProductsInfoFromDB($productIds);
            
            // Formatear para compatibilidad
            $formattedOffer = [
                'id' => $offer->id,
                'catalog_id' => $offer->catalog_id,
                'title' => $offer->title,
                'description' => $offer->description,
                'discount_percentage' => $offer->discount_percentage,
                'discount_type' => $offer->discount_type,
                'discount_category' => $offer->discount_category,
                'start_date' => $offer->start_date,
                'end_date' => $offer->end_date,
                'is_active' => $offer->is_active,
                'display_order' => $offer->display_order,
                'banner_image' => $offer->banner_image,
                'offer_code' => $offer->offer_code,
                'max_uses' => $offer->max_uses,
                'current_uses' => $offer->current_uses,
                'min_purchase_amount' => $offer->min_purchase_amount,
                'max_discount_amount' => $offer->max_discount_amount,
                'buy_quantity' => $offer->buy_quantity,
                'get_quantity' => $offer->get_quantity,
                'created_at' => $offer->created_at,
                'updated_at' => $offer->updated_at,
                'target_products' => $productIds,
                'target_users' => $offer->offerUsers->pluck('user_id')->toArray(),
                // Información completa de productos para el frontend
                'products_info' => $productsInfo,
                'catalog' => $offer->catalog
            ];

            return response()->json([
                'success' => true,
                'data' => $formattedOffer
            ]);
        } catch (\Exception $e) {
            Log::error('Error obteniendo oferta: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Oferta no encontrada'
            ], 404);
        }
    }
}
