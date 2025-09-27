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
        Schema::create('catalog_offer_users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('offer_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();
            
            // Foreign key constraints
            $table->foreign('offer_id')->references('id')->on('catalog_offers')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // Indexes for performance
            $table->index(['offer_id', 'user_id'], 'idx_offer_user');
            $table->index(['user_id', 'offer_id'], 'idx_user_offer');
            
            // Unique constraint to prevent duplicates
            $table->unique(['offer_id', 'user_id'], 'unique_offer_user');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_offer_users');
    }
};
