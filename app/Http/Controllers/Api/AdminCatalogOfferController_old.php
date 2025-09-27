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
     * Obtener todas las ofertas
     */
    public function index()
    {
        try {
            $offers = CatalogOffer::with(['catalog', 'offerProducts', 'offerUsers'])
                ->ordered()
                ->get();

            // Agregar los IDs de productos y usuarios para compatibilidad con el frontend
            $offers->each(function ($offer) {
                $offer->target_products = $offer->getProductIds();
                $offer->target_users = $offer->getUserIds();
            });

            return response()->json([
                'success' => true,
                'data' => $offers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las ofertas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener una oferta específica
     */
    public function show($id)
    {
        try {
            $offer = CatalogOffer::with(['catalog'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $offer
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la oferta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear una nueva oferta
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
            
            // Limpiar campos según el tipo de descuento
            if ($data['discount_category'] === 'buy_x_get_y') {
                // Para Buy X Get Y, no necesitamos discount_percentage ni discount_type
                unset($data['discount_percentage']);
                unset($data['discount_type']);
            } elseif ($data['discount_category'] === 'free_shipping') {
                // Para envío gratis, no necesitamos discount_percentage, discount_type, buy_quantity ni get_quantity
                unset($data['discount_percentage']);
                unset($data['discount_type']);
                unset($data['buy_quantity']);
                unset($data['get_quantity']);
            } else {
                // Para otros tipos, no necesitamos buy_quantity ni get_quantity
                unset($data['buy_quantity']);
                unset($data['get_quantity']);
            }
            
            // Nota: Los campos innecesarios ya se limpiaron arriba según el tipo de descuento
            
            // Procesar JSON strings para target_products y target_users
            if (isset($data['target_products']) && is_string($data['target_products'])) {
                Log::info('📦 Procesando target_products (string):', ['raw' => $data['target_products']]);
                $data['target_products'] = json_decode($data['target_products'], true);
                Log::info('📦 target_products después de json_decode:', ['parsed' => $data['target_products']]);
            }
            if (isset($data['target_users']) && is_string($data['target_users'])) {
                Log::info('👥 Procesando target_users (string):', ['raw' => $data['target_users']]);
                $data['target_users'] = json_decode($data['target_users'], true);
                Log::info('👥 target_users después de json_decode:', ['parsed' => $data['target_users']]);
            }
            
            // Manejar la imagen del banner
            if ($request->hasFile('banner_image')) {
                $image = $request->file('banner_image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $imagePath = 'catalog-offers/' . $imageName;
                
                // Crear directorio si no existe
                if (!file_exists(public_path('catalog-offers'))) {
                    mkdir(public_path('catalog-offers'), 0755, true);
                }
                
                // Mover imagen a carpeta pública
                $image->move(public_path('catalog-offers'), $imageName);
                $data['banner_image'] = $imagePath;
            }

            $offer = CatalogOffer::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Oferta creada exitosamente',
                'data' => $offer->load('catalog')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la oferta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar una oferta existente
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
            
            // Limpiar campos según el tipo de descuento
            if ($data['discount_category'] === 'buy_x_get_y') {
                // Para Buy X Get Y, no necesitamos discount_percentage ni discount_type
                unset($data['discount_percentage']);
                unset($data['discount_type']);
            } elseif ($data['discount_category'] === 'free_shipping') {
                // Para envío gratis, no necesitamos discount_percentage, discount_type, buy_quantity ni get_quantity
                unset($data['discount_percentage']);
                unset($data['discount_type']);
                unset($data['buy_quantity']);
                unset($data['get_quantity']);
            } else {
                // Para otros tipos, no necesitamos buy_quantity ni get_quantity
                unset($data['buy_quantity']);
                unset($data['get_quantity']);
            }
            
            // Nota: Los campos innecesarios ya se limpiaron arriba según el tipo de descuento
            
            // Procesar JSON strings para target_products y target_users
            if (isset($data['target_products']) && is_string($data['target_products'])) {
                Log::info('📦 Procesando target_products (string):', ['raw' => $data['target_products']]);
                $data['target_products'] = json_decode($data['target_products'], true);
                Log::info('📦 target_products después de json_decode:', ['parsed' => $data['target_products']]);
            }
            if (isset($data['target_users']) && is_string($data['target_users'])) {
                Log::info('👥 Procesando target_users (string):', ['raw' => $data['target_users']]);
                $data['target_users'] = json_decode($data['target_users'], true);
                Log::info('👥 target_users después de json_decode:', ['parsed' => $data['target_users']]);
            }
            
            // Manejar la imagen del banner
            if ($request->hasFile('banner_image')) {
                // Eliminar imagen anterior si existe
                if ($offer->banner_image) {
                    $oldImagePath = public_path($offer->banner_image);
                    if (file_exists($oldImagePath)) {
                        unlink($oldImagePath);
                    }
                }
                
                $image = $request->file('banner_image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $imagePath = 'catalog-offers/' . $imageName;
                
                // Crear directorio si no existe
                if (!file_exists(public_path('catalog-offers'))) {
                    mkdir(public_path('catalog-offers'), 0755, true);
                }
                
                // Mover imagen a carpeta pública
                $image->move(public_path('catalog-offers'), $imageName);
                $data['banner_image'] = $imagePath;
            }

            $offer->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Oferta actualizada exitosamente',
                'data' => $offer->load('catalog')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la oferta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una oferta
     */
    public function destroy($id)
    {
        try {
            $offer = CatalogOffer::findOrFail($id);
            
            // Eliminar imagen del banner si existe
            if ($offer->banner_image) {
                $imagePath = public_path($offer->banner_image);
                if (file_exists($imagePath)) {
                    unlink($imagePath);
                }
            }
            
            $offer->delete();

            return response()->json([
                'success' => true,
                'message' => 'Oferta eliminada exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la oferta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado de una oferta
     */
    public function toggleStatus($id)
    {
        try {
            $offer = CatalogOffer::findOrFail($id);
            $offer->is_active = !$offer->is_active;
            $offer->save();

            return response()->json([
                'success' => true,
                'message' => 'Estado de la oferta actualizado exitosamente',
                'data' => $offer
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar el estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reordenar ofertas
     */
    public function reorder(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'offers' => 'required|array',
                'offers.*.id' => 'required|exists:catalog_offers,id',
                'offers.*.display_order' => 'required|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            foreach ($request->offers as $offerData) {
                CatalogOffer::where('id', $offerData['id'])
                    ->update(['display_order' => $offerData['display_order']]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Orden de ofertas actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el orden: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener ofertas por catálogo
     */
    public function getOffersByCatalog($catalogId)
    {
        try {
            $offers = CatalogOffer::where('catalog_id', $catalogId)
                ->ordered()
                ->get();

            return response()->json([
                'success' => true,
                'data' => $offers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las ofertas del catálogo: ' . $e->getMessage()
            ], 500);
        }
    }
}


