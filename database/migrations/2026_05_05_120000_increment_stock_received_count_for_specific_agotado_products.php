<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Incrementa stock_received_count en 1 para marcar recepciones previas y que con inventario 0
     * el producto se trate como agotado (no próximamente) cuando aplique la lógica del catálogo.
     */
    public function up(): void
    {
        $productIds = [
            '50611602001',
            '516112629804',
            '3461233104',
            '416298040101',
            '1761301704',
            '14612609801',
            '14622609401',
            '9761212506',
            '516112644409',
            '516112625004',
            '9762223906',
            '3461233222',
            '1761202306',
            '1761801211',
            '416120011504',
            '4861704514',
            '516112617206',
            '3461231109',
            '3462223104',
            '40614010206',
            '416140011806',
            '416130011005',
            '416258020806',
        ];

        foreach (array_unique($productIds) as $id) {
            DB::table('productos')
                ->where('id', $id)
                ->increment('stock_received_count', 1, ['updated_at' => now()]);
        }
    }

    /**
     * Revierte el incremento en 1 solo cuando el valor actual permite hacerlo sin pasar por debajo de 0.
     */
    public function down(): void
    {
        $productIds = [
            '50611602001',
            '516112629804',
            '3461233104',
            '416298040101',
            '1761301704',
            '14612609801',
            '14622609401',
            '9761212506',
            '516112644409',
            '516112625004',
            '9762223906',
            '3461233222',
            '1761202306',
            '1761801211',
            '416120011504',
            '4861704514',
            '516112617206',
            '3461231109',
            '3462223104',
            '40614010206',
            '416140011806',
            '416130011005',
            '416258020806',
        ];

        foreach (array_unique($productIds) as $id) {
            DB::table('productos')
                ->where('id', $id)
                ->where('stock_received_count', '>=', 1)
                ->decrement('stock_received_count', 1, ['updated_at' => now()]);
        }
    }
};
