<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Recuadros destacados configurables dentro de la sección temporada.
     * Ejemplos: "Tendencias", "Los favoritos", "Primavera-Verano".
     */
    public function up(): void
    {
        Schema::create('affiliate_season_boxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_season_id')
                ->constrained('affiliate_seasons')
                ->cascadeOnDelete()
                ->comment('Sección temporada a la que pertenece el recuadro');
            $table->string('title')->comment('Título del recuadro (ej. Tendencias)');
            $table->text('description')->comment('Texto descriptivo del recuadro');
            $table->string('button_text')->nullable()->comment('Texto del botón de acción');
            $table->string('button_url')->nullable()->comment('Enlace a la sección correspondiente');
            $table->string('image_path')->comment('Ruta de la imagen del recuadro');
            $table->boolean('is_active')->default(true)->comment('Si el recuadro está activo');
            $table->integer('display_order')->default(0)->comment('Orden de visualización');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('affiliate_season_boxes');
    }
};