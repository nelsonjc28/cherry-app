<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatalogPdf extends Model
{
    use HasFactory;

    protected $table = 'catalog_pdfs';

    protected $fillable = [
        'catalog_id',
        'pdf_path',
        'pdf_name',
        'pdf_size',
        'pdf_mime_type',
        'page_count',
        'display_order'
    ];

    protected $casts = [
        'display_order' => 'integer',
        'page_count' => 'integer'
    ];

    /**
     * Obtener el catálogo al que pertenece
     */
    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }

    /**
     * Obtener la URL completa del PDF
     */
    public function getPdfUrlAttribute()
    {
        return asset('storage/' . $this->pdf_path);
    }

    /**
     * Obtener el tamaño del PDF en formato legible
     */
    public function getFormattedSizeAttribute()
    {
        if (!$this->pdf_size) return 'N/A';
        
        $size = (int) $this->pdf_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }
        
        return round($size, 2) . ' ' . $units[$i];
    }

    /**
     * Verificar si el PDF existe
     */
    public function pdfExists()
    {
        return file_exists(storage_path('app/public/' . $this->pdf_path));
    }
}




