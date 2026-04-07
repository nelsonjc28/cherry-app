<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_configs', function (Blueprint $table) {
            $table->id();
            $table->string('mail_type', 64)->unique()->comment('welcome, order_confirmation, abandoned_cart, order_status, product_available');
            $table->string('image_path')->nullable()->comment('Ruta relativa al disco public, ej. mail-assets/xxx.jpg');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_configs');
    }
};
