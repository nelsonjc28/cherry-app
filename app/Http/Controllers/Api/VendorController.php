<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\VendorBuyer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * CRUD administrativo de usuarios con rol 'vendedor' y gestión de sus
 * compradores asociados (clientes oro/diamante).
 */
class VendorController extends Controller
{
    /**
     * Devuelve el modelo Role 'vendedor' o un 500 si no existe.
     */
    private function getVendorRole(): Role
    {
        $role = Role::where('name', 'vendedor')->first();
        if (! $role) {
            abort(response()->json([
                'success' => false,
                'message' => 'El rol de vendedor no existe. Ejecuta las migraciones pendientes.',
            ], 500));
        }
        return $role;
    }

    /**
     * Devuelve el modelo Role 'cliente' o un 500 si no existe.
     */
    private function getClientRole(): Role
    {
        $role = Role::where('name', 'cliente')->first();
        if (! $role) {
            abort(response()->json([
                'success' => false,
                'message' => 'El rol de cliente no existe.',
            ], 500));
        }
        return $role;
    }

    /**
     * GET /api/admin/vendors
     * Lista todos los vendedores con su rol y conteo de compradores activos.
     */
    public function index()
    {
        try {
            $vendorRole = $this->getVendorRole();

            $vendors = User::with('role')
                ->where('role_id', $vendorRole->id)
                ->withCount(['buyers as active_buyers_count' => function ($q) {
                    $q->where('vendor_buyer.is_active', true);
                }])
                ->orderBy('id', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'users' => $vendors,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener vendedores: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/vendors/{id}
     * Muestra un vendedor con sus compradores asociados (activos e inactivos).
     */
    public function show($id)
    {
        try {
            $vendorRole = $this->getVendorRole();

            $user = User::with(['role', 'buyers.role'])
                ->where('role_id', $vendorRole->id)
                ->find($id);

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendedor no encontrado',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'user' => $user,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener vendedor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/admin/vendors
     * Crea un nuevo vendedor. El password es obligatorio.
     */
    public function store(Request $request)
    {
        try {
            $vendorRole = $this->getVendorRole();

            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'middle_name' => 'nullable|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'phone' => 'required|string|size:10|regex:/^[0-9]{10}$/|unique:users',
                'idvendedor' => 'required|string|max:64',
                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'regex:/[a-z]/',
                    'regex:/[A-Z]/',
                    'regex:/[0-9]/',
                ],
            ], [
                'password.regex' => 'La contraseña debe contener al menos una mayúscula, una minúscula y un número.',
                'email.unique' => 'Este correo electrónico ya está registrado.',
                'email.required' => 'El correo electrónico es requerido.',
                'phone.unique' => 'Este número de teléfono ya está registrado.',
                'phone.size' => 'El teléfono debe tener exactamente 10 dígitos.',
                'phone.regex' => 'El teléfono debe contener solo números.',
                'idvendedor.required' => 'El ID Vendedor es obligatorio.',
                'idvendedor.max' => 'El ID Vendedor no puede exceder 64 caracteres.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = User::create([
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'middle_name' => $request->middle_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'role_id' => $vendorRole->id,
                'idvendedor' => trim($request->idvendedor),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Vendedor registrado exitosamente',
                'user' => $user->load('role'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear vendedor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/admin/vendors/{id}
     * Actualiza un vendedor. Email y password son opcionales.
     */
    public function update(Request $request, $id)
    {
        try {
            $vendorRole = $this->getVendorRole();

            $user = User::where('role_id', $vendorRole->id)->find($id);
            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendedor no encontrado',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'middle_name' => 'nullable|string|max:255',
                'email' => [
                    'nullable',
                    'string',
                    'email',
                    'max:255',
                    Rule::unique('users')->ignore($id),
                ],
                'phone' => [
                    'required',
                    'string',
                    'size:10',
                    'regex:/^[0-9]{10}$/',
                    Rule::unique('users')->ignore($id),
                ],
                'idvendedor' => 'required|string|max:64',
                'password' => [
                    'nullable',
                    'string',
                    'min:8',
                    'regex:/[a-z]/',
                    'regex:/[A-Z]/',
                    'regex:/[0-9]/',
                ],
            ], [
                'password.regex' => 'La contraseña debe contener al menos una mayúscula, una minúscula y un número.',
                'email.unique' => 'Este correo electrónico ya está registrado.',
                'phone.unique' => 'Este número de teléfono ya está registrado.',
                'phone.size' => 'El teléfono debe tener exactamente 10 dígitos.',
                'phone.regex' => 'El teléfono debe contener solo números.',
                'idvendedor.required' => 'El ID Vendedor es obligatorio.',
                'idvendedor.max' => 'El ID Vendedor no puede exceder 64 caracteres.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $data = [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'middle_name' => $request->middle_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'role_id' => $vendorRole->id,
                'idvendedor' => trim($request->idvendedor),
            ];

            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }

            $user->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Vendedor actualizado exitosamente',
                'user' => $user->load('role'),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar vendedor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/admin/vendors/{id}/category-permission
     * Otorga o revoca el permiso de un vendedor para cambiar las categorías
     * de sus clientes asociados (bronce/oro/diamante).
     */
    public function toggleCategoryPermission(Request $request, $id)
    {
        try {
            $vendorRole = $this->getVendorRole();

            $vendor = User::where('role_id', $vendorRole->id)->find($id);
            if (! $vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendedor no encontrado',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'can_change_category' => 'required|boolean',
            ], [
                'can_change_category.required' => 'El campo can_change_category es requerido',
                'can_change_category.boolean' => 'El campo can_change_category debe ser true o false',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $vendor->update([
                'can_change_category' => $request->boolean('can_change_category'),
            ]);

            return response()->json([
                'success' => true,
                'message' => $vendor->can_change_category
                    ? "Permiso de cambio de categoría otorgado a {$vendor->first_name} {$vendor->last_name}"
                    : "Permiso de cambio de categoría revocado a {$vendor->first_name} {$vendor->last_name}",
                'user' => $vendor->load('role'),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar permiso: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/vendors/{id}
     * Elimina un vendedor. cascadeOnDelete en vendor_buyer limpia asociaciones.
     */
    public function destroy($id)
    {
        try {
            $vendorRole = $this->getVendorRole();

            $user = User::where('role_id', $vendorRole->id)->find($id);
            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendedor no encontrado',
                ], 404);
            }

            if ((int) $user->id === (int) auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes eliminar tu propia cuenta',
                ], 400);
            }

            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'Vendedor eliminado exitosamente',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar vendedor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/vendors/{id}/buyers
     * Lista compradores asociados al vendedor.
     * Query params opcionales:
     *   - active=true|false   filtra por asociaciones activas/inactivas
     *   - eligible=true       filtra sólo compradores actualmente oro/diamante
     */
    public function listBuyers(Request $request, $id)
    {
        try {
            $vendorRole = $this->getVendorRole();
            $vendor = User::where('role_id', $vendorRole->id)->find($id);
            if (! $vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendedor no encontrado',
                ], 404);
            }

            // Mostrar todos los clientes cuyo idvendedor coincide con el del vendedor.
            $buyers = collect();

            if (! empty($vendor->idvendedor)) {
                $buyers = User::with('role')
                    ->where('role_id', 2)
                    ->where('idvendedor', $vendor->idvendedor)
                    ->orderBy('first_name')
                    ->get();
            }

            // Si se pide active=true|false, filtrar por la asociación en vendor_buyer
            if ($request->has('active')) {
                $activeBuyerIds = VendorBuyer::where('vendor_id', $vendor->id)
                    ->where('is_active', true)
                    ->pluck('buyer_id')
                    ->all();

                if ($request->boolean('active')) {
                    $buyers = $buyers->filter(function ($b) use ($activeBuyerIds) {
                        return in_array($b->id, $activeBuyerIds);
                    })->values();
                } elseif ($request->active === 'false') {
                    $buyers = $buyers->filter(function ($b) use ($activeBuyerIds) {
                        return ! in_array($b->id, $activeBuyerIds);
                    })->values();
                }
            }

            // Si se pide eligible, mantener sólo los que siguen siendo oro/diamante
            if ($request->boolean('eligible')) {
                $buyers = $buyers->filter(function ($b) {
                    return in_array($b->seller_category, VendorBuyer::ALLOWED_BUYER_CATEGORIES, true);
                })->values();
            }

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
     * POST /api/admin/vendors/{id}/buyers
     * Asocia un comprador al vendedor. Si ya existe la asociación, la reactiva.
     * Valida:
     *   - buyer_id existe
     *   - buyer tiene rol 'cliente'
     *   - buyer tiene seller_category oro o diamante
     *   - buyer_id != vendor_id (no auto-asociarse)
     */
    public function attachBuyer(Request $request, $id)
    {
        try {
            $vendorRole = $this->getVendorRole();
            $vendor = User::where('role_id', $vendorRole->id)->find($id);
            if (! $vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendedor no encontrado',
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'buyer_id' => 'required|integer|exists:users,id',
                'is_active' => 'nullable|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $clientRole = $this->getClientRole();
            $buyer = User::find($request->buyer_id);

            if (! $buyer || (int) $buyer->role_id !== (int) $clientRole->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'El usuario seleccionado no es un cliente',
                ], 422);
            }

            if ((int) $buyer->id === (int) $vendor->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Un vendedor no puede asociarse a sí mismo',
                ], 422);
            }

            if (! VendorBuyer::isEligibleBuyer($buyer)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo se pueden asociar clientes con categoría oro o diamante. La categoría actual del cliente es: ' . ($buyer->seller_category ?? 'sin categoría'),
                ], 422);
            }

            $association = VendorBuyer::updateOrCreate(
                ['vendor_id' => $vendor->id, 'buyer_id' => $buyer->id],
                ['is_active' => $request->input('is_active', true)]
            );

            return response()->json([
                'success' => true,
                'message' => 'Comprador asociado exitosamente',
                'association' => $association,
                'buyer' => $buyer->load('role'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al asociar comprador: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/vendors/{id}/buyers/{buyerId}
     * Elimina físicamente la asociación (el comprador deja de estar vinculado).
     */
    public function detachBuyer($id, $buyerId)
    {
        try {
            $vendorRole = $this->getVendorRole();
            $vendor = User::where('role_id', $vendorRole->id)->find($id);
            if (! $vendor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vendedor no encontrado',
                ], 404);
            }

            $deleted = VendorBuyer::where('vendor_id', $vendor->id)
                ->where('buyer_id', $buyerId)
                ->delete();

            if ($deleted === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'La asociación no existe',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Comprador desvinculado exitosamente',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al desvincular comprador: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/clients/eligible-for-vendor
     * Lista los clientes que actualmente pueden ser asociados a un vendedor
     * (rol cliente + seller_category oro/diamante).
     * Query params opcionales:
     *   - search=texto      filtra por nombre, email o teléfono
     *   - exclude_vendor_id=id  excluye clientes ya asociados al vendor dado
     */
    public function eligibleClients(Request $request)
    {
        try {
            $clientRole = $this->getClientRole();

            $query = User::with('role')
                ->where('role_id', $clientRole->id)
                ->whereIn('seller_category', VendorBuyer::ALLOWED_BUYER_CATEGORIES);

            if ($search = trim((string) $request->query('search', ''))) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            if ($vendorId = $request->query('exclude_vendor_id')) {
                // Filtrar por idvendedor del vendor: solo mostrar clientes
                // cuyo idvendedor coincida con el del vendedor seleccionado.
                $vendor = User::find($vendorId);
                if ($vendor && ! empty($vendor->idvendedor)) {
                    $query->where('idvendedor', $vendor->idvendedor);
                } else {
                    // Si el vendor no tiene idvendedor configurado,
                    // no mostrar clientes elegibles.
                    $query->whereRaw('1 = 0');
                }

                $alreadyAssociated = VendorBuyer::where('vendor_id', $vendorId)
                    ->pluck('buyer_id')
                    ->all();
                if (! empty($alreadyAssociated)) {
                    $query->whereNotIn('id', $alreadyAssociated);
                }
            }

            $clients = $query->orderBy('first_name')->limit(200)->get();

            return response()->json([
                'success' => true,
                'clients' => $clients,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener clientes elegibles: ' . $e->getMessage(),
            ], 500);
        }
    }
}