<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CronMailLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CronMailLogController extends Controller
{
    public function __construct(
        protected \App\Services\CronMailLogService $cronMailLogService,
        protected \App\Services\AbandonedCartEmailService $abandonedCartEmailService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = CronMailLog::query()
            ->with([
                'user:id,first_name,last_name,email',
                'order:id,status',
                'cart:id,total_items',
            ]);

        if ($request->filled('comando')) {
            $query->where('comando', $request->comando);
        }

        if ($request->filled('tipo_correo')) {
            $query->where('tipo_correo', $request->tipo_correo);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('order_id')) {
            $query->where('order_id', (int) $request->order_id);
        }

        if ($request->filled('cart_id')) {
            $query->where('cart_id', (int) $request->cart_id);
        }

        if ($request->filled('fecha_inicio')) {
            $query->where('ejecutado_at', '>=', Carbon::parse($request->fecha_inicio)->startOfDay());
        }

        if ($request->filled('fecha_fin')) {
            $query->where('ejecutado_at', '<=', Carbon::parse($request->fecha_fin)->endOfDay());
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 15)));

        $logs = $query
            ->orderByDesc('ejecutado_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(function (CronMailLog $item) {
                $stats = null;
                if ($item->tipo_correo === CronMailLog::TIPO_RESUMEN && $item->mensaje) {
                    $decoded = json_decode((string) $item->mensaje, true);
                    if (is_array($decoded)) {
                        $stats = $decoded;
                    }
                }

                return [
                    'id' => $item->id,
                    'comando' => $item->comando,
                    'tipo_correo' => $item->tipo_correo,
                    'estado' => $item->estado,
                    'origen' => $item->origen,
                    'user_id' => $item->user_id,
                    'user_name' => $item->user
                        ? trim($item->user->first_name.' '.$item->user->last_name)
                        : null,
                    'user_email' => $item->user?->email,
                    'cart_id' => $item->cart_id,
                    'order_id' => $item->order_id,
                    'order_status' => $item->order?->status,
                    'email_destino' => $item->email_destino,
                    'mensaje' => $item->mensaje,
                    'resumen' => $stats,
                    'ejecutado_at' => $item->ejecutado_at->format('Y-m-d H:i:s'),
                    'created_at' => $item->created_at->format('Y-m-d H:i:s'),
                ];
            });

        $pendingAbandoned = $this->abandonedCartEmailService->countDue();
        $pendingOrderStatus = $this->cronMailLogService->orderStatusCandidatesQuery()->count();

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'pending' => [
                'abandoned_cart' => $pendingAbandoned,
                'order_status' => $pendingOrderStatus,
            ],
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
