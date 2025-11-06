<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TermsConditions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TermsConditionsController extends Controller
{
    /**
     * Obtener los términos y condiciones activos (público)
     */
    public function show()
    {
        $terms = TermsConditions::where('is_active', true)->first();
        
        if (!$terms) {
            return response()->json([
                'success' => false,
                'message' => 'No hay términos y condiciones disponibles'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $terms
        ]);
    }

    /**
     * Obtener todos los términos (admin)
     */
    public function index()
    {
        $terms = TermsConditions::orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $terms
        ]);
    }

    /**
     * Crear nuevos términos (admin)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'version' => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // Desactivar términos anteriores
        TermsConditions::where('is_active', true)->update(['is_active' => false]);

        $terms = TermsConditions::create([
            'title' => $request->input('title'),
            'content' => $request->input('content'),
            'version' => $request->input('version'),
            'is_active' => true,
            'published_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Términos y condiciones creados exitosamente',
            'data' => $terms
        ], 201);
    }

    /**
     * Actualizar términos existentes (admin)
     */
    public function update(Request $request, $id)
    {
        $terms = TermsConditions::find($id);
        
        if (!$terms) {
            return response()->json([
                'success' => false,
                'message' => 'Términos y condiciones no encontrados'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'version' => 'sometimes|string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // Si se va a activar estos términos, desactivar los demás
        if ($request->has('is_active') && $request->is_active) {
            TermsConditions::where('id', '!=', $id)->update(['is_active' => false]);
        }

        $terms->update($request->only(['title', 'content', 'version', 'is_active']));

        if ($request->has('is_active') && $request->is_active) {
            $terms->update(['published_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Términos y condiciones actualizados exitosamente',
            'data' => $terms
        ]);
    }

    /**
     * Eliminar términos (admin)
     */
    public function destroy($id)
    {
        $terms = TermsConditions::find($id);
        
        if (!$terms) {
            return response()->json([
                'success' => false,
                'message' => 'Términos y condiciones no encontrados'
            ], 404);
        }

        // No permitir eliminar los términos activos
        if ($terms->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden eliminar términos activos'
            ], 400);
        }

        $terms->delete();

        return response()->json([
            'success' => true,
            'message' => 'Términos y condiciones eliminados exitosamente'
        ]);
    }

    /**
     * Activar términos específicos (admin)
     */
    public function activate($id)
    {
        $terms = TermsConditions::find($id);
        
        if (!$terms) {
            return response()->json([
                'success' => false,
                'message' => 'Términos y condiciones no encontrados'
            ], 404);
        }

        // Desactivar todos los términos
        TermsConditions::query()->update(['is_active' => false]);

        // Activar los seleccionados
        $terms->publish();

        return response()->json([
            'success' => true,
            'message' => 'Términos y condiciones activados exitosamente',
            'data' => $terms
        ]);
    }
}
