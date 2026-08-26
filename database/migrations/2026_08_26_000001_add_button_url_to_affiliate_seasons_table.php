<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agregar button_url a affiliate_seasons para redirigir a una URL externa.
     */
    public function up(): void
    {
        Schema::table('affiliate_seasons', function (Blueprint $table) {
            $table->string('button_url', 500)->nullable()->after('title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('affiliate_seasons', function (Blueprint $table) {
            $table->dropColumn('button_url');
        });
    }
};
