<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserTermsAcceptance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserTermsController extends Controller
{
    /**
     * Obtener el estado de aceptación de términos del usuario autenticado
     */
    public function status()
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            $latestAcceptance = UserTermsAcceptance::getLatestAcceptance($user->id);
            $currentVersion = '1.0'; // Versión actual de términos
            $hasAcceptedCurrent = UserTermsAcceptance::hasAcceptedVersion($user->id, $currentVersion);

            $data = [
                'terms_accepted' => $latestAcceptance !== null,
                'terms_version' => $latestAcceptance ? $latestAcceptance->terms_version : null,
                'terms_accepted_at' => $latestAcceptance ? $latestAcceptance->terms_accepted_at : null,
                'needs_acceptance' => !$hasAcceptedCurrent,
                'current_version' => $currentVersion
            ];

            return response()->json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el estado de términos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Aceptar términos y condiciones
     */
    public function accept(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            $currentVersion = '1.0'; // Versión actual de términos
            $ipAddress = $request->ip();
            $userAgent = $request->header('User-Agent');

            // Registrar la aceptación
            $acceptance = UserTermsAcceptance::recordAcceptance(
                $user->id,
                $currentVersion,
                $ipAddress,
                $userAgent
            );

            return response()->json([
                'success' => true,
                'message' => 'Términos y condiciones aceptados correctamente',
                'data' => [
                    'terms_version' => $acceptance->terms_version,
                    'terms_accepted_at' => $acceptance->terms_accepted_at,
                    'terms_accepted' => true
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al aceptar términos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener historial de aceptaciones del usuario
     */
    public function history()
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado'
                ], 401);
            }

            $history = UserTermsAcceptance::where('user_id', $user->id)
                ->where('terms_accepted', true)
                ->orderBy('terms_accepted_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $history
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el historial: ' . $e->getMessage()
            ], 500);
        }
    }
}
