<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminContactController extends Controller
{
    /**
     * Obtener todos los contactos
     */
    public function index()
    {
        try {
            $contacts = Contact::orderBy('order', 'asc')->get();
            
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

    /**
     * Obtener un contacto específico
     */
    public function show($id)
    {
        try {
            $contact = Contact::find($id);
            
            if (!$contact) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contacto no encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'contact' => $contact
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener contacto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear un nuevo contacto
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type' => 'required|string|max:50',
                'title' => 'required|string|max:100',
                'value' => 'required|string',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:100',
                'is_active' => 'boolean',
                'order' => 'integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $contact = Contact::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Contacto creado exitosamente',
                'contact' => $contact
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear contacto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar un contacto
     */
    public function update(Request $request, $id)
    {
        try {
            $contact = Contact::find($id);
            
            if (!$contact) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contacto no encontrado'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'type' => 'required|string|max:50',
                'title' => 'required|string|max:100',
                'value' => 'required|string',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:100',
                'is_active' => 'boolean',
                'order' => 'integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $contact->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Contacto actualizado exitosamente',
                'contact' => $contact
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar contacto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un contacto
     */
    public function destroy($id)
    {
        try {
            $contact = Contact::find($id);
            
            if (!$contact) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contacto no encontrado'
                ], 404);
            }

            $contact->delete();

            return response()->json([
                'success' => true,
                'message' => 'Contacto eliminado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar contacto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cambiar el estado activo/inactivo de un contacto
     */
    public function toggleStatus($id)
    {
        try {
            $contact = Contact::find($id);
            
            if (!$contact) {
                return response()->json([
                    'success' => false,
                    'message' => 'Contacto no encontrado'
                ], 404);
            }

            $contact->is_active = !$contact->is_active;
            $contact->save();

            return response()->json([
                'success' => true,
                'message' => 'Estado del contacto actualizado exitosamente',
                'contact' => $contact
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar el orden de los contactos
     */
    public function updateOrder(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'contacts' => 'required|array',
                'contacts.*.id' => 'required|integer|exists:contacts,id',
                'contacts.*.order' => 'required|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            foreach ($request->contacts as $contactData) {
                Contact::where('id', $contactData['id'])
                    ->update(['order' => $contactData['order']]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Orden de contactos actualizado exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar orden: ' . $e->getMessage()
            ], 500);
        }
    }
}
