# 🖼️ Iconos Requeridos para PWA

## 📋 Iconos Necesarios

Para que la PWA funcione correctamente, necesitas crear estos iconos:

### **Iconos Principales:**
```
icon-72x72.png     (72x72 píxeles)
icon-96x96.png     (96x96 píxeles)
icon-128x128.png   (128x128 píxeles)
icon-144x144.png   (144x144 píxeles)
icon-152x152.png   (152x152 píxeles)
icon-192x192.png   (192x192 píxeles)
icon-384x384.png   (384x384 píxeles)
icon-512x512.png   (512x512 píxeles)
```

### **Iconos de Accesos Directos:**
```
shortcut-nuevos-96x96.png      (96x96 píxeles)
shortcut-categorias-96x96.png  (96x96 píxeles)
shortcut-carrito-96x96.png     (96x96 píxeles)
```

## 🛠️ Cómo Crear los Iconos

### **Opción 1: Online (Recomendado)**
1. Ve a https://favicon.io/favicon-converter/
2. Sube tu logo o crea uno con el texto "Cherry"
3. Descarga todos los tamaños
4. Renombra los archivos según la lista anterior

### **Opción 2: Canva**
1. Crea un diseño cuadrado de 512x512px
2. Usa el emoji 🍒 o tu logo
3. Exporta en PNG
4. Usa una herramienta online para redimensionar

### **Opción 3: Photoshop/Illustrator**
1. Crea un icono de 512x512px
2. Exporta en los tamaños requeridos
3. Usa formato PNG con transparencia

## 🚀 **SOLUCIÓN RÁPIDA PARA TESTING**

### **Crear iconos temporales con CSS:**
Si quieres probar la PWA inmediatamente sin crear iconos, puedes crear archivos temporales:

1. **Crea un archivo HTML simple** con este contenido:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Icono Temporal</title>
    <style>
        body { margin: 0; padding: 0; }
        .icon {
            width: 512px;
            height: 512px;
            background: linear-gradient(135deg, #E91E63, #9C27B0);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 200px;
            color: white;
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>
    <div class="icon">🍒</div>
</body>
</html>
```

2. **Guarda como `icon-512x512.html`** y abre en el navegador
3. **Haz screenshot** o usa herramientas de captura para crear PNGs
4. **Redimensiona** usando herramientas online como:
   - https://www.iloveimg.com/resize-image
   - https://www.pixlr.com/

## ⚠️ IMPORTANTE

**Sin estos iconos, la PWA NO funcionará correctamente y el botón de instalar no aparecerá.**

## 🔍 Verificar

Una vez que tengas los iconos:
1. Recarga la página
2. Abre DevTools → Application → Manifest
3. Verifica que no haya errores
4. El botón de instalación debería aparecer automáticamente

## 🧪 Testing en PC

Ahora puedes probar la funcionalidad PWA desde tu PC:
- Verás un botón naranja "🧪 Probar Modal PWA" en la esquina superior derecha
- El modal aparecerá automáticamente después de 1 segundo
- Verás toda la información de debug en tiempo real
