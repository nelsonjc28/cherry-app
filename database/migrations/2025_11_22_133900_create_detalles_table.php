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
        Schema::create('detalles', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary(); // id_artd se guarda como id (clave primaria)
            $table->string('producto_id'); // id_articulo -> relación con productos
            $table->integer('art_empresa')->default(1);
            $table->string('modelo')->nullable();
            $table->string('detalle')->nullable();
            $table->string('codbarra')->nullable();
            $table->string('ean')->nullable();
            $table->string('sku')->nullable();
            $table->string('color_file')->nullable();
            $table->string('opc_web')->nullable();
            $table->integer('orden')->default(0);
            $table->decimal('inventario_d', 10, 2)->default(0);
            $table->string('idShopify')->nullable();
            $table->string('nombreColor')->nullable();
            $table->date('fechaMovimiento')->nullable();
            $table->timestamps();
            
            // Relación con productos
            $table->foreign('producto_id')->references('id')->on('productos')->onDelete('cascade');
            
            // Índices
            $table->index('producto_id');
            $table->index('orden');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalles');
    }
};
