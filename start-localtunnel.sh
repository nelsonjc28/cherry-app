#!/bin/bash

# Script para iniciar localtunnel y crear túnel HTTPS para desarrollo local
# Uso: ./start-localtunnel.sh

echo "🚀 Iniciando localtunnel para crear túnel HTTPS..."
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Mantén esta terminal abierta mientras desarrollas"
echo "   2. Copia la URL HTTPS que localtunnel te dará (ejemplo: https://abc123.loca.lt)"
echo "   3. Accede a tu aplicación usando esa URL HTTPS (NO uses localhost)"
echo "   4. El backend seguirá corriendo en localhost:8000"
echo ""
echo "Presiona Ctrl+C para detener localtunnel cuando termines"
echo ""

lt --port 8000



