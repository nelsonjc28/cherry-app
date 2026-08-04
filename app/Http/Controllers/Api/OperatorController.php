<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OperatorController extends Controller
{
    /**
     * Get all operator users with their roles
     */
    public function getUsers()
    {
        try {
            $operatorRole = Role::where('name', 'operador')->first();
            if (!$operatorRole) {
                return response()->json([
                    'success' => false,
                    'message' => 'El rol de operador no existe'
                ], 404);
            }

            $users = User::with('role')->where('role_id', $operatorRole->id)->get();
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
     * Create a new operator user
     */
    public function createUser(Request $request)
    {
        try {
            $operatorRole = Role::where('name', 'operador')->first();
            if (!$operatorRole) {
                return response()->json([
                    'success' => false,
                    'message' => 'El rol de operador no existe'
                ], 404);
            }

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
                'role_id' => $operatorRole->id // Always create as operator
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Operador registrado exitosamente',
                'user' => $user->load('role')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear operador: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a user
     */
    public function updateUser(Request $request, $id)
    {
        try {
            $user = User::find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }

            $operatorRole = Role::where('name', 'operador')->first();
            if (!$operatorRole) {
                return response()->json([
                    'success' => false,
                    'message' => 'El rol de operador no existe'
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

            $userData = [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'middle_name' => $request->middle_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'role_id' => $operatorRole->id // Always keep as operator
            ];

            // Solo actualizar password si se proporciona
            if ($request->filled('password')) {
                $userData['password'] = Hash::make($request->password);
            }

            $user->update($userData);

            return response()->json([
                'success' => true,
                'message' => 'Operador actualizado exitosamente',
                'user' => $user->load('role')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar operador: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * PATCH /api/admin/operators/{id}/category-permission
     * Otorga o revoca el permiso de un operador para cambiar las categorías
     * de los clientes (bronce/oro/diamante).
     */
    public function toggleCategoryPermission(Request $request, $id)
    {
        try {
            $operatorRole = Role::where('name', 'operador')->first();
            if (!$operatorRole) {
                return response()->json([
                    'success' => false,
                    'message' => 'El rol de operador no existe'
                ], 404);
            }

            $operator = User::where('role_id', $operatorRole->id)->find($id);
            if (!$operator) {
                return response()->json([
                    'success' => false,
                    'message' => 'Operador no encontrado'
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
                    'errors' => $validator->errors()
                ], 422);
            }

            $operator->update([
                'can_change_category' => $request->boolean('can_change_category')
            ]);

            return response()->json([
                'success' => true,
                'message' => $operator->can_change_category
                    ? "Permiso de cambio de categoría otorgado a {$operator->first_name} {$operator->last_name}"
                    : "Permiso de cambio de categoría revocado a {$operator->first_name} {$operator->last_name}",
                'user' => $operator->load('role')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar permiso: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a user
     */
    public function deleteUser($id)
    {
        try {
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
                'message' => 'Operador eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar usuario: ' . $e->getMessage()
            ], 500);
        }
    }
}
