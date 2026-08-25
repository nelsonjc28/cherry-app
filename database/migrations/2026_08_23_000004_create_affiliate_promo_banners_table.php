<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Banners promocionales e interactivos de campaña (ej. "México nos une", "Summer Sale").
     */
    public function up(): void
    {
        Schema::create('affiliate_promo_banners', function (Blueprint $table) {
            $table->id();
            $table->string('title')->comment('Título / nombre de la campaña (ej. Summer Sale)');
            $table->text('description')->comment('Textos descriptivos de la campaña');
            $table->string('image_path')->comment('Ruta de la imagen del banner promocional');
            $table->string('button_text')->nullable()->comment('Texto del botón de acción');
            $table->string('button_url')->nullable()->comment('URL o liga de redirección');
            $table->date('start_date')->nullable()->comment('Fecha de inicio de vigencia');
            $table->date('end_date')->nullable()->comment('Fecha de fin de vigencia');
            $table->boolean('is_active')->default(true)->comment('Si el banner está activo');
            $table->integer('display_order')->default(0)->comment('Orden de visualización');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affiliate_promo_banners');
    }
};