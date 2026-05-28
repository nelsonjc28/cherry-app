<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $legacy = DB::table('mail_configs')->where('mail_type', 'welcome')->first();
        if ($legacy !== null) {
            $existsHero = DB::table('mail_configs')->where('mail_type', 'welcome_hero')->exists();
            if (! $existsHero) {
                DB::table('mail_configs')->insert([
                    'mail_type' => 'welcome_hero',
                    'image_path' => $legacy->image_path,
                    'created_at' => $legacy->created_at,
                    'updated_at' => $legacy->updated_at,
                ]);
            }
            DB::table('mail_configs')->where('mail_type', 'welcome')->delete();
        }
    }

    public function down(): void
    {
        $hero = DB::table('mail_configs')->where('mail_type', 'welcome_hero')->first();
        if ($hero !== null && ! DB::table('mail_configs')->where('mail_type', 'welcome')->exists()) {
            DB::table('mail_configs')->insert([
                'mail_type' => 'welcome',
                'image_path' => $hero->image_path,
                'created_at' => $hero->created_at,
                'updated_at' => $hero->updated_at,
            ]);
        }
        DB::table('mail_configs')->where('mail_type', 'welcome_hero')->delete();
        DB::table('mail_configs')->where('mail_type', 'welcome_promo')->delete();
    }
};
