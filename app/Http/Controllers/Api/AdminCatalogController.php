<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\CatalogPdfImage;
use App\Models\CatalogProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AdminCatalogController extends Controller
{
    /**
     * Obtener todos los catálogos
     */
    public function index()
    {
        try {
            $catalogs = Catalog::with(['pdfImages', 'products'])
                ->ordered()
                ->get();

            return response()->json([
                'success' => true,
                'data' => $catalogs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los catálogos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener un catálogo específico
     */
    public function show($id)
    {
        try {
            $catalog = Catalog::with(['pdfImages', 'products'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $catalog
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el catálogo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear un nuevo catálogo
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'required|string',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                'is_active' => 'boolean',
                'display_order' => 'integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->all();
            
            // Manejar la imagen del catálogo
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $imagePath = 'catalogs/' . $imageName;
                
                // Crear directorio si no existe
                if (!file_exists(public_path('catalogs'))) {
                    mkdir(public_path('catalogs'), 0755, true);
                }
                
                // Mover imagen a carpeta pública
                $image->move(public_path('catalogs'), $imageName);
                $data['image'] = $imagePath;
            }

            $catalog = Catalog::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Catálogo creado exitosamente',
                'data' => $catalog
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el catálogo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar un catálogo existente
     */
    public function update(Request $request, $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'required|string',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
                'is_active' => 'boolean',
                'display_order' => 'integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->all();
            
            // Manejar la imagen del catálogo
            if ($request->hasFile('image')) {
                // Eliminar imagen anterior si existe
                if ($catalog->image) {
                    $oldImagePath = public_path($catalog->image);
                    if (file_exists($oldImagePath)) {
                        unlink($oldImagePath);
                    }
                }
                
                $image = $request->file('image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $imagePath = 'catalogs/' . $imageName;
                
                // Crear directorio si no existe
                if (!file_exists(public_path('catalogs'))) {
                    mkdir(public_path('catalogs'), 0755, true);
                }
                
                // Mover imagen a carpeta pública
                $image->move(public_path('catalogs'), $imageName);
                $data['image'] = $imagePath;
            }

            $catalog->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Catálogo actualizado exitosamente',
                'data' => $catalog
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el catálogo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un catálogo
     */
    public function destroy($id)
    {
        try {
            $catalog = Catalog::findOrFail($id);
            
            // Eliminar imagen del catálogo si existe
            if ($catalog->image) {
                $imagePath = public_path($catalog->image);
                if (file_exists($imagePath)) {
                    unlink($imagePath);
                }
            }
            
            $catalog->delete();

            return response()->json([
                'success' => true,
                'message' => 'Catálogo eliminado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el catálogo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Agregar imágenes al catálogo PDF
     */
    public function addPdfImages(Request $request, $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'images.*' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $uploadedImages = [];
            
            if ($request->hasFile('images')) {
                // Crear directorio si no existe
                if (!file_exists(public_path('catalog-pdf'))) {
                    mkdir(public_path('catalog-pdf'), 0755, true);
                }
                
                foreach ($request->file('images') as $image) {
                    $imageName = time() . '_' . $image->getClientOriginalName();
                    $imagePath = 'catalog-pdf/' . $imageName;
                    
                    // Mover imagen a carpeta pública
                    $image->move(public_path('catalog-pdf'), $imageName);
                    
                    $pdfImage = CatalogPdfImage::create([
                        'catalog_id' => $catalog->id,
                        'image_path' => $imagePath,
                        'image_name' => $image->getClientOriginalName(),
                        'display_order' => CatalogPdfImage::where('catalog_id', $catalog->id)->max('display_order') + 1
                    ]);
                    
                    $uploadedImages[] = $pdfImage;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Imágenes agregadas exitosamente',
                'data' => $uploadedImages
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al agregar imágenes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una imagen del catálogo PDF
     */
    public function removePdfImage($catalogId, $imageId)
    {
        try {
            $pdfImage = CatalogPdfImage::where('catalog_id', $catalogId)
                ->where('id', $imageId)
                ->firstOrFail();

            // Eliminar archivo físico
            $imagePath = public_path($pdfImage->image_path);
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
            
            $pdfImage->delete();

            return response()->json([
                'success' => true,
                'message' => 'Imagen eliminada exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la imagen: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Agregar productos al catálogo
     */
    public function addProducts(Request $request, $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'products' => 'required|array',
                'products.*.external_product_id' => 'required|string',
                'products.*.product_name' => 'required|string',
                'products.*.product_description' => 'nullable|string',
                'products.*.product_image' => 'nullable|string',
                'products.*.product_price' => 'nullable|numeric',
                'products.*.product_category' => 'nullable|string',
                'products.*.product_metadata' => 'nullable|array'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $addedProducts = [];
            
            foreach ($request->products as $productData) {
                // Verificar que el producto no esté ya en otro catálogo
                if (CatalogProduct::isProductInAnyCatalog($productData['external_product_id'])) {
                    continue; // Saltar este producto
                }

                $catalogProduct = CatalogProduct::create([
                    'catalog_id' => $catalog->id,
                    'external_product_id' => $productData['external_product_id'],
                    'product_name' => $productData['product_name'] ?? '',
                    'product_description' => $productData['product_description'] ?? null,
                    'product_image' => $productData['product_image'] ?? null,
                    'product_price' => $productData['product_price'] ?? 0,
                    'product_category' => $productData['product_category'] ?? null,
                    'product_metadata' => $productData['product_metadata'] ?? [],
                    'display_order' => CatalogProduct::where('catalog_id', $catalog->id)->max('display_order') + 1
                ]);
                
                $addedProducts[] = $catalogProduct;
            }

            return response()->json([
                'success' => true,
                'message' => 'Productos agregados exitosamente',
                'data' => $addedProducts
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al agregar productos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un producto del catálogo
     */
    public function removeProduct($catalogId, $productId)
    {
        try {
            $catalogProduct = CatalogProduct::where('catalog_id', $catalogId)
                ->where('id', $productId)
                ->firstOrFail();
            
            $catalogProduct->delete();

            return response()->json([
                'success' => true,
                'message' => 'Producto eliminado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el producto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener solo los IDs de productos que están en catálogos
     */
    public function getCatalogProductIds(Request $request)
    {
        try {
            // Obtener solo los IDs de productos que están en catálogos
            $catalogProductIds = CatalogProduct::pluck('external_product_id')->toArray();
            
            \Illuminate\Support\Facades\Log::info('IDs de productos en catálogos: ' . json_encode($catalogProductIds));
            \Illuminate\Support\Facades\Log::info('Total de productos en catálogos: ' . count($catalogProductIds));
            
            return response()->json([
                'success' => true,
                'data' => $catalogProductIds
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener IDs de productos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Filtrar productos disponibles basándose en una lista de productos externos
     */
    public function filterAvailableProducts(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'products' => 'required|array',
                'products.*.id_articulo' => 'required|string',
                'products.*.descripcion' => 'required|string',
                'products.*.imagen' => 'nullable|string',
                'products.*.precio1' => 'nullable|numeric',
                'products.*.linea.descripcion' => 'nullable|string',
                'products.*.especificaciones' => 'nullable|string',
                'products.*.marca' => 'nullable|string',
                'products.*.temporada' => 'nullable|string',
                'products.*.genero.descripcion' => 'nullable|string',
                'products.*.sector.descripcion' => 'nullable|string',
                'products.*.inventario' => 'nullable|numeric',
                'products.*.detalles' => 'nullable|array'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $externalProducts = $request->input('products');
            
            // Log para debugging
            \Illuminate\Support\Facades\Log::info('Productos recibidos del frontend: ' . count($externalProducts));
            
            // Filtrar solo productos que no están en ningún catálogo
            $availableProducts = CatalogProduct::getAvailableProducts($externalProducts);
            
            \Illuminate\Support\Facades\Log::info('Productos disponibles (no en catálogos): ' . $availableProducts->count());
            
            // Mapear los campos de la API externa al formato esperado por el frontend (sin imágenes para optimizar)
            $mappedProducts = $availableProducts->map(function ($product) {
                return [
                    'external_product_id' => $product['id_articulo'],
                    'product_name' => $product['descripcion'] ?? '',
                    'product_description' => $product['especificaciones'] ?? null,
                    'product_price' => $product['precio1'] ?? 0,
                    'product_category' => $product['linea']['descripcion'] ?? null,
                    'product_metadata' => [
                        'marca' => $product['marca'] ?? null,
                        'temporada' => $product['temporada'] ?? null,
                        'genero' => $product['genero']['descripcion'] ?? null,
                        'sector' => $product['sector']['descripcion'] ?? null,
                        'inventario' => $product['inventario'] ?? 0
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $mappedProducts
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al filtrar productos disponibles: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar el estado activo/inactivo del catálogo
     */
    public function toggleStatus($id)
    {
        try {
            $catalog = Catalog::findOrFail($id);
            $catalog->is_active = !$catalog->is_active;
            $catalog->save();

            return response()->json([
                'success' => true,
                'message' => 'Estado del catálogo cambiado exitosamente',
                'data' => ['is_active' => $catalog->is_active]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar el estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reordenar elementos del catálogo
     */
    public function reorder(Request $request, $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'type' => 'required|in:pdf_images,products',
                'items' => 'required|array',
                'items.*.id' => 'required|integer',
                'items.*.display_order' => 'required|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            if ($request->type === 'pdf_images') {
                foreach ($request->items as $item) {
                    CatalogPdfImage::where('id', $item['id'])
                        ->where('catalog_id', $catalog->id)
                        ->update(['display_order' => $item['display_order']]);
                }
            } else {
                foreach ($request->items as $item) {
                    CatalogProduct::where('id', $item['id'])
                        ->where('catalog_id', $catalog->id)
                        ->update(['display_order' => $item['display_order']]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Orden actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al reordenar: ' . $e->getMessage()
            ], 500);
        }
    }
}
