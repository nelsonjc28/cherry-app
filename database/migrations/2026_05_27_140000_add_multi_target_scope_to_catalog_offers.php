<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            $table->json('target_scopes')->nullable()->after('target_scope');
            $table->json('target_category_codes')->nullable()->after('target_category_code');
            $table->json('target_catalog_ids')->nullable()->after('target_catalog_id');
        });

        DB::table('catalog_offers')->orderBy('id')->chunkById(100, function ($offers) {
            foreach ($offers as $offer) {
                $legacyScope = $offer->target_scope ?: 'products';
                $categoryCodes = $offer->target_category_code
                    ? [trim((string) $offer->target_category_code)]
                    : [];
                $catalogIds = $offer->target_catalog_id
                    ? [trim((string) $offer->target_catalog_id)]
                    : [];

                DB::table('catalog_offers')->where('id', $offer->id)->update([
                    'target_scopes' => json_encode([$legacyScope]),
                    'target_category_codes' => json_encode($categoryCodes),
                    'target_catalog_ids' => json_encode($catalogIds),
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            $table->dropColumn(['target_scopes', 'target_category_codes', 'target_catalog_ids']);
        });
    }
};
