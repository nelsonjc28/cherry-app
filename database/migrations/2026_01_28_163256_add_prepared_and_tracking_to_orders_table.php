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
            $table->boolean('is_prepared')->default(false)->after('status')->comment('Indica si la orden ya está preparada');
            $table->string('tracking_number')->nullable()->after('is_prepared')->comment('Número de guía de envío');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['is_prepared', 'tracking_number']);
        });
    }
};
