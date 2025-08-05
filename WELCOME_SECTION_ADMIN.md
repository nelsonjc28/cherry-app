# Módulo de Administración de Secciones de Bienvenida

## 📋 Descripción

Este módulo permite a los administradores gestionar completamente las secciones de bienvenida que se muestran en la página principal de la aplicación.

## 🎯 Funcionalidades

### ✅ Gestión Completa de Contenido
- **Título personalizable**: Define el mensaje principal de bienvenida
- **Subtítulo/Descripción**: Texto explicativo detallado
- **Botón personalizable**: Texto y URL del botón de acción
- **Imagen**: Subida y gestión de imágenes de fondo
- **Estado activo/inactivo**: Control de visibilidad
- **Orden de visualización**: Priorización de secciones

### 🎨 Interfaz de Usuario
- **Lista visual**: Muestra todas las secciones con preview
- **Formulario modal**: Creación y edición intuitiva
- **Preview de imagen**: Vista previa antes de guardar
- **Estados visuales**: Indicadores de activo/inactivo
- **Acciones rápidas**: Editar, activar/desactivar, eliminar

### 🔧 Funcionalidades Técnicas
- **Validación de datos**: Campos requeridos y formatos
- **Gestión de imágenes**: Subida, redimensionado y almacenamiento
- **API RESTful**: Endpoints completos para CRUD
- **Autenticación**: Solo administradores pueden acceder
- **Notificaciones**: Feedback visual con toasts

## 🚀 Cómo Usar

### 1. Acceso al Módulo
1. Inicia sesión como administrador
2. Ve al panel de administración
3. Selecciona "Secciones de Bienvenida" en el menú

### 2. Crear Nueva Sección
1. Haz clic en "+ Nueva Sección"
2. Completa el formulario:
   - **Título**: Mensaje principal (ej: "¡Bienvenida a la moda que te inspira!")
   - **Subtítulo**: Descripción detallada
   - **Texto del Botón**: Texto del botón (ej: "Explorar Colección")
   - **URL del Botón**: Enlace de destino (ej: "/catalogo")
   - **Imagen**: Sube una imagen de fondo
   - **Orden**: Número de prioridad (1 = más importante)
   - **Activa**: Marca para mostrar en el sitio
3. Haz clic en "Crear"

### 3. Editar Sección Existente
1. En la lista de secciones, haz clic en "Editar"
2. Modifica los campos necesarios
3. Haz clic en "Actualizar"

### 4. Gestionar Estados
- **Activar/Desactivar**: Cambia la visibilidad de la sección
- **Eliminar**: Borra permanentemente la sección
- **Reordenar**: Cambia el orden de visualización

## 📁 Estructura de Archivos

```
resources/js/components/AdminWelcomeSectionManager/
├── AdminWelcomeSectionManager.jsx    # Componente principal
└── AdminWelcomeSectionManager.css    # Estilos

app/Http/Controllers/Api/
├── AdminWelcomeSectionController.php  # Controlador admin
└── WelcomeSectionController.php       # Controlador público

app/Models/
└── WelcomeSection.php                # Modelo de datos

database/
├── migrations/
│   └── create_welcome_sections_table.php
└── seeders/
    └── WelcomeSectionSeeder.php

routes/
└── api.php                          # Rutas API
```

## 🔌 API Endpoints

### Administración (Requiere autenticación admin)
- `GET /api/admin/welcome-sections` - Listar todas
- `GET /api/admin/welcome-sections/{id}` - Obtener una
- `POST /api/admin/welcome-sections` - Crear nueva
- `POST /api/admin/welcome-sections/{id}` - Actualizar
- `DELETE /api/admin/welcome-sections/{id}` - Eliminar
- `PATCH /api/admin/welcome-sections/{id}/toggle` - Cambiar estado

### Público (Sin autenticación)
- `GET /api/welcome-sections/active` - Obtener sección activa
- `GET /api/welcome-sections` - Obtener todas las activas

## 🎨 Personalización

### Campos Disponibles
- `title`: Título de la sección
- `subtitle`: Descripción detallada
- `button_text`: Texto del botón
- `button_url`: URL de destino
- `image_path`: Ruta de la imagen
- `is_active`: Estado activo/inactivo
- `display_order`: Orden de visualización

### Ejemplo de Configuración
```json
{
  "title": "¡Bienvenida a la moda que te inspira!",
  "subtitle": "Explora nuestra colección única y actualizada que resalta tu estilo personal. Afíliate hoy y accede a ofertas exclusivas que no querrás perderte.",
  "button_text": "Explorar Colección",
  "button_url": "/catalogo",
  "image_path": "images/welcome-sections/default-welcome.jpg",
  "is_active": true,
  "display_order": 1
}
```

## 🔒 Seguridad

- **Autenticación requerida**: Solo usuarios autenticados
- **Autorización**: Solo administradores pueden gestionar
- **Validación**: Todos los campos son validados
- **Sanitización**: Datos limpios antes de guardar
- **CSRF Protection**: Protección contra ataques CSRF

## 📱 Responsive Design

El módulo es completamente responsive y funciona en:
- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1199px)
- ✅ Mobile (< 768px)

## 🎯 Integración Frontend

El componente `HeroBanner` automáticamente:
1. Obtiene la sección activa desde la API
2. Muestra el contenido configurado
3. Aplica la imagen de fondo
4. Configura el botón con la URL especificada
5. Fallback a contenido estático si no hay sección activa

## 🚨 Troubleshooting

### Problemas Comunes

1. **"No se muestra la imagen"**
   - Verifica que la imagen existe en `public/images/welcome-sections/`
   - Asegúrate de que el formato sea válido (jpg, png, gif)

2. **"No puedo acceder al módulo"**
   - Verifica que tu usuario tenga rol de administrador
   - Asegúrate de estar autenticado

3. **"Error al guardar"**
   - Verifica que todos los campos requeridos estén completos
   - Asegúrate de que la imagen no exceda 2MB

### Comandos Útiles

```bash
# Verificar datos existentes
php artisan tinker --execute="App\Models\WelcomeSection::all()"

# Ejecutar seeder
php artisan db:seed --class=WelcomeSectionSeeder

# Limpiar caché
php artisan cache:clear
```

## 📈 Próximas Mejoras

- [ ] Soporte para múltiples idiomas
- [ ] Editor de texto rico para subtítulos
- [ ] Galería de imágenes predefinidas
- [ ] Programación de fechas de activación
- [ ] Estadísticas de visualización
- [ ] A/B testing de secciones

---

**Desarrollado para Cherry Central** 🍒
*Módulo de administración de secciones de bienvenida* 