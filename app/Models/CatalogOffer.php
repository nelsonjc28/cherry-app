<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatalogOffer extends Model
{
    use HasFactory;

    protected $fillable = [
        'catalog_id',
        'title',
        'description',
        'discount_percentage',
        'discount_type', // 'percentage', 'fixed'
        'start_date',
        'end_date',
        'is_active',
        'display_order',
        'banner_image',
        'offer_code',
        'max_uses',
        'current_uses',
        'min_purchase_amount',
        'max_discount_amount'
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'discount_percentage' => 'decimal:2',
        'max_uses' => 'integer',
        'current_uses' => 'integer',
        'min_purchase_amount' => 'decimal:2',
        'max_discount_amount' => 'decimal:2'
    ];

    /**
     * Obtener el catálogo asociado
     */
    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }

    /**
     * Obtener ofertas activas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
                    ->where('start_date', '<=', now())
                    ->where('end_date', '>=', now());
    }

    /**
     * Obtener ofertas ordenadas por orden de visualización
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }

    /**
     * Verificar si la oferta está vigente
     */
    public function isActive()
    {
        return $this->is_active && 
               $this->start_date <= now() && 
               $this->end_date >= now() &&
               ($this->max_uses === null || $this->current_uses < $this->max_uses);
    }

    /**
     * Calcular el descuento para un monto dado
     */
    public function calculateDiscount($amount)
    {
        if ($this->discount_type === 'percentage') {
            $discount = ($amount * $this->discount_percentage) / 100;
            
            // Aplicar descuento máximo si está configurado
            if ($this->max_discount_amount) {
                $discount = min($discount, $this->max_discount_amount);
            }
            
            return $discount;
        }
        
        return $this->discount_percentage;
    }
}


