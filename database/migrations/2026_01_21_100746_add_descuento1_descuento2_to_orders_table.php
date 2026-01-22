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
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('descuento1', 5, 2)->default(0)->after('total_amount')->comment('Descuento del 20% cuando total elegible >= 7000');
            $table->decimal('descuento2', 5, 2)->default(0)->after('descuento1')->comment('Descuento adicional del 10% cuando total elegible >= 15000');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['descuento1', 'descuento2']);
        });
    }
};
