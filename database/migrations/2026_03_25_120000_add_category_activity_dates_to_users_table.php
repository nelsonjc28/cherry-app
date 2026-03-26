<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('categoria_last_purchase')->nullable()->after('seller_category');
            $table->timestamp('categoria_expires_at')->nullable()->after('categoria_last_purchase');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['categoria_last_purchase', 'categoria_expires_at']);
        });
    }
};
