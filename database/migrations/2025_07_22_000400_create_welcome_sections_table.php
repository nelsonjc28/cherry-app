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
        Schema::create('welcome_sections', function (Blueprint $table) {
            $table->id();
            $table->string('title')->comment('Título de la sección');
            $table->text('subtitle')->comment('Subtítulo/descripción de la sección');
            $table->string('button_text')->comment('Texto del botón');
            $table->string('button_url')->comment('URL del botón');
            $table->string('image_path')->comment('Ruta de la imagen');
            $table->boolean('is_active')->default(true)->comment('Si la sección está activa');
            $table->integer('display_order')->default(0)->comment('Orden de visualización');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('welcome_sections');
    }
}; 