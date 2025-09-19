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
            // Renombrar columnas de PDF a imagen
            $table->renameColumn('pdf_path', 'image_path');
            $table->renameColumn('pdf_name', 'image_name');
            $table->renameColumn('pdf_size', 'image_size');
            $table->renameColumn('pdf_mime_type', 'image_mime_type');
            
            // Eliminar columnas específicas de PDF
            $table->dropColumn('page_count');
            
            // Agregar columnas específicas para imágenes
            $table->string('image_alt')->nullable()->after('image_mime_type');
            $table->integer('width')->nullable()->after('image_alt');
            $table->integer('height')->nullable()->after('width');
            $table->string('thumbnail_path')->nullable()->after('height');
            
            // Agregar columna para el nombre del catálogo
            $table->string('catalog_name')->nullable()->after('catalog_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_pdfs', function (Blueprint $table) {
            // Revertir cambios
            $table->renameColumn('image_path', 'pdf_path');
            $table->renameColumn('image_name', 'pdf_name');
            $table->renameColumn('image_size', 'pdf_size');
            $table->renameColumn('image_mime_type', 'pdf_mime_type');
            
            // Restaurar columnas de PDF
            $table->integer('page_count')->nullable();
            
            // Eliminar columnas de imagen
            $table->dropColumn(['image_alt', 'width', 'height', 'thumbnail_path', 'catalog_name']);
        });
    }
};
