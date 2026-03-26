<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('bronze_benefit_active')->default(false)->after('seller_category');
            $table->timestamp('benefit_expires_at')->nullable()->after('bronze_benefit_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['bronze_benefit_active', 'benefit_expires_at']);
        });
    }
};

