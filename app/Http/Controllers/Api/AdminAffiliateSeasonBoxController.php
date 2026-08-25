<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliateSeason;
use App\Models\AffiliateSeasonBox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdminAffiliateSeasonBoxController extends Controller
{
    public function index($seasonId): JsonResponse
    {
        try {
            $boxes = AffiliateSeasonBox::where('affiliate_season_id', $seasonId)
                ->orderBy('display_order', 'ASC')
                ->get();

            return response()->json(['success' => true, 'boxes' => $boxes]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener recuadros: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request, $seasonId): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user || !$user->isAdminOrOperator()) {
                return response()->json(['success' => false, 'error' => 'Acceso no autorizado'], 401);
            }

            if (!AffiliateSeason::find($seasonId)) {
                return response()->json(['success' => false, 'error' => 'Sección no encontrada'], 404);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'button_text' => 'nullable|string|max:255',
                'button_url' => 'nullable|string|max:500',
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp',
                'is_active' => 'boolean',
                'display_order' => 'nullable|integer|min:0'
            ], [
                'image.mimes' => 'La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP',
                'image.image' => 'El archivo debe ser una imagen válida'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            $imagePath = null;
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $uploadPath = public_path('images/affiliate-season-boxes');
                if (!file_exists($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }
                $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
                $imagePath = 'images/affiliate-season-boxes/' . $imageName;

                if (!$image->move($uploadPath, $imageName)) {
                    return response()->json(['success' => false, 'error' => 'Error al guardar la imagen'], 500);
                }
            }

            $box = AffiliateSeasonBox::create([
                'affiliate_season_id' => $seasonId,
                'title' => $request->input('title'),
                'description' => $request->input('description'),
                'button_text' => $request->input('button_text'),
                'button_url' => $request->input('button_url'),
                'image_path' => $imagePath,
                'is_active' => $request->boolean('is_active', true),
                'display_order' => $request->display_order ?? 0
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Recuadro agregado exitosamente',
                'box' => $box
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al agregar recuadro: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $seasonId, $boxId): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user || !$user->isAdminOrOperator()) {
                return response()->json(['success' => false, 'error' => 'Acceso no autorizado'], 401);
            }

            $box = AffiliateSeasonBox::where('affiliate_season_id', $seasonId)->where('id', $boxId)->first();
            if (!$box) {
                return response()->json(['success' => false, 'error' => 'Recuadro no encontrado'], 404);
            }

            $updateData = [];
            $textFields = ['title', 'description', 'button_text', 'button_url'];
            foreach ($textFields as $field) {
                if ($request->has($field) && $request->input($field) !== null) {
                    $updateData[$field] = $request->input($field);
                }
            }

            if ($request->has('is_active')) {
                $updateData['is_active'] = $request->boolean('is_active');
            }
            if ($request->has('display_order')) {
                $updateData['display_order'] = (int) $request->input('display_order');
            }

            if ($request->hasFile('image')) {
                $imageValidator = Validator::make($request->all(), [
                    'image' => 'image|mimes:jpeg,png,jpg,gif,webp',
                ], [
                    'image.mimes' => 'La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP',
                    'image.image' => 'El archivo debe ser una imagen válida'
                ]);

                if ($imageValidator->fails()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Error de validación de imagen',
                        'errors' => $imageValidator->errors()
                    ], 422);
                }

                $uploadPath = public_path('images/affiliate-season-boxes');
                if (!file_exists($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }
                $image = $request->file('image');
                $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
                $imagePath = 'images/affiliate-season-boxes/' . $imageName;

                if ($image->move($uploadPath, $imageName)) {
                    if ($box->image_path && file_exists(public_path($box->image_path))) {
                        unlink(public_path($box->image_path));
                    }
                    $updateData['image_path'] = $imagePath;
                } else {
                    return response()->json(['success' => false, 'error' => 'Error al guardar la imagen'], 500);
                }
            }

            if (!empty($updateData)) {
                $box->update($updateData);
                return response()->json([
                    'success' => true,
                    'message' => 'Recuadro actualizado exitosamente',
                    'box' => $box->fresh()
                ]);
            }

            return response()->json(['success' => false, 'error' => 'No se proporcionaron datos para actualizar'], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar recuadro: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Request $request, $seasonId, $boxId): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user || !$user->isAdminOrOperator()) {
                return response()->json(['success' => false, 'error' => 'Acceso no autorizado'], 401);
            }

            $box = AffiliateSeasonBox::where('affiliate_season_id', $seasonId)->where('id', $boxId)->first();
            if (!$box) {
                return response()->json(['success' => false, 'error' => 'Recuadro no encontrado'], 404);
            }

            if ($box->image_path && file_exists(public_path($box->image_path))) {
                unlink(public_path($box->image_path));
            }
            $box->delete();

            return response()->json(['success' => true, 'message' => 'Recuadro eliminado exitosamente']);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al eliminar recuadro: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reorder(Request $request, $seasonId): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user || !$user->isAdminOrOperator()) {
                return response()->json(['success' => false, 'error' => 'Acceso no autorizado'], 401);
            }

            $validator = Validator::make($request->all(), [
                'boxes' => 'required|array',
                'boxes.*.id' => 'required|integer',
                'boxes.*.display_order' => 'required|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de validación',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();
            foreach ($request->boxes as $item) {
                AffiliateSeasonBox::where('affiliate_season_id', $seasonId)
                    ->where('id', $item['id'])
                    ->update(['display_order' => $item['display_order']]);
            }
            DB::commit();

            return response()->json(['success' => true, 'message' => 'Orden actualizado exitosamente']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'error' => 'Error al reordenar recuadros: ' . $e->getMessage()
            ], 500);
        }
    }
}
