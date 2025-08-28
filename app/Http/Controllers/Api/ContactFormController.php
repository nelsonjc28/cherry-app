<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;


class ContactFormController extends Controller
{
    /**
     * Enviar mensaje de contacto
     */
    public function sendMessage(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:100',
                'email' => 'required|email|max:100',
                'phone' => 'nullable|string|max:20',
                'subject' => 'required|string|max:100',
                'message' => 'required|string|max:2000'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Datos inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Obtener el email de contacto configurado
            $contactEmail = Contact::where('type', 'email')
                ->where('is_active', true)
                ->orderBy('order', 'asc')
                ->first();

            if (!$contactEmail) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay email de contacto configurado'
                ], 400);
            }

            $emailTo = $contactEmail->value;

            // Preparar datos del mensaje - asegurar que todos sean strings
            $messageData = [
                'name' => (string) $request->name,
                'email' => (string) $request->email,
                'phone' => $request->phone ? (string) $request->phone : '',
                'subject' => (string) $request->subject,
                'message' => (string) $request->message,
                'subject_type' => (string) $this->getSubjectLabel($request->subject)
            ];

            // Enviar email usando la configuración de Laravel
            Mail::send('emails.contact-form', $messageData, function($message) use ($emailTo, $messageData) {
                $message->to($emailTo)
                        ->subject('Nuevo mensaje de contacto - ' . $messageData['subject_type']);
            });



            return response()->json([
                'success' => true,
                'message' => 'Mensaje enviado exitosamente. Nos pondremos en contacto contigo pronto.'
            ]);

        } catch (\Exception $e) {

            
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar el mensaje. Por favor, intenta nuevamente.'
            ], 500);
        }
    }

    /**
     * Obtener etiqueta del asunto
     */
    private function getSubjectLabel($subject)
    {
        $subjects = [
            'productos' => 'Consulta sobre productos',
            'afiliados' => 'Programa de afiliados',
            'soporte' => 'Soporte técnico',
            'ventas' => 'Ventas y pedidos',
            'otro' => 'Otro'
        ];

        return $subjects[$subject] ?? $subject;
    }
}
