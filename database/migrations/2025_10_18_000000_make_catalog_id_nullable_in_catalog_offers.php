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
        Schema::table('catalog_offers', function (Blueprint $table) {
            // Eliminar la clave foránea existente
            $table->dropForeign(['catalog_id']);
            
            // Modificar la columna para que sea nullable
            $table->unsignedBigInteger('catalog_id')->nullable()->change();
            
            // Volver a crear la clave foránea pero ahora nullable
            $table->foreign('catalog_id')
                  ->references('id')
                  ->on('catalogs')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            // Eliminar la clave foránea
            $table->dropForeign(['catalog_id']);
            
            // Volver a hacer la columna NOT NULL
            $table->unsignedBigInteger('catalog_id')->nullable(false)->change();
            
            // Volver a crear la clave foránea
            $table->foreign('catalog_id')
                  ->references('id')
                  ->on('catalogs')
                  ->onDelete('cascade');
        });
    }
};










