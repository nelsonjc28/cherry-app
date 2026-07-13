<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Crea la tabla pivot vendor_buyer:
     *   - Relaciona usuarios con rol 'vendedor' con sus clientes compradores.
     *   - is_active permite desactivar una asignación sin perder histórico.
     *   - Restricción UNIQUE (vendor_id, buyer_id) impide duplicados.
     */
    public function up(): void
    {
        Schema::create('vendor_buyer', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('buyer_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['vendor_id', 'buyer_id']);
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_buyer');
    }
};