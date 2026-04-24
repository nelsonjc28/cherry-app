<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Comprueba en base de datos prueba cómo se guardan dos “mitades” de compra
 * con el mismo order_group_id. No valida lógica de envío/volumen (aún no existe
 * a nivel de grupo en el app): solo el almacenamiento y la suma explícita.
 */
class OrderGroupIdBehaviorTest extends TestCase
{
    use RefreshDatabase;

    protected function ensureRolesExistentes(): void
    {
        $now = now();
        DB::table('roles')->insertOrIgnore([
            [
                'id' => 1, 'name' => 'admin', 'description' => 'Administrador del sistema',
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'id' => 2, 'name' => 'cliente', 'description' => 'Cliente regular',
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
    }

    public function test_dos_ordenes_mismo_grupo_guardan_totales_independientes_y_suma_manual_nivel_grupo(): void
    {
        $this->ensureRolesExistentes();

        $user = User::create([
            'first_name' => 'Prueba',
            'last_name' => 'Grupo',
            'middle_name' => null,
            'phone' => '5512345678',
            'email' => 'ordenes-grupo-'.Str::random(6).'@example.com',
            'password' => bcrypt('password'),
            'role_id' => 2,
        ]);

        $groupId = (string) Str::uuid();
        $base = [
            'order_group_id' => $groupId,
            'user_id' => $user->id,
            'address_id' => null,
            'subtotal' => 0,
            'discounted_total' => 0,
            'credit_used' => 0,
            'amount_paid' => 0,
            'amount_pending' => 0,
            'paid_with_credit' => false,
            'is_advance_order' => false,
            'status' => 'pendiente_pago',
            'payment_method' => 'mercadopago',
        ];

        $orderA = Order::create(array_merge($base, [
            'total_amount' => 2000.00,
            'subtotal' => 2000.00,
            'discounted_total' => 2000.00,
            'shipping_amount' => 0,
            'external_reference' => 'TEST-A-'.Str::uuid(),
        ]));

        $orderB = Order::create(array_merge($base, [
            'total_amount' => 3000.00,
            'subtotal' => 3000.00,
            'discounted_total' => 3000.00,
            'shipping_amount' => 0,
            'external_reference' => 'TEST-B-'.Str::uuid(),
        ]));

        $this->assertEquals($groupId, $orderA->fresh()->order_group_id);
        $this->assertEquals($groupId, $orderB->fresh()->order_group_id);
        $this->assertNotSame($orderA->id, $orderB->id);
        $this->assertEquals('2000.00', (string) $orderA->fresh()->total_amount);
        $this->assertEquals('3000.00', (string) $orderB->fresh()->total_amount);

        $sumaMercanciaGrupo = Order::where('order_group_id', $groupId)->sum('total_amount');
        $this->assertEquals(5000.0, (float) $sumaMercanciaGrupo);

        $this->assertCount(2, Order::where('order_group_id', $groupId)->get());
    }

    public function test_orden_suelta_puede_tener_order_group_id_null(): void
    {
        $this->ensureRolesExistentes();

        $user = User::create([
            'first_name' => 'Otro',
            'last_name' => 'User',
            'middle_name' => null,
            'phone' => '5598765432',
            'email' => 'solo-orden-'.Str::random(6).'@example.com',
            'password' => bcrypt('password'),
            'role_id' => 2,
        ]);

        $order = Order::create([
            'order_group_id' => null,
            'user_id' => $user->id,
            'address_id' => null,
            'total_amount' => 5000.00,
            'subtotal' => 5000.00,
            'discounted_total' => 5000.00,
            'shipping_amount' => 100.00,
            'credit_used' => 0,
            'amount_paid' => 0,
            'amount_pending' => 5100.00,
            'paid_with_credit' => false,
            'is_advance_order' => false,
            'status' => 'pendiente_pago',
            'payment_method' => 'mercadopago',
            'external_reference' => 'TEST-SOLO-'.Str::uuid(),
        ]);

        $this->assertNull($order->fresh()->order_group_id);
    }
}
