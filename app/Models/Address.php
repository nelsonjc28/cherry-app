<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'street_address',
        'street_number_ext',
        'street_number_int',
        'city',
        'municipality',
        'colonia',
        'state',
        'postal_code',
        'country',
        'additional_info',
        'is_default',
        'latitude',
        'longitude',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_default' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    /**
     * Get the user that owns the address.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope a query to only include default addresses.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Get the full address as a formatted string.
     */
    public function getFullAddressAttribute()
    {
        $parts = [
            $this->street_address,
            $this->city,
            $this->state,
            $this->postal_code,
            $this->country
        ];

        return implode(', ', array_filter($parts));
    }

    /**
     * Formato completo de dirección para panel administrativo.
     */
    public function getAdminFormattedAddressAttribute(): string
    {
        $street = trim((string) ($this->street_address ?? ''));
        $noExt = trim((string) ($this->street_number_ext ?? ''));
        $noInt = trim((string) ($this->street_number_int ?? ''));
        $colonia = trim((string) ($this->colonia ?? ''));
        $cp = trim((string) ($this->postal_code ?? ''));
        $city = trim((string) ($this->city ?? ''));
        $state = trim((string) ($this->state ?? ''));
        $reference = trim((string) ($this->additional_info ?? ''));

        return sprintf(
            '%s No. Ext: %s, No. Int: %s, Col: %s, CP: %s, %s, %s. Ref: %s',
            $street !== '' ? $street : 'Sin calle',
            $noExt !== '' ? $noExt : 'S/N',
            $noInt !== '' ? $noInt : 'S/N',
            $colonia !== '' ? $colonia : 'Sin colonia',
            $cp !== '' ? $cp : 'Sin CP',
            $city !== '' ? $city : 'Sin ciudad',
            $state !== '' ? $state : 'Sin estado',
            $reference !== '' ? $reference : 'Sin referencias'
        );
    }

    /**
     * Set this address as default and unset others for the same user.
     */
    public function setAsDefault()
    {
        // Remove default from other addresses of the same user
        static::where('user_id', $this->user_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        // Set this address as default
        $this->update(['is_default' => true]);
    }
}

