<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Trait CRUD genérico para los módulos de contenido de afiliación.
 * Cada controlador define: $modelClass, $resourceKey, $fields, $imageDir.
 */
trait AffiliateCrudTrait
{
    protected function authorizeAdmin(Request $request): bool
    {
        $user = $request->user();
        return $user && $user->isAdminOrOperator();
    }

    protected function uploadImage(Request $request, string $dir): ?string
    {
        if (!$request->hasFile('image')) {
            return null;
        }
        $image = $request->file('image');
        $uploadPath = public_path($dir);
        if (!file_exists($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }
        $name = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
        $path = $dir . '/' . $name;
        return $image->move($uploadPath, $name) ? $path : null;
    }

    protected function imageRules(): array
    {
        return [
            'image.mimes' => 'La imagen no cumple con los formatos permitidos. Formatos: JPEG, JPG, PNG, GIF, WebP',
            'image.image' => 'El archivo debe ser una imagen válida'
        ];
    }

    /**
     * Nombre del campo de archivo entrante (p.ej. 'image').
     * Las subclases pueden sobrescribir si difiere.
     */
    protected function fileField(): string
    {
        return $this->fileField ?? 'image';
    }

    /**
     * Nombre de la columna BD donde se guarda la ruta (p.ej. 'image_path').
     */
    protected function dbImageField(): string
    {
        return $this->dbImageField ?? 'image_path';
    }

    /**
     * Construir reglas de validación dinámicas según $this->fields.
     */
    protected function buildRules(bool $isCreate = false): array
    {
        $rules = [];
        foreach ($this->fields as $field => $rule) {
            $rules[$field] = $isCreate ? $rule : 'sometimes|' . $rule;
        }
        return $rules;
    }

    /**
     * Clave usada para listar (p.ej. 'banners', 'seasons', 'faqs').
     */
    protected function listKey(): string
    {
        return $this->listKey ?? $this->resourceKey . 's';
    }

    public function index(): JsonResponse
    {
        try {
            $items = $this->modelClass::orderBy('display_order', 'ASC')->get();
            return response()->json(['success' => true, $this->listKey() => $items]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $item = $this->modelClass::find($id);
            if (!$item) {
                return response()->json(['success' => false, 'error' => 'Registro no encontrado'], 404);
            }
            return response()->json(['success' => true, $this->resourceKey => $item]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            if (!$this->authorizeAdmin($request)) {
                return response()->json(['success' => false, 'error' => 'Acceso no autorizado'], 401);
            }

            $validator = Validator::make($request->all(), $this->buildRules(true), $this->imageRules());
            if ($validator->fails()) {
                return response()->json(['success' => false, 'message' => 'Error de validación', 'errors' => $validator->errors()], 422);
            }

            // El campo de archivo (image) se captura aparte y se mapea a la columna BD (image_path).
            $fileField = $this->fileField();
            $dbField = $this->dbImageField();
            $dataFields = array_diff(array_keys($this->fields), [$fileField]);
            $data = $request->only($dataFields);
            $data['is_active'] = $request->boolean('is_active', true);
            $data['display_order'] = $request->display_order ?? 0;

            if ($request->hasFile($fileField)) {
                $imagePath = $this->uploadImage($request, $this->imageDir);
                if (!$imagePath) {
                    return response()->json(['success' => false, 'error' => 'Error al guardar la imagen'], 500);
                }
                $data[$dbField] = $imagePath;
            }

            $item = $this->modelClass::create($data);

            return response()->json(['success' => true, 'message' => 'Registro creado exitosamente', $this->resourceKey => $item], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            if (!$this->authorizeAdmin($request)) {
                return response()->json(['success' => false, 'error' => 'Acceso no autorizado'], 401);
            }

            $item = $this->modelClass::find($id);
            if (!$item) {
                return response()->json(['success' => false, 'error' => 'Registro no encontrado'], 404);
            }

            $updateData = [];
            foreach (array_keys($this->fields) as $field) {
                if ($field === 'is_active' || $field === 'display_order') {
                    continue;
                }
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

            $fileField = $this->fileField();
            $dbField = $this->dbImageField();
            if ($request->hasFile($fileField)) {
                $imageValidator = Validator::make($request->all(), [$fileField => 'image|mimes:jpeg,png,jpg,gif,webp'], $this->imageRules());
                if ($imageValidator->fails()) {
                    return response()->json(['success' => false, 'message' => 'Error de validación de imagen', 'errors' => $imageValidator->errors()], 422);
                }
                $imagePath = $this->uploadImage($request, $this->imageDir);
                if ($imagePath) {
                    if ($item->{$dbField} && file_exists(public_path($item->{$dbField}))) {
                        unlink(public_path($item->{$dbField}));
                    }
                    $updateData[$dbField] = $imagePath;
                } else {
                    return response()->json(['success' => false, 'error' => 'Error al guardar la imagen'], 500);
                }
            }

            if (empty($updateData)) {
                return response()->json(['success' => false, 'error' => 'No se proporcionaron datos para actualizar'], 400);
            }

            $item->update($updateData);
            return response()->json(['success' => true, 'message' => 'Registro actualizado exitosamente', $this->resourceKey => $item->fresh()]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            if (!$this->authorizeAdmin($request)) {
                return response()->json(['success' => false, 'error' => 'Acceso no autorizado'], 401);
            }

            $item = $this->modelClass::find($id);
            if (!$item) {
                return response()->json(['success' => false, 'error' => 'Registro no encontrado'], 404);
            }

            $dbField = $this->dbImageField();
            if ($item->{$dbField} && file_exists(public_path($item->{$dbField}))) {
                unlink(public_path($item->{$dbField}));
            }

            $item->delete();
            return response()->json(['success' => true, 'message' => 'Registro eliminado exitosamente']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function toggleStatus(Request $request, $id): JsonResponse
    {
        try {
            $item = $this->modelClass::find($id);
            if (!$item) {
                return response()->json(['success' => false, 'error' => 'Registro no encontrado'], 404);
            }
            $item->update(['is_active' => !$item->is_active]);
            return response()->json(['success' => true, 'message' => 'Estado cambiado exitosamente', $this->resourceKey => $item]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Reordenar en lote usando Display_order.
     * Espera: { "items": [ { "id": 1, "display_order": 0 }, ... ] }
     */
    public function reorder(Request $request): JsonResponse
    {
        try {
            if (!$this->authorizeAdmin($request)) {
                return response()->json(['success' => false, 'error' => 'Acceso no autorizado'], 401);
            }

            $validator = Validator::make($request->all(), [
                'items' => 'required|array',
                'items.*.id' => 'required|integer',
                'items.*.display_order' => 'required|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'message' => 'Error de validación', 'errors' => $validator->errors()], 422);
            }

            foreach ($request->items as $item) {
                $this->modelClass::where('id', $item['id'])
                    ->update(['display_order' => $item['display_order']]);
            }

            return response()->json(['success' => true, 'message' => 'Orden actualizado exitosamente']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Error: ' . $e->getMessage()], 500);
        }
    }
}
