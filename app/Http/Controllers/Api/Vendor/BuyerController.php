<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VendorBuyer;
use App\Services\ExternalClienteDiscountService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Endpoints accesibles por un vendedor autenticado sobre SUS compradores asociados.
 * Todas las queries filtran por los buyers vinculados al vendor en vendor_buyer
 * y por la categoría elegible (oro/diamante) en tiempo real.
 */
class BuyerController extends Controller
{
    protected ExternalClienteDiscountService $externalClienteDiscountService;

    public function __construct(ExternalClienteDiscountService $externalClienteDiscountService)
    {
        $this->externalClienteDiscountService = $externalClienteDiscountService;
    }

    /**
     * GET /api/vendor/buyers
     * Lista los clientes cuyo idvendedor coincide con el del vendedor autenticado.
     */
    public function index(Request $request)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            $vendorIdvendedor = $vendor->idvendedor;

            if (empty($vendorIdvendedor)) {
                return response()->json([
                    'success' => true,
                    'buyers' => [],
                    'message' => 'El vendedor no tiene configurado un ID de vendedor externo.',
                ]);
            }

            $buyers = User::with('role')
                ->where('role_id', 2)
                ->where('idvendedor', $vendorIdvendedor)
                ->orderBy('id', 'desc')
                ->get();

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
     * Muestra un cliente del vendedor por idvendedor.
     */
    public function show($id)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            $vendorIdvendedor = $vendor->idvendedor;
            if (empty($vendorIdvendedor)) {
                return response()->json(['success' => false, 'message' => 'Vendedor sin ID configurado'], 400);
            }

            $buyer = User::with('role')
                ->where('id', $id)
                ->where('role_id', 2)
                ->where('idvendedor', $vendorIdvendedor)
                ->first();

            if (! $buyer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado o no asociado a este vendedor',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'buyer' => $buyer,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener cliente: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/vendor/buyers/{id}/addresses
     * Devuelve las direcciones del cliente seleccionado (validado por idvendedor).
     */
    public function addresses($id)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            $vendorIdvendedor = $vendor->idvendedor;
            if (empty($vendorIdvendedor)) {
                return response()->json(['success' => false, 'message' => 'Vendedor sin ID configurado'], 400);
            }

            $buyer = User::where('id', $id)
                ->where('role_id', 2)
                ->where('idvendedor', $vendorIdvendedor)
                ->first();

            if (! $buyer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado o no asociado a este vendedor',
                ], 404);
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

    /**
     * GET /api/vendor/buyers/{id}/discounts
     * Devuelve los descuentos reales del cliente desde la API externa.
     */
    public function discounts($id)
    {
        try {
            $vendor = Auth::user();
            if (! $vendor) {
                return response()->json(['success' => false, 'message' => 'No autenticado'], 401);
            }

            $vendorIdvendedor = $vendor->idvendedor;
            if (empty($vendorIdvendedor)) {
                return response()->json(['success' => false, 'message' => 'Vendedor sin ID configurado'], 400);
            }

            $buyer = User::where('id', $id)
                ->where('role_id', 2)
                ->where('idvendedor', $vendorIdvendedor)
                ->first();

            if (! $buyer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado o no asociado a este vendedor',
                ], 404);
            }

            $discounts = $this->externalClienteDiscountService->fetchDiscountPercents((int) $buyer->id);

            return response()->json([
                'success' => true,
                'volume_descuento1' => $discounts['descuento1'],
                'volume_descuento2' => $discounts['descuento2'],
                'external_client_id' => $discounts['external_client_id'],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener descuentos: ' . $e->getMessage(),
            ], 500);
        }
    }
}