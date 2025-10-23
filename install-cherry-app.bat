@echo off
echo ==========================================
echo     Cherry App - Instalador Automatico
echo ==========================================
echo.

:: Verificar si estamos en la carpeta correcta
if not exist "public\manifest.json" (
    echo ERROR: Este script debe ejecutarse desde la carpeta raiz del proyecto Cherry App
    echo Asegurate de estar en la carpeta que contiene las carpetas 'public', 'resources', etc.
    pause
    exit /b 1
)

echo [1/5] Verificando dependencias...
echo.

:: Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js encontrado

:: Verificar Composer
composer --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Composer no esta instalado
    echo Por favor instala Composer desde https://getcomposer.org/
    pause
    exit /b 1
)
echo ✓ Composer encontrado

:: Verificar PHP
php --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PHP no esta instalado
    echo Por favor instala PHP desde https://www.php.net/
    pause
    exit /b 1
)
echo ✓ PHP encontrado

echo.
echo [2/5] Instalando dependencias de PHP...
composer install --no-dev --optimize-autoloader
if errorlevel 1 (
    echo ERROR: Fallo la instalacion de dependencias PHP
    pause
    exit /b 1
)

echo.
echo [3/5] Instalando dependencias de Node.js...
npm install
if errorlevel 1 (
    echo ERROR: Fallo la instalacion de dependencias Node.js
    pause
    exit /b 1
)

echo.
echo [4/5] Construyendo aplicacion...
npm run build
if errorlevel 1 (
    echo ERROR: Fallo la construccion de la aplicacion
    pause
    exit /b 1
)

echo.
echo [5/5] Configurando base de datos...
if not exist ".env" (
    echo Copiando archivo de configuracion...
    copy ".env.example" ".env"
)

php artisan key:generate --ansi
php artisan migrate --force
php artisan db:seed --force

echo.
echo ==========================================
echo     ¡Cherry App instalada exitosamente!
echo ==========================================
echo.
echo Para iniciar la aplicacion:
echo   1. Ejecuta: php artisan serve
echo   2. Abre tu navegador en: http://localhost:8000
echo   3. ¡Disfruta de Cherry App!
echo.
echo Para crear accesos directos:
echo   - Ve a http://localhost:8000/instalar
echo   - Sigue las instrucciones en pantalla
echo.

:: Preguntar si quiere iniciar automaticamente
set /p start="¿Quieres iniciar Cherry App ahora? (s/n): "
if /i "%start%"=="s" (
    echo.
    echo Iniciando Cherry App...
    echo Abre tu navegador en: http://localhost:8000
    echo Presiona Ctrl+C para detener el servidor
    echo.
    php artisan serve
)

echo.
echo Gracias por usar Cherry App - Tu tienda de moda favorita!
pause



























