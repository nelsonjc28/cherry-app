<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Notification;
use App\Models\Order;
use App\Models\User;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener algunas órdenes y usuarios para las notificaciones de prueba
        $orders = Order::with('user')->take(5)->get();
        $clientUser = User::where('email', 'cliente@cherrycentral.com')->first();

        if ($orders->count() > 0) {
            foreach ($orders as $order) {
                // Crear notificación de pago recibido para admin
                Notification::create([
                    'type' => 'payment_received',
                    'title' => 'Nuevo Pago Recibido',
                    'message' => "Se ha recibido un pago de {$order->user->first_name} {$order->user->last_name} por $" . number_format($order->total_amount, 2),
                    'data' => [
                        'order_id' => $order->id,
                        'user_id' => $order->user_id,
                        'amount' => $order->total_amount,
                        'payment_method' => $order->payment_method
                    ],
                    'target_user_role' => 'admin',
                    'related_order_id' => $order->id,
                    'is_read' => rand(0, 1) == 1, // Algunas leídas, otras no
                    'created_at' => now()->subMinutes(rand(5, 1440)) // Entre 5 minutos y 24 horas atrás
                ]);

                // Crear notificación de cambio de estado para el usuario (si existe)
                if ($order->user) {
                    Notification::create([
                        'type' => 'order_status_changed',
                        'title' => 'Estado de Pedido Actualizado',
                        'message' => 'Tu pedido ha sido enviado y está en camino',
                        'data' => [
                            'order_id' => $order->id,
                            'old_status' => 'en_espera_envio',
                            'new_status' => 'enviado',
                            'order_number' => str_pad($order->id, 8, '0', STR_PAD_LEFT)
                        ],
                        'target_user_role' => 'user',
                        'target_user_id' => $order->user_id,
                        'related_order_id' => $order->id,
                        'is_read' => rand(0, 1) == 1,
                        'created_at' => now()->subMinutes(rand(10, 720))
                    ]);
                }
            }
        }

        // Crear algunas notificaciones adicionales para el admin
        for ($i = 1; $i <= 3; $i++) {
            Notification::create([
                'type' => 'payment_received',
                'title' => 'Nuevo Pago Recibido',
                'message' => "Se ha recibido un pago de Cliente Ejemplo {$i} por $" . number_format(rand(5000, 25000), 2),
                'data' => [
                    'order_id' => null,
                    'user_id' => $clientUser ? $clientUser->id : null,
                    'amount' => rand(5000, 25000),
                    'payment_method' => 'card'
                ],
                'target_user_role' => 'admin',
                'is_read' => $i > 1, // Dejar la primera sin leer
                'created_at' => now()->subHours(rand(1, 12))
            ]);
        }

        // Crear notificaciones para el cliente de prueba si existe
        if ($clientUser) {
            for ($i = 1; $i <= 2; $i++) {
                Notification::create([
                    'type' => 'order_status_changed',
                    'title' => 'Estado de Pedido Actualizado',
                    'message' => $i == 1 ? 'Tu pedido está siendo preparado para el envío' : 'Tu pedido ha sido enviado y está en camino',
                    'data' => [
                        'order_id' => null,
                        'old_status' => $i == 1 ? 'pagado' : 'en_espera_envio',
                        'new_status' => $i == 1 ? 'en_espera_envio' : 'enviado',
                        'order_number' => '0000000' . $i
                    ],
                    'target_user_role' => 'user',
                    'target_user_id' => $clientUser->id,
                    'is_read' => $i == 2,
                    'created_at' => now()->subHours(rand(2, 48))
                ]);
            }
        }

        $this->command->info('✅ Notificaciones de prueba creadas exitosamente');
    }
}
