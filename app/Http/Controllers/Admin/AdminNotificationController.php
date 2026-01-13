<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminNotificationController extends Controller
{
    /**
     * Notificar al admin cuando un usuario se interesa en un producto próximo
     */
    public function notifyProductInterest(Request $request)
    {
        try {
            $validated = $request->validate([
                'product_id' => 'required|string',
                'product_title' => 'required|string',
                'user_id' => 'required|integer|exists:users,id',
                'user_name' => 'required|string',
                'user_email' => 'required|email'
            ]);

            // Crear notificación para el admin
            Notification::create([
                'type' => 'product_interest',
                'title' => 'Interés en Producto Próximo',
                'message' => "{$validated['user_name']} ({$validated['user_email']}) se interesó en el producto '{$validated['product_title']}'",
                'data' => [
                    'product_id' => $validated['product_id'],
                    'product_title' => $validated['product_title'],
                    'user_id' => $validated['user_id'],
                    'user_name' => $validated['user_name'],
                    'user_email' => $validated['user_email']
                ],
                'is_read' => false,
                'target_user_role' => 'admin',
                'target_user_id' => null,
                'related_order_id' => null
            ]);

            Log::info('Notificación de interés en producto creada', [
                'product_id' => $validated['product_id'],
                'user_id' => $validated['user_id']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Interés registrado correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error al crear notificación de interés en producto', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al registrar el interés: ' . $e->getMessage()
            ], 500);
        }
    }
}

