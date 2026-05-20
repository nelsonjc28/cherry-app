<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderExternalApiLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderExternalApiLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = OrderExternalApiLog::query()->with('order:id,status,payment_method');

        if ($request->filled('order_id')) {
            $query->where('order_id', (int) $request->order_id);
        }

        if ($request->filled('fecha_inicio')) {
            $query->where('ejecutado_at', '>=', Carbon::parse($request->fecha_inicio)->startOfDay());
        }

        if ($request->filled('fecha_fin')) {
            $query->where('ejecutado_at', '<=', Carbon::parse($request->fecha_fin)->endOfDay());
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 15)));

        $logs = $query
            ->orderByDesc('ejecutado_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(function (OrderExternalApiLog $item) {
                $order = $item->order;

                return [
                    'id' => $item->id,
                    'order_id' => $item->order_id,
                    'order_status' => $order?->status,
                    'order_payment_method' => $order?->payment_method,
                    'http_status' => $item->http_status,
                    'estado' => $item->estado,
                    'origen' => $item->origen,
                    'respuesta_api' => $item->respuesta_api,
                    'ejecutado_at' => $item->ejecutado_at->format('Y-m-d H:i:s'),
                    'created_at' => $item->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ],
        ]);
    }
}
