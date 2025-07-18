<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name'    => 'required|string|max:255',
            'last_name'     => 'required|string|max:255',
            'middle_name'   => 'required|string|max:255',
            'phone'         => 'nullable|string|max:20',
            'email'         => 'required|string|email|max:255|unique:users',
            'password'      => [
                'required',
                'string',
                'min:8',
                'regex:/[a-z]/',      // minúscula
                'regex:/[A-Z]/',      // mayúscula
                'regex:/[0-9]/',      // número
                'regex:/[^a-zA-Z0-9]/', // caracter especial
            ],
        ], [
            'password.regex' => 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.'
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
        ]);

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'user' => $user->load('role'),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->only(['email', 'password']);

        $validator = Validator::make($credentials, [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!$token = JWTAuth::attempt($credentials)) {
            return response()->json(['error' => 'Credenciales inválidas'], 401);
        }

        $user = JWTAuth::setToken($token)->toUser();

        return response()->json([
            'user' => $user->load('role'),
            'token' => $token,
        ]);
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

    public function me()
    {
        $user = auth('api')->user();
        return response()->json($user ? $user->load('role') : null);
    }
}
