<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Incrementa stock_received_count en 1 para el producto indicado (recepciones / agotado vs próximamente).
     */
    public function up(): void
    {
        DB::table('productos')
            ->where('id', '416228020904')
            ->increment('stock_received_count', 1, ['updated_at' => now()]);
    }

    /**
     * Revierte el incremento solo si el valor actual lo permite.
     */
    public function down(): void
    {
        DB::table('productos')
            ->where('id', '416228020904')
            ->where('stock_received_count', '>=', 1)
            ->decrement('stock_received_count', 1, ['updated_at' => now()]);
    }
};
