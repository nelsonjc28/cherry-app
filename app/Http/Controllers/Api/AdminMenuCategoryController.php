<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MenuCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class AdminMenuCategoryController extends Controller
{
    /**
     * Obtener categorías del menú
     */
    public function index()
    {
        try {
            $menuCategories = MenuCategory::with('category')
                ->where('is_active', true)
                ->orderBy('order')
                ->get()
                ->pluck('category');

            return response()->json([
                'success' => true,
                'data' => $menuCategories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las categorías del menú: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Agregar categoría al menú
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'category_id' => 'required|exists:categories,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verificar si la categoría ya está en el menú
            $existing = MenuCategory::where('category_id', $request->category_id)->first();
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta categoría ya está en el menú'
                ], 400);
            }

            // Obtener el siguiente orden
            $nextOrder = MenuCategory::max('order') + 1;

            // Crear la entrada del menú
            $menuCategory = MenuCategory::create([
                'category_id' => $request->category_id,
                'order' => $nextOrder,
                'is_active' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Categoría agregada al menú exitosamente',
                'data' => $menuCategory->load('category')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al agregar la categoría al menú: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar orden de las categorías del menú
     */
    public function updateOrder(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'categoryIds' => 'required|array',
                'categoryIds.*' => 'required|exists:categories,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            try {
                // Actualizar el orden de cada categoría
                foreach ($request->categoryIds as $index => $categoryId) {
                    MenuCategory::where('category_id', $categoryId)
                        ->update(['order' => $index]);
                }

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Orden del menú actualizado exitosamente'
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el orden del menú: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remover categoría del menú
     */
    public function destroy($id)
    {
        try {
            $menuCategory = MenuCategory::where('category_id', $id)->first();
            
            if (!$menuCategory) {
                return response()->json([
                    'success' => false,
                    'message' => 'Categoría no encontrada en el menú'
                ], 404);
            }

            $menuCategory->delete();

            // Reordenar las categorías restantes
            $remainingCategories = MenuCategory::orderBy('order')->get();
            foreach ($remainingCategories as $index => $category) {
                $category->update(['order' => $index]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Categoría removida del menú exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al remover la categoría del menú: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener categorías disponibles (no en el menú)
     */
    public function getAvailableCategories()
    {
        try {
            $menuCategoryIds = MenuCategory::pluck('category_id');
            
            $availableCategories = Category::whereNotIn('id', $menuCategoryIds)
                ->where('is_active', true)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $availableCategories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las categorías disponibles: ' . $e->getMessage()
            ], 500);
        }
    }
}
