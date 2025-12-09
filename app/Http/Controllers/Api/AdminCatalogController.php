<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\CatalogPdf;
use App\Models\CatalogProduct;
use App\Models\CatalogImageGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Smalot\PdfParser\Parser;


class AdminCatalogController extends Controller
{
    /**
     * Obtener todos los catálogos
     */
    public function index()
    {
        try {
            $catalogs = Catalog::with(['pdfs', 'products'])
                ->ordered()
                ->get();

            return response()->json([
                'success' => true,
                'catalogs' => $catalogs,
                'data' => $catalogs // Mantener retrocompatibilidad
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
            $catalog = Catalog::with(['pdfs', 'products'])
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
                'code' => 'nullable|string|max:100',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp',
                'is_active' => 'sometimes|boolean',
                'display_order' => 'sometimes|integer|min:0'
            ], [
                'image.mimes' => 'La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP',
                'image.image' => 'El archivo debe ser una imagen válida'
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
                'name' => 'sometimes|required|string|max:255',
                'description' => 'sometimes|required|string',
                'code' => 'sometimes|nullable|string|max:100',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp',
                'is_active' => 'sometimes|boolean',
                'display_order' => 'sometimes|integer|min:0'
            ], [
                'image.mimes' => 'La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP',
                'image.image' => 'El archivo debe ser una imagen válida'
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
     * Actualizar solo el orden de visualización de un catálogo
     */
    public function updateOrder(Request $request)
    {
        /* dd($request->all()); */
        try {
            // Permitir arreglo vacío (limpia todas las posiciones)
            $payload = $request->input('catalogs', []);

            DB::beginTransaction();

            $updatedIds = [];

            // Asignar posiciones a los catálogos recibidos
            foreach ($payload as $item) {
                if (!isset($item['id'])) {
                    continue;
                }
                $catalog = Catalog::find($item['id']);
                if (!$catalog) {
                    continue;
                }
                $catalog->display_order = isset($item['display_order']) ? (int)$item['display_order'] : null;
                $catalog->save();
                $updatedIds[] = (int)$item['id'];
            }

            // Limpiar posiciones de los catálogos que ya no están en la lista
            if (count($updatedIds) > 0) {
                Catalog::whereNotIn('id', $updatedIds)->update(['display_order' => null]);
            } else {
                // Si no hay ninguno seleccionado, limpiar todas las posiciones
                Catalog::query()->update(['display_order' => null]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
                'message' => 'Orden del catálogo actualizado exitosamente',
                'data' => [
                    'updated_ids' => $updatedIds
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el orden del catálogo: ' . $e->getMessage()
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

            // Limpiar display_order antes de eliminar (liberar posición en home)
            if ($catalog->display_order !== null) {
                $catalog->update(['display_order' => null]);
            }

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
     * Agregar imágenes al catálogo
     */
    public function addPdfs(Request $request, $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            // Validar cantidad máxima de archivos
            if ($request->hasFile('images')) {
                $imagesCount = count($request->file('images'));
                if ($imagesCount > 50) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Máximo 50 imágenes por carga. Intenta con menos archivos.'
                    ], 422);
                }
            }

            $validator = Validator::make($request->all(), [
                'images.*' => 'required|file|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB máximo por imagen
                'catalog_name' => 'nullable|string|max:255',
                'image_group_id' => 'nullable|exists:catalog_image_groups,id'
            ], [
                'images.*.mimes' => 'Las imágenes deben ser archivos válidos (JPEG, PNG, JPG, GIF, WebP)',
                'images.*.max' => 'Cada imagen no debe superar 10MB',
                'image_group_id.exists' => 'El grupo de imágenes especificado no existe'
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
                // Crear directorios si no existen
                $catalogImagesDir = public_path('catalog-images');
                $thumbnailsDir = public_path('catalog-images/thumbnails');

                if (!file_exists($catalogImagesDir)) {
                    mkdir($catalogImagesDir, 0755, true);
                }
                if (!file_exists($thumbnailsDir)) {
                    mkdir($thumbnailsDir, 0755, true);
                }

                $displayOrder = CatalogPdf::where('catalog_id', $catalog->id)->max('display_order') ?? 0;

                foreach ($request->file('images') as $index => $image) {
                    // Validar que el archivo sea válido
                    if (!$image->isValid()) {
                        continue; // Saltar archivos inválidos
                    }

                    $imageName = time() . '_' . $index . '_' . $image->getClientOriginalName();
                    $imagePath = 'catalog-images/' . $imageName;
                    $thumbnailPath = 'catalog-images/thumbnails/thumb_' . $imageName;

                    // Obtener información del archivo
                    $imageSize = $image->getSize();
                    $imageMimeType = $image->getMimeType();

                    // Obtener dimensiones de la imagen
                    $imageInfo = getimagesize($image->getPathname());
                    $width = $imageInfo[0] ?? null;
                    $height = $imageInfo[1] ?? null;

                    // Mover imagen a carpeta pública
                    if (!$image->move(public_path('catalog-images'), $imageName)) {
                        continue; // Saltar si no se puede mover
                    }

                    // Crear thumbnail
                    $this->createThumbnail(
                        public_path('catalog-images/' . $imageName),
                        public_path('catalog-images/thumbnails/thumb_' . $imageName),
                        300,
                        300
                    );

                    $catalogImage = CatalogPdf::create([
                        'catalog_id' => $catalog->id,
                        'image_group_id' => $request->image_group_id,
                        'catalog_name' => $request->catalog_name ?? $catalog->name,
                        'image_path' => $imagePath,
                        'image_name' => $image->getClientOriginalName(),
                        'image_size' => $imageSize,
                        'image_mime_type' => $imageMimeType,
                        'image_alt' => $image->getClientOriginalName(),
                        'width' => $width,
                        'height' => $height,
                        'thumbnail_path' => $thumbnailPath,
                        'display_order' => $displayOrder + $index + 1
                    ]);

                    $uploadedImages[] = $catalogImage;
                }
            }

            if (empty($uploadedImages)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudieron procesar las imágenes. Verifica que sean archivos válidos.'
                ], 422);
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
     * Eliminar una imagen del catálogo
     */
    public function removePdf($catalogId, $pdfId)
    {
        try {
            $catalogImage = CatalogPdf::where('catalog_id', $catalogId)
                ->where('id', $pdfId)
                ->firstOrFail();

            // Eliminar archivos físicos
            $imagePath = public_path($catalogImage->image_path);
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }

            $thumbnailPath = public_path($catalogImage->thumbnail_path);
            if (file_exists($thumbnailPath)) {
                unlink($thumbnailPath);
            }

            $catalogImage->delete();

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


            // Filtrar solo productos que no están en ningún catálogo
            $availableProducts = CatalogProduct::getAvailableProducts($externalProducts);



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
                    CatalogPdf::where('id', $item['id'])
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

    /**
     * Obtener productos de un catálogo específico
     */
    public function getCatalogProducts($id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            // Obtener productos del catálogo con orden
            $products = $catalog->products()
                ->orderBy('display_order', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'catalog' => $catalog,
                    'products' => $products
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener productos del catálogo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener todos los catálogos públicos (activos)
     */
    public function getPublicCatalogs()
    {
        try {
            $catalogs = Catalog::with(['pdfs'])
                ->where('is_active', true)
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
     * Obtener un catálogo público específico
     */
    public function getPublicCatalog($id)
    {
        try {
            $catalog = Catalog::with(['pdfs'])
                ->where('is_active', true)
                ->findOrFail($id);

            // Las imágenes no necesitan cálculo de páginas
            // Solo verificar que las imágenes existan

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
     * Obtener productos de un catálogo público específico
     * Busca productos en la tabla productos donde catalogoId = code del catálogo
     * Retorna el mismo formato que ProductSearchController para compatibilidad con BuscarPage
     */
    public function getPublicCatalogProducts($id)
    {
        try {
            // Verificar que el catálogo existe y está activo
            $catalog = Catalog::where('is_active', true)->findOrFail($id);

            // Obtener el código del catálogo para filtrar productos
            $catalogCode = $catalog->code;

            // Cache key para productos del catálogo (usar código para consistencia)
            $cacheKey = 'catalog_products_' . $catalogCode;
            
            // Intentar obtener del cache (10 minutos)
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                return response()->json($cached);
            }

            // Buscar productos en la tabla productos donde catalogoId = code del catálogo
            $productos = DB::table('productos')
                ->select([
                    'productos.id',
                    'productos.id_linea',
                    'productos.catalogoId',
                    'productos.descripcion',
                    'productos.imagen',
                    'productos.precio1',
                    'productos.opc_promo',
                    'productos.desc_promo',
                    'productos.fecha_alta',
                    'productos.opc_nuevo',
                    'productos.marca',
                    'productos.inventario',
                    'productos.sku'
                ])
                ->where('productos.catalogoId', $catalogCode)
                ->get();

            if ($productos->isEmpty()) {
                $response = [
                    'success' => true,
                    'data' => [
                        'products' => [],
                        'total' => 0,
                        'page' => 1,
                        'per_page' => 0,
                        'last_page' => 1
                    ]
                ];
                Cache::put($cacheKey, $response, 600);
                return response()->json($response);
            }

            // Obtener IDs de productos para buscar detalles y ratings
            $productIds = $productos->pluck('id')->toArray();
            
            // Obtener detalles completos para colores y tallas
            $detallesPorProducto = [];
            $coloresPorProducto = [];
            if (!empty($productIds)) {
                $detalles = DB::table('detalles')
                    ->select('producto_id', 'nombreColor', 'detalle')
                    ->whereIn('producto_id', $productIds)
                    ->whereNotNull('nombreColor')
                    ->where('nombreColor', '!=', '')
                    ->get();
                
                foreach ($detalles as $detalle) {
                    if (!isset($detallesPorProducto[$detalle->producto_id])) {
                        $detallesPorProducto[$detalle->producto_id] = [];
                        $coloresPorProducto[$detalle->producto_id] = [];
                    }
                    
                    // Agregar detalle completo
                    $detallesPorProducto[$detalle->producto_id][] = [
                        'nombreColor' => $detalle->nombreColor,
                        'detalle' => $detalle->detalle
                    ];
                    
                    // Agregar color único
                    if (!in_array($detalle->nombreColor, $coloresPorProducto[$detalle->producto_id])) {
                        $coloresPorProducto[$detalle->producto_id][] = $detalle->nombreColor;
                    }
                }
            }

            // Obtener ratings de todos los productos (solo aprobadas)
            $ratingsPorProducto = [];
            if (!empty($productIds)) {
                $reviews = DB::table('reviews')
                    ->select('product_id', 'rating')
                    ->whereIn('product_id', $productIds)
                    ->where('is_approved', true)
                    ->get();
                
                // Agrupar por producto y calcular promedio manualmente
                $ratingsGrouped = [];
                foreach ($reviews as $review) {
                    if (!isset($ratingsGrouped[$review->product_id])) {
                        $ratingsGrouped[$review->product_id] = [
                            'sum' => 0,
                            'count' => 0
                        ];
                    }
                    $ratingsGrouped[$review->product_id]['sum'] += (int) $review->rating;
                    $ratingsGrouped[$review->product_id]['count']++;
                }
                
                // Calcular promedio: suma de estrellas / total de reseñas
                foreach ($ratingsGrouped as $productId => $data) {
                    $average = $data['count'] > 0 ? ($data['sum'] / $data['count']) : 0;
                    $ratingsPorProducto[$productId] = [
                        'rating' => round($average, 2),
                        'count' => $data['count']
                    ];
                }
            }

            // Construir respuesta en el mismo formato que ProductSearchController
            $products = [];
            $now = time();
            $fortyFiveDaysAgo = $now - (45 * 24 * 60 * 60);
            
            foreach ($productos as $producto) {
                // Convertir precio correctamente
                $precio1Raw = $producto->precio1;
                $precio1 = 0;
                if (is_numeric($precio1Raw)) {
                    $precio1 = (float) $precio1Raw;
                } elseif (is_string($precio1Raw)) {
                    $precio1 = (float) str_replace(',', '', $precio1Raw);
                }
                
                // Calcular precio original y descuento (igual que ProductSearchController)
                $descPromoValue = (float) ($producto->desc_promo ?? 0);
                $hasDiscount = $descPromoValue > 0;
                // Reducir 10% al descuento (mínimo 0)
                $discountPercentage = $hasDiscount ? max(0, $descPromoValue - 10) : 0;
                // El precio original es precio1 (ya que precio1 es el precio base)
                $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
                // Calcular precio final con descuento reducido aplicado sobre precio1
                $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                    ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                    : $precio1;
                
                // Determinar si es nuevo (45 días)
                $isNew = false;
                if ($producto->opc_nuevo === 'S') {
                    $isNew = true;
                } elseif ($producto->fecha_alta) {
                    $fechaAltaTimestamp = strtotime($producto->fecha_alta);
                    if ($fechaAltaTimestamp && $fechaAltaTimestamp > $fortyFiveDaysAgo) {
                        $isNew = true;
                    }
                }
                
                // Obtener colores y detalles del producto
                $colors = $coloresPorProducto[$producto->id] ?? [];
                $detalles = $detallesPorProducto[$producto->id] ?? [];
                
                // Obtener rating del producto
                $ratingData = $ratingsPorProducto[$producto->id] ?? ['rating' => 0, 'count' => 0];
                
                // Generar URL de imagen desde S3
                $imageUrl = $this->getProductImageUrl($producto->id);
                
                $products[] = [
                    'id' => $producto->id,
                    'id_articulo' => $producto->id,
                    'id_linea' => $producto->id_linea,
                    'catalogoId' => $producto->catalogoId,
                    'title' => $producto->descripcion,
                    'descripcion' => $producto->descripcion,
                    'image' => $imageUrl, // URL de S3
                    'price' => $finalPrice, // Precio final con descuento reducido aplicado
                    'precio1' => $precio1, // Precio base original
                    'originalPrice' => $hasDiscount ? $originalPrice : null,
                    'discount' => $discountPercentage, // Descuento reducido (desc_promo - 10)
                    'colors' => $colors,
                    'colores' => $colors, // También como colores
                    'isNew' => $isNew,
                    'opc_nuevo' => $producto->opc_nuevo,
                    'opc_promo' => $producto->opc_promo,
                    'desc_promo' => $producto->desc_promo,
                    'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                    'marca' => $producto->marca,
                    'inventario' => (float) $producto->inventario,
                    'detalles' => $detalles, // Detalles completos para el frontend
                    'rating' => $ratingData['rating'],
                    'ratingCount' => $ratingData['count'],
                    'totalRatings' => $ratingData['count']
                ];
            }

            $total = count($products);
            
            $response = [
                'success' => true,
                'data' => [
                    'products' => $products,
                    'total' => $total,
                    'page' => 1,
                    'per_page' => $total,
                    'last_page' => 1
                ]
            ];
            
            // Guardar en cache (10 minutos)
            Cache::put($cacheKey, $response, 600);
            
            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos del catálogo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Genera la URL de imagen principal de un producto desde AWS S3.
     *
     * @param string $productId ID del producto
     * @param int $imageNumber Número de imagen (por defecto 1)
     * @return string URL completa de la imagen
     */
    private function getProductImageUrl(string $productId, int $imageNumber = 1): string
    {
        if (empty($productId)) {
            return asset('images/placeholder-product.png');
        }
        
        // Construir URL de AWS S3 basada en el ID del producto
        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productId}/{$productId}_{$imageNumber}.jpg";
    }

    /**
     * Obtener imágenes de un catálogo público específico con paginación
     */
    public function getPublicCatalogPdfs($id)
    {
        try {
            $catalog = Catalog::where('is_active', true)->findOrFail($id);

            $perPage = 20; // 20 imágenes por página para lazy loading
            $page = request('page', 1);

            $images = CatalogPdf::where('catalog_id', $id)
                ->orderBy('display_order', 'asc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'data' => [
                    'catalog' => $catalog,
                    'images' => $images->items(),
                    'pagination' => [
                        'current_page' => $images->currentPage(),
                        'last_page' => $images->lastPage(),
                        'per_page' => $images->perPage(),
                        'total' => $images->total(),
                        'has_more' => $images->hasMorePages()
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener imágenes del catálogo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener todos los catálogos con imágenes para selección (método público)
     */
    public function getCatalogsWithImages()
    {
        try {
            $catalogs = Catalog::where('is_active', true)
                ->withCount('pdfs as images_count')
                ->with(['activeImageGroups' => function ($query) {
                    $query->withCount('images as group_images_count');
                }])
                ->orderByRaw('ISNULL(display_order), display_order ASC')
                ->get()
                ->map(function ($catalog) {
                    return [
                        'id' => $catalog->id,
                        'name' => $catalog->name,
                        'description' => $catalog->description ?? 'Catálogo de imágenes',
                        'image_url' => $catalog->image_url,
                        'images_count' => $catalog->images_count,
                        'pdfs_count' => $catalog->images_count, // Para compatibilidad
                        'is_active' => $catalog->is_active,
                        'display_order' => $catalog->display_order,
                        'image_groups' => $catalog->activeImageGroups->map(function ($group) {
                            return [
                                'id' => $group->id,
                                'name' => $group->name,
                                'description' => $group->description,
                                'slug' => $group->slug,
                                'images_count' => $group->group_images_count,
                                'display_order' => $group->display_order,
                                'cover_image' => $group->cover_image ? [
                                    'id' => $group->cover_image->id,
                                    'image_url' => $group->cover_image->image_url,
                                    'thumbnail_url' => $group->cover_image->thumbnail_url
                                ] : null
                            ];
                        })
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $catalogs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener catálogos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener imágenes de un grupo específico con paginación
     */
    public function getImageGroupImages($catalogId, $groupId)
    {
        try {
            $catalog = Catalog::where('is_active', true)->findOrFail($catalogId);
            $imageGroup = CatalogImageGroup::where('catalog_id', $catalogId)
                ->where('is_active', true)
                ->findOrFail($groupId);

            $perPage = 1000; // Aumentado de 20 a 1000 imágenes por página
            $page = request('page', 1);

            $images = CatalogPdf::where('catalog_id', $catalogId)
                ->where('image_group_id', $groupId)
                ->orderBy('display_order', 'asc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'data' => [
                    'catalog' => $catalog,
                    'image_group' => $imageGroup,
                    'images' => $images->items(),
                    'pagination' => [
                        'current_page' => $images->currentPage(),
                        'last_page' => $images->lastPage(),
                        'per_page' => $images->perPage(),
                        'total' => $images->total(),
                        'has_more' => $images->hasMorePages()
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener imágenes del grupo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener todos los grupos de imágenes de un catálogo
     */
    public function getCatalogImageGroups($catalogId)
    {
        try {
            $catalog = Catalog::where('is_active', true)->findOrFail($catalogId);

            $imageGroups = CatalogImageGroup::where('catalog_id', $catalogId)
                ->active()
                ->ordered()
                ->withCount('images as images_count')
                ->with(['images' => function ($query) {
                    $query->orderBy('display_order', 'asc')->limit(1); // Solo la primera imagen como cover
                }])
                ->get()
                ->map(function ($group) {
                    return [
                        'id' => $group->id,
                        'name' => $group->name,
                        'description' => $group->description,
                        'slug' => $group->slug,
                        'is_active' => $group->is_active,
                        'images_count' => $group->images_count,
                        'display_order' => $group->display_order,
                        'cover_image' => $group->images->first() ? [
                            'id' => $group->images->first()->id,
                            'image_url' => $group->images->first()->image_url,
                            'thumbnail_url' => $group->images->first()->thumbnail_url
                        ] : null
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'catalog' => $catalog,
                    'image_groups' => $imageGroups
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener grupos de imágenes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear un nuevo grupo de imágenes
     */
    public function createImageGroup(Request $request, $catalogId)
    {
        try {
            // Validar que el catálogo existe
            $catalog = Catalog::findOrFail($catalogId);

            // Validar los datos del grupo
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:500',
                'is_active' => 'boolean',
                'display_order' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Obtener el siguiente display_order si no se proporciona
            $displayOrder = $request->display_order;
            if ($displayOrder === null) {
                $displayOrder = CatalogImageGroup::where('catalog_id', $catalogId)->max('display_order') + 1;
            }

            // Crear el grupo de imágenes (siempre activo por defecto)
            $imageGroup = CatalogImageGroup::create([
                'catalog_id' => $catalogId,
                'name' => $request->name,
                'description' => $request->description,
                'slug' => Str::slug($request->name),
                'is_active' => $request->has('is_active') ? (bool)$request->is_active : true,
                'display_order' => $displayOrder
            ]);

            // Cargar el conteo de imágenes (será 0 para un grupo nuevo)
            $imageGroup->loadCount('images');

            return response()->json([
                'success' => true,
                'message' => 'Grupo de imágenes creado exitosamente',
                'data' => [
                    'id' => $imageGroup->id,
                    'name' => $imageGroup->name,
                    'description' => $imageGroup->description,
                    'slug' => $imageGroup->slug,
                    'images_count' => 0,
                    'display_order' => $imageGroup->display_order,
                    'is_active' => $imageGroup->is_active,
                    'catalog_id' => $imageGroup->catalog_id,
                    'created_at' => $imageGroup->created_at,
                    'updated_at' => $imageGroup->updated_at
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el grupo de imágenes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un grupo de imágenes
     */
    public function deleteImageGroup($catalogId, $groupId)
    {
        try {
            // Validar que el catálogo existe
            $catalog = Catalog::findOrFail($catalogId);

            // Buscar el grupo de imágenes
            $imageGroup = CatalogImageGroup::where('catalog_id', $catalogId)
                ->where('id', $groupId)
                ->first();

            if (!$imageGroup) {
                return response()->json([
                    'success' => false,
                    'message' => 'Grupo de imágenes no encontrado'
                ], 404);
            }

            // Eliminar todas las imágenes asociadas al grupo
            $images = CatalogPdf::where('image_group_id', $groupId)->get();

            foreach ($images as $image) {
                // Eliminar archivos físicos del storage
                if ($image->file_path && Storage::disk('public')->exists($image->file_path)) {
                    Storage::disk('public')->delete($image->file_path);
                }
                if ($image->thumbnail_path && Storage::disk('public')->exists($image->thumbnail_path)) {
                    Storage::disk('public')->delete($image->thumbnail_path);
                }

                // Eliminar registro de la base de datos
                $image->delete();
            }

            // Eliminar el grupo de imágenes
            $imageGroup->delete();

            return response()->json([
                'success' => true,
                'message' => 'Grupo de imágenes eliminado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el grupo de imágenes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar el estado activo/inactivo de un grupo de imágenes
     */
    public function toggleImageGroupStatus($catalogId, $groupId)
    {
        try {
            $catalog = Catalog::findOrFail($catalogId);
            $group = CatalogImageGroup::where('id', $groupId)
                ->where('catalog_id', $catalogId)
                ->firstOrFail();

            $group->is_active = !$group->is_active;
            $group->save();

            return response()->json([
                'success' => true,
                'message' => 'Estado del grupo cambiado exitosamente',
                'data' => ['is_active' => $group->is_active]
            ]);
        } catch (\Exception $e) {
            Log::error('Error al cambiar estado del grupo de imágenes', [
                'catalog_id' => $catalogId,
                'group_id' => $groupId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar el estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear thumbnail de una imagen
     */
    private function createThumbnail($sourcePath, $thumbnailPath, $maxWidth = 300, $maxHeight = 300)
    {
        try {
            $imageInfo = getimagesize($sourcePath);
            if (!$imageInfo) {
                return false;
            }

            $sourceWidth = $imageInfo[0];
            $sourceHeight = $imageInfo[1];
            $mimeType = $imageInfo['mime'];

            // Calcular nuevas dimensiones manteniendo la proporción
            $ratio = min($maxWidth / $sourceWidth, $maxHeight / $sourceHeight);
            $newWidth = intval($sourceWidth * $ratio);
            $newHeight = intval($sourceHeight * $ratio);

            // Crear imagen desde el archivo fuente
            switch ($mimeType) {
                case 'image/jpeg':
                    $sourceImage = imagecreatefromjpeg($sourcePath);
                    break;
                case 'image/png':
                    $sourceImage = imagecreatefrompng($sourcePath);
                    break;
                case 'image/gif':
                    $sourceImage = imagecreatefromgif($sourcePath);
                    break;
                case 'image/webp':
                    $sourceImage = imagecreatefromwebp($sourcePath);
                    break;
                default:
                    return false;
            }

            if (!$sourceImage) {
                return false;
            }

            // Crear imagen de destino
            $thumbnailImage = imagecreatetruecolor($newWidth, $newHeight);

            // Preservar transparencia para PNG y GIF
            if ($mimeType === 'image/png' || $mimeType === 'image/gif') {
                imagealphablending($thumbnailImage, false);
                imagesavealpha($thumbnailImage, true);
                $transparent = imagecolorallocatealpha($thumbnailImage, 255, 255, 255, 127);
                imagefill($thumbnailImage, 0, 0, $transparent);
            }

            // Redimensionar
            imagecopyresampled(
                $thumbnailImage,
                $sourceImage,
                0,
                0,
                0,
                0,
                $newWidth,
                $newHeight,
                $sourceWidth,
                $sourceHeight
            );

            // Guardar thumbnail
            $success = false;
            switch ($mimeType) {
                case 'image/jpeg':
                    $success = imagejpeg($thumbnailImage, $thumbnailPath, 85);
                    break;
                case 'image/png':
                    $success = imagepng($thumbnailImage, $thumbnailPath, 8);
                    break;
                case 'image/gif':
                    $success = imagegif($thumbnailImage, $thumbnailPath);
                    break;
                case 'image/webp':
                    $success = imagewebp($thumbnailImage, $thumbnailPath, 85);
                    break;
            }

            // Limpiar memoria
            imagedestroy($sourceImage);
            imagedestroy($thumbnailImage);

            return $success;
        } catch (\Exception $e) {
            return false;
        }
    }
}
