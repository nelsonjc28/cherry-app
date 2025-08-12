<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactInfo;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ContactInfoController extends Controller
{
    /**
     * Get contact information
     */
    public function show(): JsonResponse
    {
        $contactInfo = ContactInfo::getContactInfo();
        
        return response()->json([
            'success' => true,
            'data' => [
                'address_street' => $contactInfo->address_street,
                'address_city' => $contactInfo->address_city,
                'phone' => $contactInfo->phone,
                'email' => $contactInfo->email,
                'map_url' => $contactInfo->map_url,
                'store_hours' => $contactInfo->store_hours ?? [],
                'online_hours' => $contactInfo->online_hours ?? [],
            ]
        ]);
    }

    /**
     * Update contact information (admin only)
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'address_street' => 'nullable|string|max:255',
            'address_city' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'map_url' => 'nullable|string',
            'store_hours' => 'nullable|array',
            'online_hours' => 'nullable|array',
        ]);

        $data = $request->only([
            'address_street',
            'address_city',
            'phone',
            'email',
            'map_url',
            'store_hours',
            'online_hours',
        ]);

        $contactInfo = ContactInfo::updateContactInfo($data);

        return response()->json([
            'success' => true,
            'message' => 'Información de contacto actualizada correctamente',
            'data' => $contactInfo
        ]);
    }
}
