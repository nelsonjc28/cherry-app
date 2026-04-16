<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\ProductNotification;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProductNotificationController extends Controller
{
    /**
     * Registrar interés del usuario en aviso de stock (producto "próximamente").
     */
    public function store(Request $request, string $id)
    {
        $user = $request->user();

        $producto = Producto::query()->find($id);
        if (! $producto) {
            return response()->json(['message' => 'Producto no encontrado.'], 404);
        }

        $producto->loadMissing('detalles');

        if (! $producto->is_coming_soon) {
            return response()->json([
                'message' => 'Este producto ya está disponible; no es necesario registrarte.',
            ], 422);
        }

        $existing = ProductNotification::query()
            ->where('user_id', $user->id)
            ->where('producto_id', $id)
            ->first();

        if ($existing && ! $existing->is_notified) {
            return response()->json([
                'message' => 'Ya estás registrado para recibir avisos de este producto.',
            ], 422);
        }

        if ($existing && $existing->is_notified) {
            $existing->update(['is_notified' => false]);
        } else {
            ProductNotification::query()->create([
                'user_id' => $user->id,
                'producto_id' => $id,
                'is_notified' => false,
            ]);
        }

        Notification::query()->create([
            'type' => 'product_interest',
            'title' => 'Interés en Producto Próximo',
            'message' => "{$user->full_name} ({$user->email}) se interesó en el producto '{$producto->descripcion}'",
            'data' => [
                'product_id' => $producto->id,
                'product_title' => $producto->descripcion,
                'user_id' => $user->id,
                'user_name' => $user->full_name,
                'user_email' => $user->email,
            ],
            'is_read' => false,
            'target_user_role' => 'admin',
            'target_user_id' => null,
            'related_order_id' => null,
        ]);

        Log::info('Suscripción a aviso de stock de producto', [
            'producto_id' => $id,
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Te avisaremos por correo cuando este producto tenga existencias.',
        ]);
    }
}
