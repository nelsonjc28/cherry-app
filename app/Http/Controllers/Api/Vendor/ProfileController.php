<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * Perfil del Vendedor.
 *
 * Permite al vendor autenticado ver y actualizar sus propios datos
 * (idvendedor, datos de contacto).
 */
class ProfileController extends Controller
{
    /**
     * Ver perfil del vendor autenticado.
     * Devuelve el user con su idvendedor, role, y opcionalmente
     * la lista de compradores asociados.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
        }

        return response()->json([
            'success' => true,
            'user' => $user->load('role'),
        ]);
    }

    /**
     * Actualiza el idvendedor del vendor autenticado.
     *
     * El idvendedor es el identificador externo del vendor (provisto
     * por la API del ERP). Se valida unicidad: no puede coincidir con
     * el idvendedor de otro vendor. Si el vendor actual no tiene
     * idvendedor y se proporciona uno nuevo, se permite sin validar
     * contra sí mismo.
     */
    public function updateIdvendedor(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
        }

        if (! $user->role || $user->role->name !== 'vendedor') {
            return response()->json([
                'success' => false,
                'message' => 'Solo los usuarios con rol Vendedor pueden registrar su idvendedor.',
            ], 403);
        }

        $validator = \Validator::make($request->all(), [
            'idvendedor' => ['required', 'string', 'max:64'],
        ], [
            'idvendedor.required' => 'El ID Vendedor es obligatorio.',
            'idvendedor.string' => 'El ID Vendedor debe ser una cadena de texto.',
            'idvendedor.max' => 'El ID Vendedor no puede exceder 64 caracteres.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $newId = trim($request->input('idvendedor'));

        // Validar unicidad contra otros vendors (excluyendo al usuario actual).
        $exists = User::query()
            ->where('idvendedor', $newId)
            ->where('role_id', $user->role_id)
            ->where('id', '!=', $user->id)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => "Ya existe otro vendedor registrado con idvendedor '{$newId}'.",
            ], 422);
        }

        $user->idvendedor = $newId;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'ID Vendedor actualizado correctamente.',
            'user' => $user->load('role'),
        ]);
    }
}
