<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CatalogOffer extends Model
{
    use HasFactory;

    protected $fillable = [
        'catalog_id',
        'title',
        'description',
        'discount_percentage',
        'discount_type', // 'percentage', 'fixed'
        'discount_category', // 'product_discount', 'buy_x_get_y', 'order_discount', 'free_shipping'
        'start_date',
        'end_date',
        'is_active',
        'display_order',
        'banner_image',
        'modal_image',
        'modal_text',
        'offer_code',
        'max_uses',
        'current_uses',
        'min_purchase_amount',
        'max_discount_amount',
        'buy_quantity', // Cantidad a comprar para Buy X Get Y
        'get_quantity', // Cantidad gratis para Buy X Get Y
        'target_products', // JSON array of selected products
        'target_users' // JSON array of user IDs
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
        'max_discount_amount' => 'decimal:2',
        'buy_quantity' => 'integer',
        'get_quantity' => 'integer',
        'target_products' => 'array',
        'target_users' => 'array'
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
        // Para envío gratis, no hay descuento monetario
        if ($this->discount_category === 'free_shipping') {
            return 0;
        }
        
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

    /**
     * Verificar si la oferta incluye envío gratis
     */
    public function hasFreeShipping()
    {
        return $this->discount_category === 'free_shipping';
    }

    /**
     * Get the products associated with this offer
     */
    public function offerProducts(): HasMany
    {
        return $this->hasMany(CatalogOfferProduct::class, 'offer_id');
    }

    /**
     * Get the users associated with this offer
     */
    public function offerUsers(): HasMany
    {
        return $this->hasMany(CatalogOfferUser::class, 'offer_id');
    }

    /**
     * Get users through the pivot table
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'catalog_offer_users', 'offer_id', 'user_id')
                    ->withTimestamps();
    }

    /**
     * Check if offer applies to specific product
     */
    public function appliesToProduct(string $productId): bool
    {
        return $this->offerProducts()->where('product_id', $productId)->exists();
    }

    /**
     * Check if offer applies to specific user
     */
    public function appliesToUser(int $userId): bool
    {
        return $this->offerUsers()->where('user_id', $userId)->exists();
    }

    /**
     * Scope to filter offers by product ID
     */
    public function scopeForProduct($query, string $productId)
    {
        return $query->whereHas('offerProducts', function ($q) use ($productId) {
            $q->where('product_id', $productId);
        });
    }

    /**
     * Scope to filter offers by user ID
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->whereHas('offerUsers', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        });
    }
}


