<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'cardholder_name',
        'card_number',
        'expiry_month',
        'expiry_year',
        'cvv',
        'brand',
        'last_four',
        'first_two',
        'card_type',
        'is_default',
        'is_active'
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'expiry_month' => 'string',
        'expiry_year' => 'string'
    ];

    /**
     * Get the user that owns the payment card.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the masked card number for display.
     */
    public function getMaskedCardNumberAttribute(): string
    {
        return $this->first_two . '*******' . $this->last_four;
    }

    /**
     * Get the card brand display name.
     */
    public function getBrandDisplayNameAttribute(): string
    {
        $brands = [
            'visa' => 'Visa',
            'mastercard' => 'Mastercard',
            'amex' => 'American Express',
            'discover' => 'Discover',
            'jcb' => 'JCB',
            'diners' => 'Diners Club'
        ];

        return $brands[$this->brand] ?? ucfirst($this->brand);
    }

    /**
     * Get the card type display name.
     */
    public function getCardTypeDisplayNameAttribute(): string
    {
        return $this->card_type === 'credit' ? 'Crédito' : 'Débito';
    }

    /**
     * Get the expiry date in MM/YY format.
     */
    public function getExpiryDateAttribute(): string
    {
        return $this->expiry_month . '/' . $this->expiry_year;
    }

    /**
     * Scope to get only active cards.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get only default cards.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Set this card as default and unset others.
     */
    public function setAsDefault(): void
    {
        // Unset other default cards for this user
        static::where('user_id', $this->user_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        // Set this card as default
        $this->update(['is_default' => true]);
    }

    /**
     * Soft delete the card (mark as inactive).
     */
    public function softDelete(): void
    {
        $this->update(['is_active' => false]);
    }

    /**
     * Check if the card is expired.
     */
    public function isExpired(): bool
    {
        $currentYear = date('Y');
        $currentMonth = date('m');

        if ($this->expiry_year < $currentYear) {
            return true;
        }

        if ($this->expiry_year == $currentYear && $this->expiry_month < $currentMonth) {
            return true;
        }

        return false;
    }
}




