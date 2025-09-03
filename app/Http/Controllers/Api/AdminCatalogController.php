<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\CatalogPdf;
use App\Models\CatalogProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;


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
    public function updateOrder(Request $request, $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);
            
            // Si se está asignando un display_order (agregando al home)
            if ($request->has('display_order') && $request->display_order !== null) {
                // Verificar que no se exceda el límite de 4 catálogos
                $currentHomeCatalogs = Catalog::whereNotNull('display_order')->count();
                if ($currentHomeCatalogs >= 4 && $catalog->display_order === null) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se pueden agregar más de 4 catálogos al home'
                    ], 422);
                }
            }

            $validator = Validator::make($request->all(), [
                'display_order' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $catalog->update(['display_order' => $request->display_order]);

            return response()->json([
                'success' => true,
                'message' => 'Orden del catálogo actualizado exitosamente',
                'data' => $catalog
            ]);
        } catch (\Exception $e) {
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
     * Agregar PDFs al catálogo
     */
    public function addPdfs(Request $request, $id)
    {
        try {
            $catalog = Catalog::findOrFail($id);

            // Verificar si el catálogo ya tiene un PDF
            $existingPdfCount = CatalogPdf::where('catalog_id', $catalog->id)->count();
            if ($existingPdfCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este catálogo ya tiene un PDF. Debes eliminar el PDF existente antes de subir uno nuevo.'
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'pdfs.*' => 'required|file|mimes:pdf' // Máximo 2MB (coincide con configuración de PHP)
            ]);

            if ($validator->fails()) {
                $errors = $validator->errors();
                $errorMessages = [];
                
                foreach ($errors->all() as $error) {
                    if (strpos($error, 'max') !== false) {
                        $errorMessages[] = 'El archivo excede el tamaño máximo permitido (2MB)';
                    } elseif (strpos($error, 'mimes') !== false) {
                        $errorMessages[] = 'El archivo debe ser un PDF válido';
                    } else {
                        $errorMessages[] = $error;
                    }
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación: ' . implode(', ', $errorMessages),
                    'errors' => $errors
                ], 422);
            }

            $uploadedPdfs = [];
            
            if ($request->hasFile('pdfs')) {
                // Crear directorio si no existe
                if (!file_exists(public_path('catalog-pdfs'))) {
                    mkdir(public_path('catalog-pdfs'), 0755, true);
                }
                
                // Solo procesar el primer PDF ya que solo permitimos uno por catálogo
                $pdf = $request->file('pdfs')[0];
                
                // Validar que el archivo sea válido
                if (!$pdf->isValid()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'El archivo PDF no es válido.'
                    ], 422);
                }
                
                $pdfName = time() . '_' . $pdf->getClientOriginalName();
                $pdfPath = 'catalog-pdfs/' . $pdfName;
                
                // Obtener información del archivo ANTES de moverlo
                $pdfSize = $pdf->getSize();
                $pdfMimeType = $pdf->getMimeType();
                
                // Validar que el tamaño sea mayor a 0
                if ($pdfSize <= 0) {
                    return response()->json([
                        'success' => false,
                        'message' => 'El archivo PDF está vacío o corrupto.'
                    ], 422);
                }
                
                // Mover PDF a carpeta pública
                if (!$pdf->move(public_path('catalog-pdfs'), $pdfName)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Error al guardar el archivo PDF.'
                    ], 500);
                }
                
                $catalogPdf = CatalogPdf::create([
                    'catalog_id' => $catalog->id,
                    'pdf_path' => $pdfPath,
                    'pdf_name' => $pdf->getClientOriginalName(),
                    'pdf_size' => $pdfSize,
                    'pdf_mime_type' => $pdfMimeType,
                    'page_count' => $this->getPdfPageCount(public_path('catalog-pdfs/' . $pdfName)),
                    'display_order' => 1 // Siempre será el primer (y único) PDF
                ]);
                
                $uploadedPdfs[] = $catalogPdf;
            }

            if (empty($uploadedPdfs)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo procesar el archivo PDF. Verifica que sea un archivo válido y no esté corrupto.'
                ], 422);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'PDF agregado exitosamente',
                'data' => $uploadedPdfs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al agregar PDFs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un PDF del catálogo
     */
    public function removePdf($catalogId, $pdfId)
    {
        try {
            $catalogPdf = CatalogPdf::where('catalog_id', $catalogId)
                ->where('id', $pdfId)
                ->firstOrFail();

            // Eliminar archivo físico
            $pdfPath = public_path($catalogPdf->pdf_path);
            if (file_exists($pdfPath)) {
                unlink($pdfPath);
            }
            
            $catalogPdf->delete();

            return response()->json([
                'success' => true,
                'message' => 'PDF eliminado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el PDF: ' . $e->getMessage()
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
                ->orderByRaw('ISNULL(display_order), display_order ASC')
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
     */
    public function getPublicCatalogProducts($id)
    {
        try {
            $catalog = Catalog::where('is_active', true)->findOrFail($id);
            
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
     * Helper para obtener el número de páginas de un PDF
     */
    private function getPdfPageCount($filePath)
    {
        if (!file_exists($filePath)) {
            return 1;
        }

        // Por ahora retornamos 1 como valor por defecto
        // En el futuro se puede implementar una solución más robusta
        return 1;
    }
}
