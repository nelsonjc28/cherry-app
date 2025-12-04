#!/bin/bash

# Script para iniciar ngrok y crear túnel HTTPS para desarrollo local
# Uso: ./start-ngrok.sh

echo "🚀 Iniciando ngrok para crear túnel HTTPS..."
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Mantén esta terminal abierta mientras desarrollas"
echo "   2. Copia la URL HTTPS que ngrok te dará (ejemplo: https://abc123.ngrok.io)"
echo "   3. Accede a tu aplicación usando esa URL HTTPS (NO uses localhost)"
echo "   4. El backend seguirá corriendo en localhost:8000"
echo ""
echo "Presiona Ctrl+C para detener ngrok cuando termines"
echo ""

./ngrok http 8000



