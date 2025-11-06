<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrivacyPolicy;
use App\Models\TermsConditions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PrivacyPolicyController extends Controller
{
    /**
     * Obtener la política de privacidad activa (pública)
     */
    public function show()
    {
        $policy = TermsConditions::where('is_active', true)->first();
        
        if (!$policy) {
            return response()->json([
                'message' => 'No hay terminos y condiciones disponibles'
            ], 404);
        }

        return response()->json([
            'data' => $policy
        ]);
    }

    /**
     * Obtener todas las políticas (admin)
     */
    public function index()
    {
        $policies = TermsConditions::orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'data' => $policies
        ]);
    }

    /**
     * Crear nueva política (admin)
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
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // Desactivar políticas anteriores
        TermsConditions::where('is_active', true)->update(['is_active' => false]);

        $policy = TermsConditions::create([
            'title' => $request->title,
            'content' => $request->content,
            'version' => $request->version,
            'is_active' => true,
            'published_at' => now()
        ]);

        return response()->json([
            'message' => 'Terminos y condiciones creados exitosamente',
            'data' => $policy
        ], 201);
    }

    /**
     * Actualizar política existente (admin)
     */
    public function update(Request $request, $id)
    {
        $policy = TermsConditions::find($id);
        
        if (!$policy) {
            return response()->json([
                'message' => 'Terminos y condiciones no encontrados'
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
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // Si se va a activar esta política, desactivar las demás
        if ($request->has('is_active') && $request->is_active) {
            PrivacyPolicy::where('id', '!=', $id)->update(['is_active' => false]);
        }

        $policy->update($request->only(['title', 'content', 'version', 'is_active']));

        if ($request->has('is_active') && $request->is_active) {
            $policy->published_at = now();
            $policy->save();
        }

        return response()->json([
            'message' => 'Terminos y condiciones actualizados exitosamente',
            'data' => $policy
        ]);
    }

    /**
     * Eliminar política (admin)
     */
    public function destroy($id)
    {
        $policy = TermsConditions::find($id);
        
        if (!$policy) {
            return response()->json([
                'message' => 'Terminos y condiciones no encontrados'
            ], 404);
        }

        // No permitir eliminar la política activa
        if ($policy->is_active) {
            return response()->json([
                'message' => 'No se puede eliminar una termino y condicion activa'
            ], 400);
        }

        $policy->delete();

        return response()->json([
            'message' => 'Terminos y condiciones eliminados exitosamente'
        ]);
    }

    /**
     * Activar política específica (admin)
     */
    public function activate($id)
    {
        $policy = PrivacyPolicy::find($id);
        
        if (!$policy) {
            return response()->json([
                'message' => 'Terminos y condiciones no encontrados'
            ], 404);
        }

        // Desactivar todas las políticas
        PrivacyPolicy::query()->update(['is_active' => false]);

        // Activar la seleccionada
        $policy->publish();

        return response()->json([
            'message' => 'Terminos y condiciones activados exitosamente',
            'data' => $policy
        ]);
    }
}
