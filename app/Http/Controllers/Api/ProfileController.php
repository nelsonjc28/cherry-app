<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\Address;
use App\Models\Order;
use Illuminate\Support\Facades\Log;

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
            'phone' => 'nullable|string|size:10|regex:/^[0-9]{10}$/',
            'birth_day' => 'nullable|integer|min:1|max:31',
            'birth_month' => 'nullable|string|in:Enero,Febrero,Marzo,Abril,Mayo,Junio,Julio,Agosto,Septiembre,Octubre,Noviembre,Diciembre',
            'birth_year' => 'nullable|integer|min:1900|max:' . (date('Y') - 18),
        ], [
            'phone.size' => 'El teléfono debe tener exactamente 10 dígitos.',
            'phone.regex' => 'El teléfono debe contener solo números.',
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

    /**
     * Get account statements for the authenticated user
     */
    public function getAccountStatements()
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        try {
            // Obtener todas las órdenes del usuario pagadas
            $orders = Order::where('user_id', $user->id)
                ->whereIn('status', ['pagado', 'en_espera_envio', 'enviado'])
                ->orderBy('created_at', 'desc')
                ->get();

            // Formatear órdenes como estados de cuenta
            $statements = $orders->map(function ($order) {
                return [
                    'fecha' => $order->created_at->toISOString(),
                    'cargo' => (float) $order->total_amount,
                    'referencia' => 'Orden #' . str_pad($order->id, 8, '0', STR_PAD_LEFT)
                ];
            });

            return response()->json([
                'success' => true,
                'statements' => $statements
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error al obtener estados de cuenta', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los estados de cuenta'
            ], 500);
        }
    }
}
