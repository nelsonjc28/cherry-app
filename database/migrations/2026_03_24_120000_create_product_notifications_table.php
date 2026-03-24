<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('producto_id');
            $table->boolean('is_notified')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'producto_id']);

            $table->foreign('producto_id')
                ->references('id')
                ->on('productos')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_notifications');
    }
};
