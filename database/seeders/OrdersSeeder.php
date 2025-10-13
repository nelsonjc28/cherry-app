<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\Address;
use Carbon\Carbon;

class OrdersSeeder extends Seeder
{
    public function run()
    {
        // Obtener usuarios existentes
        $users = User::where('role_id', 2)->get(); // Clientes
        
        if ($users->isEmpty()) {
            $this->command->warn('No hay usuarios clientes. Ejecuta primero TestUserSeeder.');
            return;
        }

        // Productos de ejemplo
        $products = [
            ['name' => 'Camiseta Premium', 'price' => 299.99],
            ['name' => 'Pantalón Jeans', 'price' => 599.99],
            ['name' => 'Zapatos Deportivos', 'price' => 899.99],
            ['name' => 'Chaqueta de Cuero', 'price' => 1299.99],
            ['name' => 'Reloj Elegante', 'price' => 1999.99],
            ['name' => 'Gorra Casual', 'price' => 199.99],
            ['name' => 'Bufanda de Lana', 'price' => 399.99],
            ['name' => 'Cinturón de Cuero', 'price' => 499.99],
            ['name' => 'Mochila Urbana', 'price' => 799.99],
            ['name' => 'Sudadera con Capucha', 'price' => 699.99],
        ];

        $this->command->info('Creando órdenes de prueba...');

        // Crear órdenes para los últimos 12 meses
        $startDate = Carbon::now()->subMonths(12);
        $endDate = Carbon::now();

        for ($i = 0; $i < 150; $i++) {
            $user = $users->random();
            $orderDate = Carbon::createFromTimestamp(
                rand($startDate->timestamp, $endDate->timestamp)
            );

            // Crear dirección si no existe
            $address = $user->addresses()->first();
            if (!$address) {
                $address = Address::create([
                    'user_id' => $user->id,
                    'street_address' => 'Calle Ejemplo ' . rand(1, 999),
                    'city' => 'Ciudad de México',
                    'state' => 'CDMX',
                    'postal_code' => sprintf('%05d', rand(10000, 99999)),
                    'country' => 'México',
                    'is_default' => true,
                ]);
            }

            // Crear orden
            $order = Order::create([
                'user_id' => $user->id,
                'address_id' => $address->id,
                'total_amount' => 0, // Se calculará después
                'status' => $this->getRandomStatus(),
                'payment_method' => rand(0, 1) ? 'mercadopago' : 'card',
                'mercadopago_payment_id' => 'test_payment_' . uniqid(),
                'external_reference' => 'test_ref_' . uniqid(),
                'created_at' => $orderDate,
                'updated_at' => $orderDate,
            ]);

            // Agregar items a la orden
            $numItems = rand(1, 4);
            $totalAmount = 0;

            for ($j = 0; $j < $numItems; $j++) {
                $product = $products[array_rand($products)];
                $quantity = rand(1, 3);
                $price = $product['price'];
                $subtotal = $price * $quantity;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => rand(1, 100), // ID ficticio
                    'product_name' => $product['name'],
                    'quantity' => $quantity,
                    'price' => $price,
                    'subtotal' => $subtotal,
                ]);

                $totalAmount += $subtotal;
            }

            // Actualizar total de la orden
            $order->update(['total_amount' => $totalAmount]);
        }

        $this->command->info('✅ Se crearon 150 órdenes de prueba con items');
    }

    private function getRandomStatus()
    {
        $statuses = ['pending', 'pagado', 'en_espera_envio', 'enviado'];
        $weights = [10, 20, 15, 25]; // Más órdenes completadas para las gráficas
        
        $rand = rand(1, 100);
        $cumulative = 0;
        
        foreach ($weights as $index => $weight) {
            $cumulative += $weight;
            if ($rand <= $cumulative) {
                return $statuses[$index];
            }
        }
        
        return 'enviado';
    }
}
