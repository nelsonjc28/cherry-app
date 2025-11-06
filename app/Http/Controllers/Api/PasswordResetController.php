<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Models\User;
use Carbon\Carbon;

class PasswordResetController extends Controller
{
    /**
     * Enviar código de recuperación de contraseña
     */
    public function sendResetCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email'
        ], [
            'email.required' => 'El correo electrónico es obligatorio',
            'email.email' => 'El correo electrónico debe ser válido',
            'email.exists' => 'No existe una cuenta con este correo electrónico'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Generar código de 6 dígitos
            $code = sprintf("%06d", mt_rand(1, 999999));
            
            // Eliminar códigos anteriores del mismo email
            DB::table('password_reset_codes')
                ->where('email', $request->email)
                ->delete();

            // Guardar el nuevo código (expira en 15 minutos)
            DB::table('password_reset_codes')->insert([
                'email' => $request->email,
                'code' => $code,
                'expires_at' => Carbon::now()->addMinutes(15),
                'created_at' => Carbon::now()
            ]);

            // Obtener datos del usuario
            $user = User::where('email', $request->email)->first();

            // Enviar el código por correo
            Mail::send('emails.password-reset-code', [
                'code' => $code,
                'name' => $user->first_name ?? 'Usuario',
                'email' => $request->email
            ], function ($message) use ($request) {
                $message->to($request->email);
                $message->subject('Código de Recuperación de Contraseña - Cherry Central');
            });

            return response()->json([
                'success' => true,
                'message' => 'Se ha enviado un código de verificación a tu correo electrónico'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar el código: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar código de recuperación
     */
    public function verifyCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6'
        ], [
            'email.required' => 'El correo electrónico es obligatorio',
            'email.email' => 'El correo electrónico debe ser válido',
            'code.required' => 'El código es obligatorio',
            'code.size' => 'El código debe tener 6 dígitos'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Buscar el código
            $resetCode = DB::table('password_reset_codes')
                ->where('email', $request->email)
                ->where('code', $request->code)
                ->first();

            if (!$resetCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'El código ingresado no es válido'
                ], 400);
            }

            // Verificar si el código ha expirado
            if (Carbon::parse($resetCode->expires_at)->isPast()) {
                // Eliminar el código expirado
                DB::table('password_reset_codes')
                    ->where('email', $request->email)
                    ->delete();

                return response()->json([
                    'success' => false,
                    'message' => 'El código ha expirado. Por favor, solicita uno nuevo.'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Código verificado correctamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar el código: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resetear la contraseña con código verificado
     */
    public function resetWithCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'password' => 'required|min:8|confirmed'
        ], [
            'email.required' => 'El correo electrónico es obligatorio',
            'email.email' => 'El correo electrónico debe ser válido',
            'code.required' => 'El código es obligatorio',
            'code.size' => 'El código debe tener 6 dígitos',
            'password.required' => 'La contraseña es obligatoria',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres',
            'password.confirmed' => 'Las contraseñas no coinciden'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Buscar el código
            $resetCode = DB::table('password_reset_codes')
                ->where('email', $request->email)
                ->where('code', $request->code)
                ->first();

            if (!$resetCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'El código ingresado no es válido'
                ], 400);
            }

            // Verificar si el código ha expirado
            if (Carbon::parse($resetCode->expires_at)->isPast()) {
                // Eliminar el código expirado
                DB::table('password_reset_codes')
                    ->where('email', $request->email)
                    ->delete();

                return response()->json([
                    'success' => false,
                    'message' => 'El código ha expirado. Por favor, solicita uno nuevo.'
                ], 400);
            }

            // Buscar usuario
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró un usuario con este correo electrónico'
                ], 404);
            }

            // Actualizar la contraseña
            $user->password = Hash::make($request->password);
            $user->save();

            // Eliminar el código usado
            DB::table('password_reset_codes')
                ->where('email', $request->email)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Tu contraseña ha sido restablecida exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al restablecer la contraseña: ' . $e->getMessage()
            ], 500);
        }
    }
}
