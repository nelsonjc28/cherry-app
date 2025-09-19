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
        Schema::table('catalog_pdfs', function (Blueprint $table) {
            // Agregar relación con grupos de imágenes
            $table->foreignId('image_group_id')->nullable()->after('catalog_id')->constrained('catalog_image_groups')->onDelete('set null');
            
            // Índice para mejorar rendimiento
            $table->index(['catalog_id', 'image_group_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_pdfs', function (Blueprint $table) {
            $table->dropForeign(['image_group_id']);
            $table->dropColumn('image_group_id');
        });
    }
};