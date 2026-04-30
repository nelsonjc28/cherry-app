<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Models\Address;

class AddressController extends Controller
{
    /**
     * Test endpoint to verify API is working
     */
    public function test()
    {
        return response()->json([
            'message' => 'API de direcciones funcionando correctamente',
            'timestamp' => now(),
            'status' => 'success'
        ], 200);
    }

    /**
     * Get all addresses for the authenticated user
     */
    public function index()
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        $addresses = $user->addresses()->orderBy('is_default', 'desc')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Direcciones obtenidas correctamente',
            'addresses' => $addresses
        ], 200);
    }

    /**
     * Store a new address for the authenticated user
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        // Validar los datos de entrada
        $validator = Validator::make($request->all(), [
            'street_address' => 'required|string|max:500',
            'street_number_ext' => ['nullable', 'regex:/^[0-9]{0,20}$/'],
            'street_number_int' => ['nullable', 'regex:/^[0-9]{0,20}$/'],
            'city' => 'required|string|max:255',
            'municipality' => 'nullable|string|max:255',
            'colonia' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:255',
            'additional_info' => 'nullable|string|max:1000',
            'is_default' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Si se marca como predeterminada, quitar el estado predeterminado de otras direcciones
            if ($request->is_default) {
                $user->addresses()->update(['is_default' => false]);
            }

            // Crear la nueva dirección
            $address = $user->addresses()->create([
                'street_address' => $request->street_address,
                'street_number_ext' => $request->street_number_ext,
                'street_number_int' => $request->street_number_int,
                'city' => $request->city,
                'municipality' => $request->municipality,
                'colonia' => $request->colonia,
                'state' => $request->state,
                'postal_code' => $request->postal_code,
                'country' => $request->country ?? 'México',
                'additional_info' => $request->additional_info,
                'is_default' => $request->is_default ?? false,
            ]);

            return response()->json([
                'message' => 'Dirección creada correctamente',
                'address' => $address
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al crear la dirección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific address
     */
    public function show($id)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        $address = $user->addresses()->find($id);

        if (!$address) {
            return response()->json(['message' => 'Dirección no encontrada'], 404);
        }

        return response()->json([
            'message' => 'Dirección obtenida correctamente',
            'address' => $address
        ], 200);
    }

    /**
     * Update an existing address
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        $address = $user->addresses()->find($id);

        if (!$address) {
            return response()->json(['message' => 'Dirección no encontrada'], 404);
        }

        // Validar los datos de entrada
        $validator = Validator::make($request->all(), [
            'street_address' => 'required|string|max:500',
            'street_number_ext' => ['nullable', 'regex:/^[0-9]{0,20}$/'],
            'street_number_int' => ['nullable', 'regex:/^[0-9]{0,20}$/'],
            'city' => 'required|string|max:255',
            'municipality' => 'nullable|string|max:255',
            'colonia' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:255',
            'additional_info' => 'nullable|string|max:1000',
            'is_default' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Si se marca como predeterminada, quitar el estado predeterminado de otras direcciones
            if ($request->is_default) {
                $user->addresses()->where('id', '!=', $id)->update(['is_default' => false]);
            }

            // Actualizar la dirección
            $address->update([
                'street_address' => $request->street_address,
                'street_number_ext' => $request->street_number_ext,
                'street_number_int' => $request->street_number_int,
                'city' => $request->city,
                'municipality' => $request->municipality,
                'colonia' => $request->colonia,
                'state' => $request->state,
                'postal_code' => $request->postal_code,
                'country' => $request->country ?? 'México',
                'additional_info' => $request->additional_info,
                'is_default' => $request->is_default ?? false,
            ]);

            return response()->json([
                'message' => 'Dirección actualizada correctamente',
                'address' => $address->fresh()
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar la dirección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an address
     */
    public function destroy($id)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        $address = $user->addresses()->find($id);

        if (!$address) {
            return response()->json(['message' => 'Dirección no encontrada'], 404);
        }

        try {
            // Si es la dirección predeterminada, marcar otra como predeterminada si existe
            if ($address->is_default) {
                $otherAddress = $user->addresses()->where('id', '!=', $id)->first();
                if ($otherAddress) {
                    $otherAddress->update(['is_default' => true]);
                }
            }

            $address->delete();

            return response()->json([
                'message' => 'Dirección eliminada correctamente'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al eliminar la dirección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Set an address as default
     */
    public function setDefault($id)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        $address = $user->addresses()->find($id);

        if (!$address) {
            return response()->json(['message' => 'Dirección no encontrada'], 404);
        }

        try {
            $address->setAsDefault();

            return response()->json([
                'message' => 'Dirección marcada como predeterminada correctamente',
                'address' => $address->fresh()
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al marcar la dirección como predeterminada: ' . $e->getMessage()
            ], 500);
        }
    }
}
