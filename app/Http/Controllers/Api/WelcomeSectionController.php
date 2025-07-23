<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WelcomeSection;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WelcomeSectionController extends Controller
{
    /**
     * Obtener la sección de bienvenida activa
     */
    public function getActiveSection(Request $request): JsonResponse
    {
        try {
            $section = WelcomeSection::getActiveSection();

            if (!$section) {
                return response()->json([
                    'success' => false,
                    'error' => 'No hay sección de bienvenida activa'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'section' => $section
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener sección: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener todas las secciones activas
     */
    public function getActiveSections(Request $request): JsonResponse
    {
        try {
            $sections = WelcomeSection::getActiveSections();

            return response()->json([
                'success' => true,
                'sections' => $sections
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener secciones: ' . $e->getMessage()
            ], 500);
        }
    }
} 