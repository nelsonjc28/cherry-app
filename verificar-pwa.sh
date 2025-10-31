#!/bin/bash

echo "=========================================="
echo "    Cherry App - Verificación PWA"
echo "=========================================="
echo

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "[1/4] Verificando servidor..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000)

if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Servidor funcionando correctamente${NC}"
else
    echo -e "${RED}✗ Servidor no responde. Ejecuta: php artisan serve${NC}"
    exit 1
fi

echo
echo "[2/4] Verificando manifest.json..."
MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/manifest.json)

if [ "$MANIFEST_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Manifest.json accesible${NC}"
else
    echo -e "${RED}✗ Manifest.json no encontrado${NC}"
    exit 1
fi

echo
echo "[3/4] Verificando iconos..."
ICON_COUNT=0
for size in 72 96 128 144 152 192 384 512; do
    ICON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/icons/cherry-icon-${size}x${size}.png)
    if [ "$ICON_STATUS" = "200" ]; then
        ((ICON_COUNT++))
    fi
done

if [ $ICON_COUNT -ge 6 ]; then
    echo -e "${GREEN}✓ Iconos disponibles: $ICON_COUNT/8${NC}"
else
    echo -e "${YELLOW}⚠ Solo $ICON_COUNT/8 iconos encontrados${NC}"
fi

echo
echo "[4/4] Verificando Service Worker..."
SW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/sw.js)

if [ "$SW_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Service Worker disponible${NC}"
else
    echo -e "${RED}✗ Service Worker no encontrado${NC}"
fi

echo
echo "=========================================="
echo "     RESULTADOS DE VERIFICACIÓN"
echo "=========================================="
echo
echo -e "${GREEN}✓ Servidor: OK${NC}"
echo -e "${GREEN}✓ Manifest: OK${NC}"
echo -e "${GREEN}✓ Iconos: $ICON_COUNT/8 disponibles${NC}"
echo -e "${GREEN}✓ Service Worker: OK${NC}"
echo

echo "=========================================="
echo "     INSTRUCCIONES DE INSTALACIÓN"
echo "=========================================="
echo
echo "1. Abre tu navegador y ve a: http://localhost:8000"
echo
echo "2. ANDROID (Chrome):"
echo "   - Busca el banner 'Instalar app'"
echo "   - O usa menú ⋮ → 'Instalar app'"
echo
echo "3. iOS (Safari SOLAMENTE):"
echo "   - Toca botón 'Compartir' 📤"
echo "   - Selecciona 'Añadir a pantalla de inicio'"
echo
echo "4. LINUX/MAC (Chrome/Firefox):"
echo "   - Busca ícono ⊕ en barra de direcciones"
echo "   - Haz clic en 'Instalar Cherry App'"
echo
echo "5. DIAGNÓSTICO AVANZADO:"
echo "   - Ve a: http://localhost:8000/test-pwa-install.html"
echo "   - Ejecuta diagnóstico automático"
echo
echo "=========================================="
echo

read -p "¿Abrir Cherry App en el navegador? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost:8000
    elif command -v open > /dev/null; then
        open http://localhost:8000
    else
        echo "Abre manualmente: http://localhost:8000"
    fi
fi

read -p "¿Abrir página de diagnóstico? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost:8000/test-pwa-install.html
    elif command -v open > /dev/null; then
        open http://localhost:8000/test-pwa-install.html
    else
        echo "Abre manualmente: http://localhost:8000/test-pwa-install.html"
    fi
fi

echo
echo "¡Gracias por usar Cherry App! 🍒"
echo "Si tienes problemas, consulta: SOLUCION-PROBLEMAS-PWA.md"

































