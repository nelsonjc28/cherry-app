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

class AdminCatalogOfferController extends Controller
{
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
                    // Compatibilidad con frontend - convertir relaciones a JSON
                    'target_products' => $offer->offerProducts->pluck('product_id')->toArray(),
                    'target_users' => $offer->offerUsers->pluck('user_id')->toArray(),
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
                'catalog_id' => 'required|exists:catalogs,id',
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
            
            // Extraer y procesar productos y usuarios
            $targetProducts = [];
            $targetUsers = [];
            
            if (isset($data['target_products']) && is_string($data['target_products'])) {
                $targetProducts = json_decode($data['target_products'], true) ?: [];
            }
            if (isset($data['target_users']) && is_string($data['target_users'])) {
                $targetUsers = json_decode($data['target_users'], true) ?: [];
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
                
                // Crear relaciones de productos (súper eficiente)
                if (!empty($targetProducts)) {
                    $productData = [];
                    foreach ($targetProducts as $productId) {
                        if (!empty($productId)) {
                            $productData[] = [
                                'offer_id' => $offer->id,
                                'product_id' => $productId,
                                'created_at' => now(),
                                'updated_at' => now()
                            ];
                        }
                    }
                    if (!empty($productData)) {
                        CatalogOfferProduct::insert($productData);
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
                'catalog_id' => 'required|exists:catalogs,id',
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
                
                // Actualizar relaciones de productos (eliminar y recrear)
                CatalogOfferProduct::where('offer_id', $offer->id)->delete();
                if (!empty($targetProducts)) {
                    $productData = [];
                    foreach ($targetProducts as $productId) {
                        if (!empty($productId)) {
                            $productData[] = [
                                'offer_id' => $offer->id,
                                'product_id' => $productId,
                                'created_at' => now(),
                                'updated_at' => now()
                            ];
                        }
                    }
                    if (!empty($productData)) {
                        CatalogOfferProduct::insert($productData);
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
                'target_products' => $offer->offerProducts->pluck('product_id')->toArray(),
                'target_users' => $offer->offerUsers->pluck('user_id')->toArray(),
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
