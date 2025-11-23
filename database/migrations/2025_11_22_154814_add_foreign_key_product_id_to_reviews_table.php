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
        Schema::table('reviews', function (Blueprint $table) {
            // Cambiar el tipo de dato de product_id a string para que coincida con productos.id
            $table->string('product_id')->change();
            
            // Agregar foreign key a la tabla productos
            $table->foreign('product_id')
                  ->references('id')
                  ->on('productos')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            // Eliminar foreign key
            $table->dropForeign(['product_id']);
            
            // Revertir el tipo de dato a bigInteger
            $table->bigInteger('product_id')->change();
        });
    }
};
