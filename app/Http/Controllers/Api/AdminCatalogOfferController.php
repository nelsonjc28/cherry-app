<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\CatalogOffer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AdminCatalogOfferController extends Controller
{
    /**
     * Obtener todas las ofertas
     */
    public function index()
    {
        try {
            $offers = CatalogOffer::with(['catalog'])
                ->ordered()
                ->get();

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
                'discount_percentage' => 'required|numeric|min:0|max:100',
                'discount_type' => 'required|in:percentage,fixed',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'is_active' => 'boolean',
                'display_order' => 'integer|min:0',
                'offer_code' => 'nullable|string|max:50|unique:catalog_offers',
                'max_uses' => 'nullable|integer|min:1',
                'min_purchase_amount' => 'nullable|numeric|min:0',
                'max_discount_amount' => 'nullable|numeric|min:0',
                'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->all();
            
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
                'discount_percentage' => 'required|numeric|min:0|max:100',
                'discount_type' => 'required|in:percentage,fixed',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'is_active' => 'boolean',
                'display_order' => 'integer|min:0',
                'offer_code' => 'nullable|string|max:50|unique:catalog_offers,offer_code,' . $id,
                'max_uses' => 'nullable|integer|min:1',
                'min_purchase_amount' => 'nullable|numeric|min:0',
                'max_discount_amount' => 'nullable|numeric|min:0',
                'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->all();
            
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


