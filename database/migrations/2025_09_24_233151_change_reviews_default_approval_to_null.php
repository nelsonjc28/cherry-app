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
            // Cambiar el campo is_approved para que permita null y tenga null como valor por defecto
            $table->boolean('is_approved')->nullable()->default(null)->change();
        });
        
        // Actualizar todas las reseñas existentes que estén aprobadas automáticamente para que estén pendientes
        \DB::table('reviews')->where('is_approved', true)->update(['is_approved' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            // Revertir el cambio
            $table->boolean('is_approved')->default(true)->change();
        });
    }
};