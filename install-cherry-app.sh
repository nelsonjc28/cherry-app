#!/bin/bash

echo "=========================================="
echo "    Cherry App - Instalador Automático"
echo "=========================================="
echo

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar errores
show_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

# Función para mostrar éxito
show_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Función para mostrar info
show_info() {
    echo -e "${YELLOW}$1${NC}"
}

# Verificar si estamos en la carpeta correcta
if [ ! -f "public/manifest.json" ]; then
    show_error "Este script debe ejecutarse desde la carpeta raíz del proyecto Cherry App"
    echo "Asegúrate de estar en la carpeta que contiene las carpetas 'public', 'resources', etc."
    exit 1
fi

echo "[1/5] Verificando dependencias..."
echo

# Verificar Node.js
if ! command -v node &> /dev/null; then
    show_error "Node.js no está instalado"
    echo "Por favor instala Node.js desde https://nodejs.org/"
    exit 1
fi
show_success "Node.js encontrado ($(node --version))"

# Verificar npm
if ! command -v npm &> /dev/null; then
    show_error "npm no está instalado"
    echo "npm generalmente viene con Node.js"
    exit 1
fi
show_success "npm encontrado ($(npm --version))"

# Verificar Composer
if ! command -v composer &> /dev/null; then
    show_error "Composer no está instalado"
    echo "Por favor instala Composer desde https://getcomposer.org/"
    exit 1
fi
show_success "Composer encontrado"

# Verificar PHP
if ! command -v php &> /dev/null; then
    show_error "PHP no está instalado"
    echo "Por favor instala PHP desde https://www.php.net/"
    exit 1
fi
show_success "PHP encontrado ($(php --version | head -n 1))"

echo
echo "[2/5] Instalando dependencias de PHP..."
if ! composer install --no-dev --optimize-autoloader; then
    show_error "Falló la instalación de dependencias PHP"
    exit 1
fi
show_success "Dependencias PHP instaladas"

echo
echo "[3/5] Instalando dependencias de Node.js..."
if ! npm install; then
    show_error "Falló la instalación de dependencias Node.js"
    exit 1
fi
show_success "Dependencias Node.js instaladas"

echo
echo "[4/5] Construyendo aplicación..."
if ! npm run build; then
    show_error "Falló la construcción de la aplicación"
    exit 1
fi
show_success "Aplicación construida exitosamente"

echo
echo "[5/5] Configurando base de datos..."

# Copiar archivo de configuración si no existe
if [ ! -f ".env" ]; then
    show_info "Copiando archivo de configuración..."
    cp ".env.example" ".env"
fi

# Generar clave de aplicación
php artisan key:generate --ansi

# Ejecutar migraciones
if ! php artisan migrate --force; then
    show_error "Falló la migración de la base de datos"
    echo "Verifica la configuración de la base de datos en el archivo .env"
    exit 1
fi

# Ejecutar seeders
if ! php artisan db:seed --force; then
    show_error "Falló la carga de datos iniciales"
    echo "La aplicación funcionará, pero sin datos de ejemplo"
fi

echo
echo "=========================================="
echo "   ¡Cherry App instalada exitosamente!"
echo "=========================================="
echo
show_success "Instalación completada"
echo
echo "Para iniciar la aplicación:"
echo "  1. Ejecuta: php artisan serve"
echo "  2. Abre tu navegador en: http://localhost:8000"
echo "  3. ¡Disfruta de Cherry App!"
echo
echo "Para crear accesos directos:"
echo "  - Ve a http://localhost:8000/instalar"
echo "  - Sigue las instrucciones en pantalla"
echo

# Preguntar si quiere iniciar automáticamente
read -p "¿Quieres iniciar Cherry App ahora? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo
    show_info "Iniciando Cherry App..."
    echo "Abre tu navegador en: http://localhost:8000"
    echo "Presiona Ctrl+C para detener el servidor"
    echo
    php artisan serve
fi

echo
echo "¡Gracias por usar Cherry App - Tu tienda de moda favorita!"

































