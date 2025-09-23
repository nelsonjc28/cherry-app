<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\Address;

class ProfileController extends Controller
{
    /**
     * Get user profile with addresses
     */
    public function show()
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        // Cargar las direcciones del usuario
        $user->load('addresses');

        return response()->json([
            'message' => 'Perfil obtenido correctamente',
            'user' => $user
        ], 200);
    }

    /**
     * Update user profile
     */
    public function update(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        // Validar los datos de entrada
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'birth_day' => 'nullable|integer|min:1|max:31',
            'birth_month' => 'nullable|string|in:Enero,Febrero,Marzo,Abril,Mayo,Junio,Julio,Agosto,Septiembre,Octubre,Noviembre,Diciembre',
            'birth_year' => 'nullable|integer|min:1900|max:' . (date('Y') - 18),
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validar que el usuario sea mayor de edad
        if ($request->birth_day && $request->birth_month && $request->birth_year) {
            $months = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            
            $monthIndex = array_search($request->birth_month, $months);
            
            // Validar que el mes sea válido y convertir valores a enteros
            if ($monthIndex === false) {
                return response()->json([
                    'message' => 'Mes de nacimiento inválido'
                ], 422);
            }
            
            $year = (int) $request->birth_year;
            $month = (int) ($monthIndex + 1);
            $day = (int) $request->birth_day;
            
            $birthDate = \Carbon\Carbon::createFromDate($year, $month, $day);
            $age = $birthDate->age;
            
            if ($age < 18) {
                return response()->json([
                    'message' => 'Debes ser mayor de edad para usar esta plataforma'
                ], 422);
            }
        }

        try {
            // Actualizar el usuario
            $user->update([
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'phone' => $request->phone,
                'birth_day' => $request->birth_day,
                'birth_month' => $request->birth_month,
                'birth_year' => $request->birth_year,
            ]);

            return response()->json([
                'message' => 'Perfil actualizado correctamente',
                'user' => $user->fresh()
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar el perfil: ' . $e->getMessage()
            ], 500);
        }
    }
}
