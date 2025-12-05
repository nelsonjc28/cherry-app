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
        Schema::table('orders', function (Blueprint $table) {
            // Eliminar la foreign key constraint existente
            $table->dropForeign(['address_id']);
            
            // Modificar la columna para permitir NULL
            $table->unsignedBigInteger('address_id')->nullable()->change();
            
            // Recrear la foreign key constraint permitiendo NULL
            $table->foreign('address_id')
                  ->references('id')
                  ->on('addresses')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Eliminar la foreign key constraint
            $table->dropForeign(['address_id']);
            
            // Modificar la columna para que NO permita NULL
            $table->unsignedBigInteger('address_id')->nullable(false)->change();
            
            // Recrear la foreign key constraint sin NULL
            $table->foreign('address_id')
                  ->references('id')
                  ->on('addresses')
                  ->onDelete('cascade');
        });
    }
};
