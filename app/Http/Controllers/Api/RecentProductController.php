<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\RecentProduct;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RecentProductController extends Controller
{
    /**
     * Registrar o actualizar un producto visto recientemente
     * POST /api/recent-products
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|string',
        ]);

        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Usuario no autenticado'
            ], 401);
        }

        try {
            // Buscar si ya existe el registro para este usuario y producto
            $recentProduct = RecentProduct::where('user_id', $user->id)
                ->where('product_id', $request->product_id)
                ->first();

            if ($recentProduct) {
                // Si existe, actualizar updated_at (touch)
                $recentProduct->touch();
            } else {
                // Si no existe, crear nuevo registro
                $recentProduct = RecentProduct::create([
                    'user_id' => $user->id,
                    'product_id' => $request->product_id,
                ]);

                // Mantener solo los últimos 10 registros por usuario
                $this->keepLastTen($user->id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Producto registrado correctamente',
                'data' => [
                    'id' => $recentProduct->id,
                    'product_id' => $recentProduct->product_id,
                    'updated_at' => $recentProduct->updated_at,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al registrar producto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener lista de productos vistos recientemente
     * GET /api/recent-products
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Usuario no autenticado'
            ], 401);
        }

        try {
            $orderedIds = RecentProduct::where('user_id', $user->id)
                ->orderBy('updated_at', 'desc')
                ->pluck('product_id');

            if ($orderedIds->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                ], 200);
            }

            $visibleQuery = DB::table('productos')->whereIn('productos.id', $orderedIds);
            Producto::applyFechaAgotadoVisibilityToProductosQuery($visibleQuery);
            $visibleSet = $visibleQuery->pluck('id')->flip()->all();

            $filteredIds = $orderedIds->filter(fn ($id) => isset($visibleSet[$id]))->values()->toArray();

            return response()->json([
                'success' => true,
                'data' => $filteredIds,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos recientes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mantener solo los últimos 10 registros por usuario
     * Elimina los registros más antiguos si hay más de 10
     */
    private function keepLastTen(int $userId): void
    {
        $count = RecentProduct::where('user_id', $userId)->count();
        
        if ($count > 10) {
            // Obtener los IDs de los registros más antiguos (excluyendo los últimos 10)
            $oldestIds = RecentProduct::where('user_id', $userId)
                ->orderBy('updated_at', 'asc')
                ->skip(10)
                ->take($count - 10)
                ->pluck('id');
            
            // Eliminar los registros más antiguos
            RecentProduct::whereIn('id', $oldestIds)->delete();
        }
    }
}
