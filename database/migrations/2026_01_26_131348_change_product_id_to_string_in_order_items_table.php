<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Cambiar product_id de bigInteger a string para soportar IDs con ceros a la izquierda (ej: 01000)
            $table->string('product_id')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Revertir product_id de string a bigInteger
            $table->bigInteger('product_id')->change();
        });
    }
};
