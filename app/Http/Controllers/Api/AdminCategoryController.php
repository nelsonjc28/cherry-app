<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AdminCategoryController extends Controller
{
    /**
     * Obtener todas las categorías
     */
    public function index()
    {
        try {
            $categories = Category::orderBy('name')->get();
            
            return response()->json([
                'success' => true,
                'categories' => $categories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener categorías: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener una categoría específica
     */
    public function show($id)
    {
        try {
            $category = Category::findOrFail($id);
            
            return response()->json([
                'success' => true,
                'category' => $category
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear una nueva categoría
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:categories,name',
                'description' => 'nullable|string',
                'code' => 'nullable|string|max:100|unique:categories,code',
                'is_active' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $category = Category::create([
                'name' => $request->name,
                'slug' => \Illuminate\Support\Str::slug($request->name),
                'description' => $request->description,
                'code' => $request->code,
                'is_active' => $request->is_active ?? true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Categoría creada exitosamente',
                'category' => $category
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar una categoría
     */
    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:categories,name,' . $id,
                'description' => 'nullable|string',
                'code' => 'nullable|string|max:100|unique:categories,code,' . $id,
                'is_active' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $category = Category::findOrFail($id);
            $category->update([
                'name' => $request->name,
                'slug' => \Illuminate\Support\Str::slug($request->name),
                'description' => $request->description,
                'code' => $request->code,
                'is_active' => $request->is_active ?? $category->is_active
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Categoría actualizada exitosamente',
                'category' => $category
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una categoría
     */
    public function destroy($id)
    {
        try {
            $category = Category::findOrFail($id);
            $category->delete();

            return response()->json([
                'success' => true,
                'message' => 'Categoría eliminada exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener solo los IDs de productos que están en categorías
     */
    public function getCategoryProductIds(Request $request)
    {
        try {
            // Obtener solo los IDs de productos que están en categorías
            $categoryProductIds = CategoryProduct::pluck('external_product_id')->toArray();
            

            
            return response()->json([
                'success' => true,
                'data' => $categoryProductIds
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener IDs de productos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Agregar productos a una categoría
     */
    public function addProducts(Request $request, $categoryId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'products' => 'required|array',
                'products.*.external_product_id' => 'required|string',
                'products.*.product_name' => 'required|string',
                'products.*.product_description' => 'nullable|string',
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

            $category = Category::findOrFail($categoryId);
            $products = $request->input('products');
            $addedProducts = [];

            foreach ($products as $productData) {
                $product = CategoryProduct::create([
                    'category_id' => $categoryId,
                    'external_product_id' => $productData['external_product_id'],
                    'product_name' => $productData['product_name'],
                    'product_description' => $productData['product_description'],
                    'product_price' => $productData['product_price'] ?? 0,
                    'product_category' => $productData['product_category'],
                    'product_metadata' => $productData['product_metadata'] ?? [],
                    'display_order' => CategoryProduct::where('category_id', $categoryId)->max('display_order') + 1
                ]);

                $addedProducts[] = $product;
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
     * Remover un producto de una categoría
     */
    public function removeProduct(Request $request, $categoryId, $productId)
    {
        try {
            $product = CategoryProduct::where('category_id', $categoryId)
                ->where('id', $productId)
                ->firstOrFail();

            $product->delete();

            return response()->json([
                'success' => true,
                'message' => 'Producto removido exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al remover producto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos de una categoría específica
     */
    public function getCategoryProducts(Request $request, $categoryId)
    {
        try {
            $category = Category::findOrFail($categoryId);
            $products = CategoryProduct::where('category_id', $categoryId)
                ->orderBy('display_order')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => $category,
                    'products' => $products
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener productos de la categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reordenar productos de una categoría
     */
    public function reorderProducts(Request $request, $categoryId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'products' => 'required|array',
                'products.*.id' => 'required|integer',
                'products.*.display_order' => 'required|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $products = $request->input('products');

            foreach ($products as $productData) {
                CategoryProduct::where('id', $productData['id'])
                    ->where('category_id', $categoryId)
                    ->update(['display_order' => $productData['display_order']]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Orden actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar orden: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado de una categoría
     */
    public function toggleStatus($id)
    {
        try {
            $category = Category::findOrFail($id);
            $category->is_active = !$category->is_active;
            $category->save();

            return response()->json([
                'success' => true,
                'message' => 'Estado de la categoría actualizado exitosamente',
                'data' => $category
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar estado: ' . $e->getMessage()
            ], 500);
        }
    }
}
