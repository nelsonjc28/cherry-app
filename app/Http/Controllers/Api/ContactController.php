<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;

class ContactController extends Controller
{
    /**
     * Obtener todos los contactos activos ordenados
     */
    public function index()
    {
        try {
            $contacts = Contact::getActiveContacts();
            
            return response()->json([
                'success' => true,
                'contacts' => $contacts
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener contactos: ' . $e->getMessage()
            ], 500);
        }
    }
}
