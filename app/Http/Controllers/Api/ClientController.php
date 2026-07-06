<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use App\Models\Order;
use App\Models\Address;
use App\Services\ExternalClienteDiscountService;
use App\Services\ExternalClienteAccountService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    /**
     * Get all client users with their roles
     */
    public function getClients()
    {
        try {
            $users = User::with(['role', 'addresses'])
                ->where('role_id', 2)
                ->orderBy('id', 'desc')
                ->get();
            return response()->json([
                'success' => true,
                'users' => $users
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener clientes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific client
     */
    public function getClient($id)
    {
        try {
            $user = User::with(['role', 'addresses'])->where('role_id', 2)->find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'user' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Descuentos informativos desde la API externa de clientes (id DM + 5 dígitos).
     */
    public function getExternalClientDiscounts($id, ExternalClienteDiscountService $service)
    {
        try {
            $user = User::where('role_id', 2)->find($id);
            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado',
                ], 404);
            }

            $result = $service->fetchByUserId((int) $user->id);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al consultar la API: '.$e->getMessage(),
                'external_client_id' => ExternalClienteDiscountService::formatExternalClienteId((int) $id),
                'descuento1' => null,
                'descuento2' => null,
            ], 500);
        }
    }

    /**
     * Create a new client user
     */
    public function createClient(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'middle_name' => 'nullable|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'phone' => 'required|string|size:10|regex:/^[0-9]{10}$/|unique:users',
                'password' => [
                    'required',
                    'string',
                    'min:8',
                    'regex:/[a-z]/',      // minúscula
                    'regex:/[A-Z]/',      // mayúscula
                    'regex:/[0-9]/',      // número
                ]
            ], [
                'password.regex' => 'La contraseña debe contener al menos una mayúscula, una minúscula y un número.',
                'email.unique' => 'Este correo electrónico ya está registrado.',
                'email.required' => 'El correo electrónico es requerido.',
                'phone.unique' => 'Este número de teléfono ya está registrado.',
                'phone.size' => 'El teléfono debe tener exactamente 10 dígitos.',
                'phone.regex' => 'El teléfono debe contener solo números.'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = User::create([
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'middle_name' => $request->middle_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'role_id' => 2, // Always create as client
                'seller_category' => 'bronce', // All new clients start with 'bronce'
                'credit_balance' => 0, // Start with no credit
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cliente registrado exitosamente',
                'user' => $user->load('role')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a client
     */
    public function updateClient(Request $request, $id)
    {
        try {
            $user = User::where('role_id', 2)->find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado'
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
                    Rule::unique('users')->ignore($id)
                ],
                'phone' => [
                    'required',
                    'string',
                    'size:10',
                    'regex:/^[0-9]{10}$/',
                    Rule::unique('users')->ignore($id)
                ],
                'password' => [
                    'nullable',
                    'string',
                    'min:8',
                    'regex:/[a-z]/',
                    'regex:/[A-Z]/',
                    'regex:/[0-9]/',
                ]
            ], [
                'password.regex' => 'La contraseña debe contener al menos una mayúscula, una minúscula y un número.',
                'email.unique' => 'Este correo electrónico ya está registrado.',
                'phone.unique' => 'Este número de teléfono ya está registrado.',
                'phone.size' => 'El teléfono debe tener exactamente 10 dígitos.',
                'phone.regex' => 'El teléfono debe contener solo números.'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            if ($request->has('default_address')) {
                if (! is_array($request->input('default_address'))) {
                    return response()->json([
                        'success' => false,
                        'message' => 'default_address debe ser un objeto con los campos de dirección',
                    ], 422);
                }
                $addrRequest = Request::create('/', 'POST', $request->input('default_address', []));
                $addrValidator = $this->clientAddressValidator($addrRequest);
                if ($addrValidator->fails()) {
                    return response()->json([
                        'success' => false,
                        'errors' => $addrValidator->errors(),
                    ], 422);
                }
            }

            $userData = [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'middle_name' => $request->middle_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'role_id' => 2 // Always keep as client
            ];

            // Solo actualizar password si se proporciona
            if ($request->filled('password')) {
                $userData['password'] = Hash::make($request->password);
            }

            $user->update($userData);

            if ($request->has('default_address') && is_array($request->input('default_address'))) {
                $this->upsertDefaultClientAddress($user, $request->input('default_address', []));
            }

            return response()->json([
                'success' => true,
                'message' => 'Cliente actualizado exitosamente',
                'user' => $user->fresh()->load(['role', 'addresses'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validación de payload de dirección (misma regla que AddressController).
     *
     * @return \Illuminate\Contracts\Validation\Validator
     */
    protected function clientAddressValidator(Request $request)
    {
        return Validator::make($request->all(), [
            'street_address' => 'required|string|max:500',
            'street_number_ext' => ['nullable', 'regex:/^[0-9]{0,20}$/'],
            'street_number_int' => ['nullable', 'regex:/^[0-9]{0,20}$/'],
            'city' => 'required|string|max:255',
            'municipality' => 'nullable|string|max:255',
            'colonia' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:255',
            'additional_info' => 'nullable|string|max:1000',
            'is_default' => 'boolean',
        ]);
    }

    /**
     * Crea o actualiza la dirección predeterminada del cliente (misma lógica que store/update por ID).
     *
     * @param  array<string, mixed>  $a
     */
    protected function upsertDefaultClientAddress(User $user, array $a): void
    {
        $isDefault = filter_var($a['is_default'] ?? true, FILTER_VALIDATE_BOOLEAN);

        $address = $user->addresses()->where('is_default', true)->first()
            ?? $user->addresses()->orderBy('id')->first();

        $row = [
            'street_address' => $a['street_address'],
            'street_number_ext' => $a['street_number_ext'] ?? null,
            'street_number_int' => $a['street_number_int'] ?? null,
            'city' => $a['city'],
            'municipality' => $a['municipality'] ?? null,
            'colonia' => $a['colonia'] ?? null,
            'state' => $a['state'] ?? null,
            'postal_code' => $a['postal_code'] ?? null,
            'country' => $a['country'] ?? 'México',
            'additional_info' => $a['additional_info'] ?? null,
        ];

        if (! $address) {
            $hadNoAddresses = $user->addresses()->count() === 0;
            $makeDefault = $isDefault || $hadNoAddresses;
            if ($makeDefault) {
                $user->addresses()->update(['is_default' => false]);
            }
            $row['is_default'] = $makeDefault;
            $user->addresses()->create($row);

            return;
        }

        if ($isDefault) {
            $user->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }
        $row['is_default'] = $isDefault;
        $address->update($row);
    }

    /**
     * Crear una dirección para un cliente (desde admin).
     */
    public function storeClientAddress(Request $request, $id)
    {
        try {
            $user = User::where('role_id', 2)->find($id);

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado',
                ], 404);
            }

            $validator = $this->clientAddressValidator($request);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $isDefault = $request->boolean('is_default');
            $hadNoAddresses = $user->addresses()->count() === 0;
            $makeDefault = $isDefault || $hadNoAddresses;
            if ($makeDefault) {
                $user->addresses()->update(['is_default' => false]);
            }

            $address = $user->addresses()->create([
                'street_address' => $request->street_address,
                'street_number_ext' => $request->street_number_ext,
                'street_number_int' => $request->street_number_int,
                'city' => $request->city,
                'municipality' => $request->municipality,
                'colonia' => $request->colonia,
                'state' => $request->state,
                'postal_code' => $request->postal_code,
                'country' => $request->country ?? 'México',
                'additional_info' => $request->additional_info,
                'is_default' => $makeDefault,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Dirección creada correctamente',
                'address' => $address,
                'user' => $user->load(['role', 'addresses']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la dirección: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualizar una dirección de un cliente (desde admin).
     */
    public function updateClientAddress(Request $request, $id, $addressId)
    {
        try {
            $user = User::where('role_id', 2)->find($id);

            if (! $user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado',
                ], 404);
            }

            $address = Address::where('user_id', $user->id)->where('id', $addressId)->first();

            if (! $address) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dirección no encontrada',
                ], 404);
            }

            $validator = $this->clientAddressValidator($request);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $isDefault = $request->boolean('is_default');
            if ($isDefault) {
                $user->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
            }

            $address->update([
                'street_address' => $request->street_address,
                'street_number_ext' => $request->street_number_ext,
                'street_number_int' => $request->street_number_int,
                'city' => $request->city,
                'municipality' => $request->municipality,
                'colonia' => $request->colonia,
                'state' => $request->state,
                'postal_code' => $request->postal_code,
                'country' => $request->country ?? 'México',
                'additional_info' => $request->additional_info,
                'is_default' => $isDefault,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Dirección actualizada correctamente',
                'address' => $address->fresh(),
                'user' => $user->load(['role', 'addresses']),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la dirección: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a client
     */
    public function deleteClient($id)
    {
        try {
            $user = User::where('role_id', 2)->find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ], 404);
            }

            // No permitir eliminar el usuario actual
            if ($user->id === auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes eliminar tu propia cuenta'
                ], 400);
            }

            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'Cliente eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get account statements for a specific client
     */
    public function getClientAccountStatements($id)
    {
        try {
            $client = User::where('role_id', 2)->find($id);
            
            if (!$client) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ], 404);
            }

            // Obtener todas las órdenes del cliente pagadas o con crédito usado
            $orders = Order::where('user_id', $client->id)
                ->where(function ($query) {
                    $query->whereIn('status', ['pagado', 'en_espera_envio', 'enviado'])
                          ->orWhere(function ($q) {
                              $q->where('paid_with_credit', true)
                                ->where('credit_used', '>', 0);
                          });
                })
                ->orderBy('created_at', 'desc')
                ->get();

            // Formatear órdenes como estados de cuenta
            $statements = $orders->map(function ($order) {
                // Si usó crédito, el pendiente es el crédito usado (que debe ser pagado)
                // Si hay amount_pending adicional, se suma
                $creditUsed = (float) ($order->credit_used ?? 0);
                $amountPending = (float) ($order->amount_pending ?? 0);
                $pendingAmount = $creditUsed + $amountPending;
                
                // El monto pagado es lo que realmente pagó con dinero (no crédito)
                $amountPaid = (float) ($order->amount_paid ?? 0);
                
                return [
                    'fecha' => $order->created_at->toISOString(),
                    'cargo' => (float) $order->total_amount,
                    'referencia' => 'Orden #' . str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'pagado' => $amountPaid,
                    'pendiente' => $pendingAmount,
                    'credit_used' => $creditUsed,
                    'amount_pending' => $amountPending,
                    'paid_with_credit' => (bool) ($order->paid_with_credit ?? false),
                    'order_id' => $order->id
                ];
            });

            return response()->json([
                'success' => true,
                'statements' => $statements,
                'client' => [
                    'id' => $client->id,
                    'name' => $client->first_name . ' ' . $client->last_name,
                    'email' => $client->email
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los estados de cuenta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Estado de cuenta externo (API Cherry) para clientes oro y diamante.
     */
    public function getClientExternalAccountStatement($id, ExternalClienteAccountService $accountService)
    {
        try {
            $client = User::where('role_id', 2)->find($id);

            if (! $client) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado',
                ], 404);
            }

            if (! in_array($client->seller_category, ['oro', 'diamante'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta consulta solo está disponible para clientes Oro y Diamante',
                ], 403);
            }

            $result = $accountService->fetchAccountStatement(
                (int) $client->id,
                (float) ($client->credit_limit ?? 0)
            );

            if (! $result['success']) {
                return response()->json($result, 502);
            }

            return response()->json(array_merge($result, [
                'client' => [
                    'id' => $client->id,
                    'name' => trim($client->first_name.' '.$client->last_name),
                    'email' => $client->email,
                ],
            ]), 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el estado de cuenta: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update seller category for a client
     */
    public function updateSellerCategory(Request $request, $id)
    {
        try {
            // Verificar que el usuario autenticado no sea operador
            $authUser = auth()->user();
            if ($authUser && $authUser->isOperator()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Los operadores no tienen permiso para modificar la categoría de vendedor'
                ], 403);
            }

            $user = User::where('role_id', 2)->find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'seller_category' => 'required|in:bronce,oro,diamante'
            ], [
                'seller_category.required' => 'La categoría es requerida',
                'seller_category.in' => 'La categoría debe ser "bronce", "oro" o "diamante"'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $user->update([
                'seller_category' => $request->seller_category
            ]);

            // Si se cambia a bronce, resetear crédito y límite a 0
            if ($request->seller_category === 'bronce') {
                $user->update([
                    'credit_balance' => 0,
                    'credit_limit' => 0
                ]);
            }

            $categoryLabels = [
                'bronce' => 'Bronce',
                'oro' => 'Oro',
                'diamante' => 'Diamante'
            ];

            return response()->json([
                'success' => true,
                'message' => 'Categoría actualizada a ' . ($categoryLabels[$request->seller_category] ?? $request->seller_category),
                'user' => $user->load('role')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update credit balance for a client (only for oro category)
     */
    public function updateCreditBalance(Request $request, $id)
    {
        try {
            // Verificar que el usuario autenticado no sea operador
            $authUser = auth()->user();
            if ($authUser && $authUser->isOperator()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Los operadores no tienen permiso para asignar crédito'
                ], 403);
            }

            $user = User::where('role_id', 2)->find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ], 404);
            }

            // Solo permitir crédito para categoría oro o diamante
            if (!in_array($user->seller_category, ['oro', 'diamante'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo los clientes con categoría "oro" o "diamante" pueden tener crédito'
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'credit_balance' => 'required|numeric|min:0'
            ], [
                'credit_balance.required' => 'El monto de crédito es requerido',
                'credit_balance.numeric' => 'El crédito debe ser un número',
                'credit_balance.min' => 'El crédito no puede ser negativo'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Actualizar el límite de crédito (crédito total asignado)
            // El crédito disponible (credit_balance) se calcula restando lo usado del límite
            $newCreditLimit = $request->credit_balance; // El parámetro sigue siendo credit_balance pero representa el límite total
            
            // Calcular cuánto crédito se ha usado (diferencia entre límite y disponible)
            $creditUsed = ($user->credit_limit ?? 0) - ($user->credit_balance ?? 0);
            
            // El nuevo crédito disponible es el nuevo límite menos lo usado
            $newCreditBalance = max(0, $newCreditLimit - $creditUsed);
            
            $user->update([
                'credit_limit' => $newCreditLimit, // Límite total asignado
                'credit_balance' => $newCreditBalance // Crédito disponible (límite - usado)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Crédito actualizado exitosamente',
                'user' => $user->load('role')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar crédito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update credit limit for a client (only for oro category)
     */
    public function updateCreditLimit(Request $request, $id)
    {
        try {
            $user = User::where('role_id', 2)->find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ], 404);
            }

            // Solo permitir límite de crédito para categoría oro o diamante
            if (!in_array($user->seller_category, ['oro', 'diamante'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo los clientes con categoría "oro" o "diamante" pueden tener límite de crédito'
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'credit_limit' => 'required|numeric|min:0'
            ], [
                'credit_limit.required' => 'El límite de crédito es requerido',
                'credit_limit.numeric' => 'El límite debe ser un número',
                'credit_limit.min' => 'El límite no puede ser negativo'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Actualizar tanto el límite como el crédito disponible al mismo valor
            $newLimit = $request->credit_limit;
            
            $user->update([
                'credit_limit' => $newLimit,
                'credit_balance' => $newLimit // El crédito disponible siempre es igual al límite
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Límite de crédito actualizado exitosamente',
                'user' => $user->load('role')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar límite de crédito: ' . $e->getMessage()
            ], 500);
        }
    }
}
