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
                'whatsapp' => $contactInfo->whatsapp,
                'email' => $contactInfo->email,
                'map_url' => $contactInfo->map_url,
                'store_hours' => $contactInfo->store_hours ?? [],
                'online_hours' => $contactInfo->online_hours ?? [],
            ]
        ])->header('Cache-Control', 'no-cache, no-store, must-revalidate')
          ->header('Pragma', 'no-cache')
          ->header('Expires', '0');
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
            'whatsapp' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'map_url' => 'nullable|string',
            'store_hours' => 'nullable|array',
            'online_hours' => 'nullable|array',
        ]);

        $data = $request->only([
            'address_street',
            'address_city',
            'phone',
            'whatsapp',
            'email',
            'map_url',
            'store_hours',
            'online_hours',
        ]);

        // Si map_url viene como iframe completo, extraer solo la URL
        if (isset($data['map_url']) && !empty($data['map_url'])) {
            $mapUrl = $data['map_url'];
            
            // Si contiene un iframe, extraer el src
            if (preg_match('/<iframe[^>]+src=["\']([^"\']+)["\']/', $mapUrl, $matches)) {
                $data['map_url'] = $matches[1];
            } elseif (preg_match('/src=["\']([^"\']+)["\']/', $mapUrl, $matches)) {
                $data['map_url'] = $matches[1];
            }
            // Si ya es una URL directa, mantenerla tal cual
        }

        $contactInfo = ContactInfo::updateContactInfo($data);

        // Invalidar cualquier caché que pueda existir
        \Cache::forget('contact_info');
        
        return response()->json([
            'success' => true,
            'message' => 'Información de contacto actualizada correctamente',
            'data' => [
                'address_street' => $contactInfo->address_street,
                'address_city' => $contactInfo->address_city,
                'phone' => $contactInfo->phone,
                'whatsapp' => $contactInfo->whatsapp,
                'email' => $contactInfo->email,
                'map_url' => $contactInfo->map_url,
                'store_hours' => $contactInfo->store_hours ?? [],
                'online_hours' => $contactInfo->online_hours ?? [],
            ]
        ])->header('Cache-Control', 'no-cache, no-store, must-revalidate')
          ->header('Pragma', 'no-cache')
          ->header('Expires', '0');
    }
}
