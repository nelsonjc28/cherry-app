<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Actualizar stock_received_count = 1 para los productos específicos que son agotados
        // Estos productos tienen el tercer dígito = 6 (año 2026) pero ya recibieron stock anteriormente
        $productIds = ['14612611701', '4861703701', '1761301404'];
        
        DB::table('productos')
            ->whereIn('id', $productIds)
            ->update([
                'stock_received_count' => 1,
                'updated_at' => now()
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir los cambios: poner stock_received_count = 0 para estos productos
        $productIds = ['14612611701', '4861703701', '1761301404'];
        
        DB::table('productos')
            ->whereIn('id', $productIds)
            ->update([
                'stock_received_count' => 0,
                'updated_at' => now()
            ]);
    }
};
