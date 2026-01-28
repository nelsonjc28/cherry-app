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
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('street_number_ext')->nullable()->after('street_address')->comment('Número exterior');
            $table->string('street_number_int')->nullable()->after('street_number_ext')->comment('Número interior');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn(['street_number_ext', 'street_number_int']);
        });
    }
};
