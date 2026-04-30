<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'volume_descuento1')) {
                $table->dropColumn([
                    'volume_descuento1',
                    'volume_descuento2',
                    'volume_discounts_synced_at',
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'volume_descuento1')) {
                $table->decimal('volume_descuento1', 5, 2)->nullable()->after('seller_category');
                $table->decimal('volume_descuento2', 5, 2)->nullable()->after('volume_descuento1');
                $table->timestamp('volume_discounts_synced_at')->nullable()->after('volume_descuento2');
            }
        });
    }
};
