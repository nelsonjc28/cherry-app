<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WelcomeSection;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;


class AdminWelcomeSectionController extends Controller
{
    /**
     * Obtener todas las secciones de bienvenida
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $sections = WelcomeSection::orderBy('display_order', 'ASC')->get();

            return response()->json([
                'success' => true,
                'sections' => $sections
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener secciones: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener una sección específica
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $section = WelcomeSection::find($id);

            if (!$section) {
                return response()->json([
                    'success' => false,
                    'error' => 'Sección no encontrada'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'section' => $section
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener sección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear una nueva sección
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Verificar autenticación
            $user = $request->user();
            if (!$user || !$user->isAdminOrOperator()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Acceso no autorizado'
                ], 401);
            }

            // Validar datos requeridos usando configuración centralizada
            $validator = Validator::make($request->all(), [
                'title' => 'required|string',
                'title_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
                'subtitle' => 'required|string',
                'button_text' => 'required|string|max:255',
                'button_url' => 'required|string|max:500',
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp',
                'is_active' => 'boolean',
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

            // Procesar imagen
            $imagePath = null;
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                
                // Crear directorio si no existe
                $uploadPath = public_path('images/welcome-sections');
                if (!file_exists($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }
                
                // Generar nombre único para la imagen
                $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
                $imagePath = 'images/welcome-sections/' . $imageName;
                
                // Mover imagen a public/images/welcome-sections
                if (!$image->move($uploadPath, $imageName)) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Error al guardar la imagen'
                    ], 500);
                }
            }

            // Crear sección
            $section = WelcomeSection::create([
                'title' => $request->input('title'),
                'title_color' => $request->input('title_color', '#EA2630'),
                'subtitle' => $request->input('subtitle'),
                'button_text' => $request->input('button_text'),
                'button_url' => $request->input('button_url'),
                'image_path' => $imagePath,
                'is_active' => $request->boolean('is_active', true),
                'display_order' => $request->display_order != null ? $request->display_order : $this->newPosition()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sección creada exitosamente',
                'section' => $section
            ], 201);
            
        } catch (\Exception $e) {

            
            return response()->json([
                'success' => false,
                'error' => 'Error al crear sección: ' . $e->getMessage()
            ], 500);
        }
    }


    public function newPosition()
    {
            return WelcomeSection::orderBy('display_order', 'desc')->first()->display_order + 1;
    }
    /**
     * Actualizar una sección
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            // Logs temporales para debugging

            
            // Verificar si es una petición PUT simulada
            if ($request->input('_method') === 'PUT') {
    
            }
            
            // Verificar autenticación
            $user = $request->user();
            if (!$user || !$user->isAdminOrOperator()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Acceso no autorizado'
                ], 401);
            }

            // Buscar la sección
            $section = WelcomeSection::find($id);
            if (!$section) {
                return response()->json([
                    'success' => false,
                    'error' => 'Sección no encontrada'
                ], 404);
            }

            // Preparar datos para actualización
            $updateData = [];
            
            // Procesar campos de texto
            $textFields = ['title', 'title_color', 'subtitle', 'button_text', 'button_url'];
            foreach ($textFields as $field) {
                if ($request->has($field) && $request->input($field) !== null) {
                    $updateData[$field] = $request->input($field);
    
                }
            }
            
            // Procesar campos booleanos y numéricos
            if ($request->has('is_active')) {
                $updateData['is_active'] = $request->boolean('is_active');
    
            }
            
            if ($request->has('display_order')) {
                $updateData['display_order'] = (int) $request->input('display_order');
    
            }

            // Procesar imagen si se proporciona
            if ($request->hasFile('image')) {
                $image = $request->file('image');

                
                // Validar imagen usando configuración centralizada
                $imageValidator = Validator::make($request->all(), [
                    'image' => 'image|mimes:jpeg,png,jpg,gif,webp',
                ], [
                    'image.mimes' => 'La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP',
                    'image.image' => 'El archivo debe ser una imagen válida'
                ]);

                if ($imageValidator->fails()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Error de validación de imagen',
                        'errors' => $imageValidator->errors()
                    ], 422);
                }
                
                // Crear directorio si no existe
                $uploadPath = public_path('images/welcome-sections');
                if (!file_exists($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }
                
                // Generar nombre único para la imagen
                $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
                $imagePath = 'images/welcome-sections/' . $imageName;
                
                // Mover imagen a public/images/welcome-sections
                if ($image->move($uploadPath, $imageName)) {
                    // Eliminar imagen anterior si existe
                    if ($section->image_path && file_exists(public_path($section->image_path))) {
                        unlink(public_path($section->image_path));
                    }
                    
                    $updateData['image_path'] = $imagePath;

                } else {
    
                    return response()->json([
                        'success' => false,
                        'error' => 'Error al guardar la imagen'
                    ], 500);
                }
            }

            // Actualizar sección
            if (!empty($updateData)) {
                $section->update($updateData);
                

                
                return response()->json([
                    'success' => true,
                    'message' => 'Sección actualizada exitosamente',
                    'section' => $section->fresh()
                ]);
            } else {

                return response()->json([
                    'success' => false,
                    'error' => 'No se proporcionaron datos para actualizar'
                ], 400);
            }
            
        } catch (\Exception $e) {

            
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar sección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar una sección
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            // Verificar autenticación
            $user = $request->user();
            if (!$user || !$user->isAdminOrOperator()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Acceso no autorizado'
                ], 401);
            }

            // Buscar la sección
            $section = WelcomeSection::find($id);
            if (!$section) {
                return response()->json([
                    'success' => false,
                    'error' => 'Sección no encontrada'
                ], 404);
            }

            // Eliminar imagen física si existe
            if ($section->image_path && file_exists(public_path($section->image_path))) {
                unlink(public_path($section->image_path));
            }

            // Eliminar sección
            $section->delete();

            return response()->json([
                'success' => true,
                'message' => 'Sección eliminada exitosamente'
            ]);
            
        } catch (\Exception $e) {

            
            return response()->json([
                'success' => false,
                'error' => 'Error al eliminar sección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar estado activo/inactivo
     */
    public function toggleStatus(Request $request, $id): JsonResponse
    {
        try {
            $section = WelcomeSection::find($id);

            if (!$section) {
                return response()->json([
                    'success' => false,
                    'error' => 'Sección no encontrada'
                ], 404);
            }

            $section->update([
                'is_active' => !$section->is_active
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Estado cambiado exitosamente',
                'section' => $section
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al cambiar estado: ' . $e->getMessage()
            ], 500);
        }
    }
} 