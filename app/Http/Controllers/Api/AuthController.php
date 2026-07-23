<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DayFortyFive;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use App\Mail\WelcomeEmail;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Services\CronMailLogService;
use App\Services\ExternalClienteDiscountService;
use App\Models\CronMailLog;
use Illuminate\Support\Facades\Log;


class AuthController extends Controller
{
    public function __construct(
        protected CronMailLogService $cronMailLogService
    ) {}

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name'    => 'required|string|max:255',
            'last_name'     => 'required|string|max:255',
            'middle_name'   => 'nullable|string|max:255',
            'phone'         => 'required|string|size:10|regex:/^[0-9]{10}$/|unique:users',
            'email'         => 'required|string|email|max:255|unique:users',
            'password'      => [
                'required',
                'string',
                'min:8',
                'regex:/[a-z]/',      // minúscula
                'regex:/[A-Z]/',      // mayúscula
                'regex:/[0-9]/',      // número
            ],
        ], [
            'password.regex' => 'La contraseña debe contener al menos una mayúscula, una minúscula y un número.',
            'phone.unique' => 'Este número de teléfono ya está registrado.',
            'phone.size' => 'El teléfono debe tener exactamente 10 dígitos.',
            'phone.regex' => 'El teléfono debe contener solo números.',
            'email.unique' => 'Este correo electrónico ya está registrado.',
            'email.required' => 'El correo electrónico es requerido.'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'first_name'    => $request->first_name,
            'last_name'     => $request->last_name,
            'middle_name'   => $request->middle_name,
            'phone'         => $request->phone,
            'email'         => $request->email,
            'password'      => Hash::make($request->password),
            'role_id'       => 2, // Default to cliente role
            'seller_category' => 'bronce', // All new users start with 'bronce'
            'credit_balance' => 0, // Start with no credit
        ]);

        // NOTA: Ya no se crea el registro de dayFortyFive al registrarse
        // El registro se creará cuando el cliente haga una compra >= 7000 MXN
        // (solo productos con desc_promo = 0 y sin descuentos personalizados)

        $token = JWTAuth::fromUser($user);

        if ($user->email && ! $user->welcome_sent) {
            Log::info('Intentando encolar correo de bienvenida', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            try {
                Mail::to($user->email)->queue(new WelcomeEmail($user));
                $user->forceFill(['welcome_sent' => true])->save();

                $this->cronMailLogService->recordWelcome(
                    CronMailLog::ESTADO_ENCOLADO,
                    'Correo de bienvenida encolado en la cola',
                    $user,
                    CronMailLog::COMANDO_REGISTER,
                );

                Log::info('Correo de bienvenida encolado', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                ]);
            } catch (\Throwable $e) {
                $this->cronMailLogService->recordWelcome(
                    CronMailLog::ESTADO_ERROR,
                    'Error al encolar: '.$e->getMessage(),
                    $user,
                    CronMailLog::COMANDO_REGISTER,
                );

                Log::error('Welcome email queue failed on register', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'user' => $user->fresh()->load('role'),
            'token' => $token,
        ], 201);
    }

    public function completeProfile(Request $request)
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return response()->json(['error' => 'Usuario no autenticado'], 401);
            }

            $validator = Validator::make($request->all(), [
                'birth_day' => 'nullable|integer|min:1|max:31',
                'birth_month' => 'nullable|string|max:50',
                'birth_year' => 'nullable|integer|min:1900|max:' . date('Y'),
                'street' => 'nullable|string|max:255',
                'city' => 'nullable|string|max:255',
                'municipality' => 'nullable|string|max:255',
                'state' => 'nullable|string|max:255',
                'postal_code' => 'nullable|string|max:10',
                'country' => 'nullable|string|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Actualizar datos del usuario
            $user->update([
                'birth_day' => $request->birth_day,
                'birth_month' => $request->birth_month,
                'birth_year' => $request->birth_year,
            ]);

            // Si se proporcionan datos de dirección, crear una dirección
            if ($request->street || $request->city || $request->postal_code) {
                $user->addresses()->create([
                    'name' => 'Principal',
                    'street_address' => $request->street,
                    'city' => $request->city,
                    'municipality' => $request->municipality,
                    'state' => $request->state,
                    'postal_code' => $request->postal_code,
                    'country' => $request->country ?? 'México',
                    'is_default' => true,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Perfil completado exitosamente',
                'user' => $user->load('role', 'addresses')
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al completar el perfil: ' . $e->getMessage()
            ], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $credentials = $request->only(['identifier', 'password']);

            $validator = Validator::make($credentials, [
                'identifier' => 'required|string',
                'password' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $identifier = $credentials['identifier'];

            // Buscar usuario por email o teléfono
            $user = User::where(function ($query) use ($identifier) {
                $query->where('email', $identifier)
                    ->orWhere('phone', $identifier);
            })->first();

            if (!$user || !Hash::check($credentials['password'], $user->password)) {
                return response()->json(['error' => 'Credenciales inválidas'], 401);
            }

            $token = JWTAuth::fromUser($user);

            $user = JWTAuth::setToken($token)->toUser();

            // Cargar la relación role
            $userWithRole = User::with('role')->find($user->id);

            try {
                $ext = app(ExternalClienteDiscountService::class)->fetchDiscountPercents((int) $userWithRole->id);
                if ($ext['success']) {
                    $userWithRole->setAttribute('volume_descuento1', $ext['descuento1']);
                    $userWithRole->setAttribute('volume_descuento2', $ext['descuento2']);
                }
            } catch (\Throwable $e) {
                Log::warning('Login: no se pudieron obtener descuentos API cliente', [
                    'user_id' => $userWithRole->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'user' => $userWithRole,
                'token' => $token,
            ]);
        } catch (\Exception $e) {
            Log::error('Login error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Error interno del servidor',
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ], 500);
        }
    }

    public function logout()
    {
        try {
            auth('api')->logout();
            return response()->json(['message' => 'Sesión cerrada correctamente']);
        } catch (\Exception $e) {
            // Si hay algún error, aún así devolver éxito para que el frontend pueda limpiar su estado
            return response()->json(['message' => 'Sesión cerrada correctamente']);
        }
    }

    private function isClientRole($user): bool
    {
        return $user && $user->role && $user->role->name === 'cliente';
    }

    public function me()
    {
        try {
            $user = auth('api')->user();
            if (!$user) {
                return response()->json(['error' => 'No autenticado'], 401);
            }

            // Cargar la relación role usando fresh
            $userWithRole = User::with('role')->find($user->id);

            try {
                $ext = app(ExternalClienteDiscountService::class)->fetchDiscountPercents((int) $userWithRole->id);
                if ($ext['success']) {
                    $userWithRole->setAttribute('volume_descuento1', $ext['descuento1']);
                    $userWithRole->setAttribute('volume_descuento2', $ext['descuento2']);
                }

                // Sincronizar idvendedor del cliente desde la API externa.
                // Para role='cliente': la API indica qué vendedor lo atiende.
                // Para role='vendedor': el idvendedor lo pone el admin (no se sobreescribe).
                // Solo actualizamos si la API devolvió un valor.
                if (! empty($ext['idvendedor']) && $this->isClientRole($userWithRole)) {
                    if ($userWithRole->idvendedor !== $ext['idvendedor']) {
                        $userWithRole->idvendedor = $ext['idvendedor'];
                        $userWithRole->save();
                    }
                }

                // Exponer idvendedor y nombre_vendedor en la respuesta
                $userWithRole->setAttribute('idvendedor_api', $ext['idvendedor'] ?? null);
                $userWithRole->setAttribute('nombre_vendedor_api', $ext['nombre_vendedor'] ?? null);
            } catch (\Throwable $e) {
                Log::warning('me(): no se pudieron obtener descuentos API cliente', [
                    'user_id' => $userWithRole->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json($userWithRole);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error de autenticación: ' . $e->getMessage()], 500);
        }
    }

    public function debug()
    {
        return response()->json([
            'message' => 'Debug endpoint working',
            'timestamp' => now(),
            'user' => auth('api')->user()
        ]);
    }
}
