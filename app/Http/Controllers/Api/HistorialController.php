<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Historial;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class HistorialController extends Controller
{
    /**
     * Obtener el historial de sincronizaciones
     */
    public function index(Request $request): JsonResponse
    {
        $query = Historial::query();

        // Filtro por fecha de inicio
        if ($request->has('fecha_inicio') && $request->fecha_inicio) {
            $fechaInicio = \Carbon\Carbon::parse($request->fecha_inicio)->startOfDay();
            $query->where('ejecutado_at', '>=', $fechaInicio);
        }

        // Filtro por fecha de fin
        if ($request->has('fecha_fin') && $request->fecha_fin) {
            $fechaFin = \Carbon\Carbon::parse($request->fecha_fin)->endOfDay();
            $query->where('ejecutado_at', '<=', $fechaFin);
        }

        // Ordenar de mayor a menor (más reciente primero) y paginar
        $perPage = $request->get('per_page', 15);
        $historial = $query->orderByDesc('ejecutado_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(function ($item) {
                return [
                    'id' => $item->id,
                    'ejecutado_at' => $item->ejecutado_at->format('Y-m-d H:i:s'),
                    'estado' => $item->estado,
                    'mensaje' => $item->mensaje,
                    'created_at' => $item->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $historial->items(),
            'pagination' => [
                'current_page' => $historial->currentPage(),
                'last_page' => $historial->lastPage(),
                'per_page' => $historial->perPage(),
                'total' => $historial->total(),
                'from' => $historial->firstItem(),
                'to' => $historial->lastItem(),
            ]
        ]);
    }
}
