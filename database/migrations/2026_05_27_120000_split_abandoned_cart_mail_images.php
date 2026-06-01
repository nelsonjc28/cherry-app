<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $legacy = DB::table('mail_configs')->where('mail_type', 'abandoned_cart')->first();
        if ($legacy === null) {
            return;
        }

        if (! DB::table('mail_configs')->where('mail_type', 'abandoned_cart_hero')->exists()) {
            DB::table('mail_configs')->insert([
                'mail_type' => 'abandoned_cart_hero',
                'image_path' => $legacy->image_path,
                'created_at' => $legacy->created_at,
                'updated_at' => $legacy->updated_at,
            ]);
        }

        if (! DB::table('mail_configs')->where('mail_type', 'abandoned_cart_promo')->exists()) {
            DB::table('mail_configs')->insert([
                'mail_type' => 'abandoned_cart_promo',
                'image_path' => $legacy->image_path,
                'created_at' => $legacy->created_at,
                'updated_at' => $legacy->updated_at,
            ]);
        }

        DB::table('mail_configs')->where('mail_type', 'abandoned_cart')->delete();
    }

    public function down(): void
    {
        $hero = DB::table('mail_configs')->where('mail_type', 'abandoned_cart_hero')->first();
        if ($hero !== null && ! DB::table('mail_configs')->where('mail_type', 'abandoned_cart')->exists()) {
            DB::table('mail_configs')->insert([
                'mail_type' => 'abandoned_cart',
                'image_path' => $hero->image_path,
                'created_at' => $hero->created_at,
                'updated_at' => $hero->updated_at,
            ]);
        }
        DB::table('mail_configs')->where('mail_type', 'abandoned_cart_hero')->delete();
        DB::table('mail_configs')->where('mail_type', 'abandoned_cart_promo')->delete();
    }
};
