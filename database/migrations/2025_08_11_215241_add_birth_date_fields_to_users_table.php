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
        Schema::table('users', function (Blueprint $table) {
            $table->integer('birth_day')->nullable()->after('email');
            $table->string('birth_month')->nullable()->after('birth_day');
            $table->integer('birth_year')->nullable()->after('birth_month');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['birth_day', 'birth_month', 'birth_year']);
        });
    }
};
