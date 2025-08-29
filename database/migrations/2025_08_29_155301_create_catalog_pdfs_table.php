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
        Schema::create('catalog_pdfs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_id')->constrained('catalogs')->onDelete('cascade');
            $table->string('pdf_path');
            $table->string('pdf_name');
            $table->string('pdf_size')->nullable();
            $table->string('pdf_mime_type')->nullable();
            $table->integer('page_count')->nullable();
            $table->integer('display_order')->default(0);
            $table->timestamps();
            
            $table->index(['catalog_id', 'display_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_pdfs');
    }
};
