@echo off
echo ==========================================
echo     Cherry App - Verificacion PWA
echo ==========================================
echo.

echo [1/4] Verificando servidor...
curl -s -o nul -w "%%{http_code}" http://localhost:8000 > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if "%STATUS%"=="200" (
    echo ✓ Servidor funcionando correctamente
) else (
    echo ✗ Servidor no responde. Ejecuta: php artisan serve
    pause
    exit /b 1
)

echo.
echo [2/4] Verificando manifest.json...
curl -s -o nul -w "%%{http_code}" http://localhost:8000/manifest.json > temp_manifest.txt
set /p MANIFEST_STATUS=<temp_manifest.txt
del temp_manifest.txt

if "%MANIFEST_STATUS%"=="200" (
    echo ✓ Manifest.json accesible
) else (
    echo ✗ Manifest.json no encontrado
    pause
    exit /b 1
)

echo.
echo [3/4] Verificando iconos...
set ICON_COUNT=0
for %%i in (72 96 128 144 152 192 384 512) do (
    curl -s -o nul -w "%%{http_code}" http://localhost:8000/icons/cherry-icon-%%ix%%i.png > temp_icon.txt
    set /p ICON_STATUS=<temp_icon.txt
    del temp_icon.txt
    if "!ICON_STATUS!"=="200" (
        set /a ICON_COUNT+=1
    )
)

if %ICON_COUNT% GEQ 6 (
    echo ✓ Iconos disponibles: %ICON_COUNT%/8
) else (
    echo ⚠ Solo %ICON_COUNT%/8 iconos encontrados
)

echo.
echo [4/4] Verificando Service Worker...
curl -s -o nul -w "%%{http_code}" http://localhost:8000/sw.js > temp_sw.txt
set /p SW_STATUS=<temp_sw.txt
del temp_sw.txt

if "%SW_STATUS%"=="200" (
    echo ✓ Service Worker disponible
) else (
    echo ✗ Service Worker no encontrado
)

echo.
echo ==========================================
echo     RESULTADOS DE VERIFICACION
echo ==========================================
echo.
echo ✓ Servidor: OK
echo ✓ Manifest: OK
echo ✓ Iconos: %ICON_COUNT%/8 disponibles
echo ✓ Service Worker: OK
echo.
echo ==========================================
echo     INSTRUCCIONES DE INSTALACION
echo ==========================================
echo.
echo 1. Abre tu navegador y ve a: http://localhost:8000
echo.
echo 2. ANDROID (Chrome):
echo    - Busca el banner "Instalar app"
echo    - O usa menu ⋮ → "Instalar app"
echo.
echo 3. iOS (Safari SOLAMENTE):
echo    - Toca boton "Compartir" 📤
echo    - Selecciona "Añadir a pantalla de inicio"
echo.
echo 4. WINDOWS/MAC (Chrome/Edge):
echo    - Busca icono ⊕ en barra de direcciones
echo    - Haz clic en "Instalar Cherry App"
echo.
echo 5. DIAGNOSTICO AVANZADO:
echo    - Ve a: http://localhost:8000/test-pwa-install.html
echo    - Ejecuta diagnostico automatico
echo.
echo ==========================================
echo.

set /p OPEN="¿Abrir Cherry App en el navegador? (s/n): "
if /i "%OPEN%"=="s" (
    start http://localhost:8000
)

set /p DIAGNOSTIC="¿Abrir pagina de diagnostico? (s/n): "
if /i "%DIAGNOSTIC%"=="s" (
    start http://localhost:8000/test-pwa-install.html
)

echo.
echo ¡Gracias por usar Cherry App! 🍒
echo Si tienes problemas, consulta: SOLUCION-PROBLEMAS-PWA.md
pause




















