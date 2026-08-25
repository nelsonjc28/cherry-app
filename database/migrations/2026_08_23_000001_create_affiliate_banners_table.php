<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Banner superior editable de la página de afiliación.
     */
    public function up(): void
    {
        Schema::create('affiliate_banners', function (Blueprint $table) {
            $table->id();
            $table->string('title')->comment('Título del banner superior');
            $table->text('subtitle')->comment('Subtítulo / descripción del banner');
            $table->string('button_text')->comment('Texto del botón de acción');
            $table->string('button_url')->comment('URL o enlace de redirección');
            $table->string('image_path')->comment('Ruta de la imagen (public o S3)');
            $table->boolean('is_active')->default(true)->comment('Si el banner está activo');
            $table->integer('display_order')->default(0)->comment('Orden de visualización');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('affiliate_banners');
    }
};