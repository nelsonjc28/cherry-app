<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Preguntas Frecuentes (FAQ) dinámicas del módulo de afiliación.
     */
    public function up(): void
    {
        Schema::create('affiliate_faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question')->comment('Pregunta frecuente');
            $table->text('answer')->comment('Respuesta a la pregunta');
            $table->integer('display_order')->default(0)->comment('Orden de visualización');
            $table->boolean('is_active')->default(true)->comment('Estado activo/inactivo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affiliate_faqs');
    }
};