<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VendorBuyer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Endpoints accesibles por un vendedor autenticado sobre SUS compradores asociados.
 * Todas las queries filtran por los buyers vinculados al vendor en vendor_buyer
 * y por la categoría elegible (oro/diamante) en tiempo real.
 */
class BuyerController extends Controller
{
    /**
     * GET /api/vendor/buyers
     * Lista compradores activos y elegibles del vendedor autenticado.
     * Si un cliente fue asociado pero su categoría cambió a bronce (o vacía),
     * NO aparecerá en este listado (requisito #4: filtro dinámico).
     */
    public function index(Request $request)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            $buyers = $vendor->buyers()
                ->with('role')
                ->wherePivot('is_active', true)
                ->get()
                ->filter(function ($buyer) {
                    return in_array($buyer->seller_category, VendorBuyer::ALLOWED_BUYER_CATEGORIES, true);
                })
                ->values();

            return response()->json([
                'success' => true,
                'buyers' => $buyers,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener compradores: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/vendor/buyers/{id}
     * Muestra un comprador asociado. Valida que sea del vendor y categoría elegible.
     */
    public function show($id)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            $buyer = $vendor->buyers()
                ->with('role')
                ->wherePivot('is_active', true)
                ->where('users.id', $id)
                ->first();

            if (! $buyer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Comprador no encontrado o no asociado a este vendedor',
                ], 404);
            }

            if (! in_array($buyer->seller_category, VendorBuyer::ALLOWED_BUYER_CATEGORIES, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El cliente ya no pertenece a las categorías oro/diamante y no puede recibir pedidos del vendedor.',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'buyer' => $buyer,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener comprador: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/vendor/buyers/{id}/addresses
     * Devuelve las direcciones del comprador seleccionado (requisito #2).
     * Solo retorna si el comprador sigue siendo elegible y está asociado al vendor.
     */
    public function addresses($id)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            $buyer = $vendor->buyers()
                ->wherePivot('is_active', true)
                ->where('users.id', $id)
                ->first();

            if (! $buyer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Comprador no encontrado o no asociado a este vendedor',
                ], 404);
            }

            if (! in_array($buyer->seller_category, VendorBuyer::ALLOWED_BUYER_CATEGORIES, true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El cliente ya no pertenece a las categorías oro/diamante.',
                ], 403);
            }

            $addresses = $buyer->addresses()->orderByDesc('is_default')->get();

            return response()->json([
                'success' => true,
                'addresses' => $addresses,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener direcciones: ' . $e->getMessage(),
            ], 500);
        }
    }
}