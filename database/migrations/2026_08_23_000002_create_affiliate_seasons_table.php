<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sección "Conoce la nueva Temporada" de la página de afiliación.
     */
    public function up(): void
    {
        Schema::create('affiliate_seasons', function (Blueprint $table) {
            $table->id();
            $table->string('title')->comment('Título dinámico de la sección temporada');
            $table->foreignId('catalog_id')
                ->nullable()
                ->constrained('catalogs')
                ->nullOnDelete()
                ->comment('Catálogo de temporada vigente asociado');
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
        Schema::dropIfExists('affiliate_seasons');
    }
};