<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactInfo extends Model
{
    use HasFactory;

    protected $table = 'contact_info';

    protected $fillable = [
        'address_street',
        'address_city',
        'phone',
        'whatsapp',
        'email',
        'map_url',
        'store_hours',
        'online_hours',
    ];

    protected $casts = [
        'store_hours' => 'array',
        'online_hours' => 'array',
    ];

    /**
     * Get the first contact info record (there should only be one)
     */
    public static function getContactInfo()
    {
        return self::first() ?? new self();
    }

    /**
     * Update or create contact info
     */
    public static function updateContactInfo($data)
    {
        $contactInfo = self::first();
        
        if ($contactInfo) {
            $contactInfo->update($data);
        } else {
            $contactInfo = self::create($data);
        }
        
        return $contactInfo;
    }
}
