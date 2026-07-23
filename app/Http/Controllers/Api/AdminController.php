<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    /**
     * Get all admin and vendor users with their roles
     */
    public function getUsers()
    {
        try {
            $vendorRoleId = \App\Models\Role::where('name', 'vendedor')->value('id') ?? 4;
            $users = User::with('role')
                ->whereIn('role_id', [1, $vendorRoleId])
                ->get();
            return response()->json([
                'success' => true,
                'users' => $users
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener usuarios: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific user
     */
    public function getUser($id)
    {
        try {
            $user = User::with('role')->find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'user' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener usuario: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new admin or vendor user
     */
    public function createUser(Request $request)
    {
        try {
            // Verificar que el usuario autenticado no sea operador
            $authUser = auth()->user();
            if ($authUser && $authUser->isOperator()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Los operadores no tienen permiso para gestionar administradores'
                ], 403);
            }

            $vendorRoleId = \App\Models\Role::where('name', 'vendedor')->value('id') ?? 4;

            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'middle_name' => 'nullable|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'phone' => 'required|string|size:10|regex:/^[0-9]{10}$/|unique:users',
                'role_id' => "required|integer|in:1,{$vendorRoleId}",
                'idvendedor' => "nullable|string|max:64|required_if:role_id,{$vendorRoleId}",
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
                'phone.regex' => 'El teléfono debe contener solo números.',
                'idvendedor.required_if' => 'El ID Vendedor es obligatorio para usuarios con rol Vendedor.',
                'idvendedor.max' => 'El ID Vendedor no puede exceder 64 caracteres.',
                'role_id.in' => 'El rol debe ser Administrador o Vendedor.',
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
                'role_id' => (int) $request->role_id,
                'idvendedor' => $request->role_id == $vendorRoleId ? $request->idvendedor : null,
            ]);

            return response()->json([
                'success' => true,
                'message' => $request->role_id == $vendorRoleId
                    ? 'Vendedor registrado exitosamente'
                    : 'Administrador registrado exitosamente',
                'user' => $user->load('role')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear usuario: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a user
     */
    public function updateUser(Request $request, $id)
    {
        try {
            // Verificar que el usuario autenticado no sea operador
            $authUser = auth()->user();
            if ($authUser && $authUser->isOperator()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Los operadores no tienen permiso para gestionar administradores'
                ], 403);
            }

            $user = User::find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
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
                'idvendedor' => "nullable|string|max:64|required_if:role_id," . (\App\Models\Role::where('name', 'vendedor')->value('id') ?? 4),
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
                'phone.regex' => 'El teléfono debe contener solo números.',
                'idvendedor.required_if' => 'El ID Vendedor es obligatorio para usuarios con rol Vendedor.',
                'idvendedor.max' => 'El ID Vendedor no puede exceder 64 caracteres.',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $userData = [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'middle_name' => $request->middle_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'role_id' => $user->role_id, // no se cambia el rol en update
            ];

            // Para vendors: actualizar idvendedor. Para otros roles: null.
            $vendorRoleId = \App\Models\Role::where('name', 'vendedor')->value('id') ?? 4;
            $userData['idvendedor'] = $user->role_id == $vendorRoleId
                ? ($request->filled('idvendedor') ? $request->idvendedor : $user->idvendedor)
                : null;

            // Solo actualizar password si se proporciona
            if ($request->filled('password')) {
                $userData['password'] = Hash::make($request->password);
            }

            $user->update($userData);

            $message = $user->role_id == $vendorRoleId
                ? 'Vendedor actualizado exitosamente'
                : 'Administrador actualizado exitosamente';

            return response()->json([
                'success' => true,
                'message' => $message,
                'user' => $user->load('role')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar administrador: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a user
     */
    public function deleteUser($id)
    {
        try {
            // Verificar que el usuario autenticado no sea operador
            $authUser = auth()->user();
            if ($authUser && $authUser->isOperator()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Los operadores no tienen permiso para gestionar administradores'
                ], 403);
            }

            $user = User::find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
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
                'message' => 'Administrador eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar usuario: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all roles
     */
    public function getRoles()
    {
        try {
            $roles = Role::all();
            return response()->json([
                'success' => true,
                'roles' => $roles
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener roles: ' . $e->getMessage()
            ], 500);
        }
    }
}
