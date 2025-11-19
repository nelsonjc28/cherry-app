const CACHE_NAME = 'cherry-app-v1.3.0';
const STATIC_CACHE = 'cherry-static-v1.3.0';
const DYNAMIC_CACHE = 'cherry-dynamic-v1.3.0';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/images/logo.svg'
];

// URLs críticas que siempre deben estar disponibles offline
const CRITICAL_URLS = [
  '/',
  '/categorias',
  '/carrito-detalle',
  '/perfil',
  '/offline.html'
];

// Patrones de URLs que deben ser cacheadas dinámicamente
const CACHE_PATTERNS = [
  /\/catalogs\/.+\.(jpg|jpeg|png|webp)$/,
  /\/images\/.+\.(jpg|jpeg|png|webp|svg)$/,
  /\/icons\/.+\.(png|svg)$/,
  /\/build\/assets\/.+\.(css|js)$/
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  
  event.waitUntil(
    Promise.all([
      // Cache estático
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(urlsToCache);
      }),
      // Pre-cache URLs críticas
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return Promise.all(
          CRITICAL_URLS.map(url => 
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(error => {})
          )
        );
      })
    ])
      .then(() => {
      // Notificar instalación exitosa
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_INSTALLED',
            message: 'Cherry App lista para usar offline',
            version: CACHE_NAME
          });
        });
      });
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch((error) => {
      // Notificar error al cliente
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'TOAST',
            message: 'Error al preparar la app para uso offline',
              toastType: 'error',
              duration: 5000
            });
          });
        });
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
            // Mantener solo los caches de la versión actual
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
      }),
      // Tomar control inmediato de todos los clientes
      self.clients.claim()
    ])
    .then(() => {
      
      // Notificar al cliente que el SW está activo
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            message: 'Cherry App actualizada y optimizada',
            toastType: 'success',
            duration: 3000,
            version: CACHE_NAME
          });
        });
      });
      
      // Verificar y actualizar cache crítico en segundo plano
      updateCriticalCache();
    })
    .catch(error => {
    })
  );
});

// Función para actualizar cache crítico en segundo plano
async function updateCriticalCache() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const updatePromises = CRITICAL_URLS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
      }
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
  }
}

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Estrategia para peticiones de API
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Estrategia para recursos estáticos (imágenes, CSS, JS)
  if (shouldCacheResource(event.request.url)) {
    event.respondWith(handleStaticResource(event.request));
    return;
  }

  // Estrategia para páginas HTML
  if (event.request.destination === 'document') {
    event.respondWith(handlePageRequest(event.request));
    return;
  }

  // Para todo lo demás, intentar red primero
    event.respondWith(
      fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Manejar peticiones de API
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Si falla la API, devolver respuesta de error offline
        return new Response(JSON.stringify({
          success: false,
      message: 'Sin conexión a internet. Verifica tu conexión e intenta nuevamente.',
      offline: true
        }), {
          status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Manejar recursos estáticos (Cache First)
async function handleStaticResource(request) {
  try {
    // Buscar en cache primero
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Si no está en cache, obtener de la red
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Determinar qué cache usar
      const cacheName = shouldUseStaticCache(request.url) ? STATIC_CACHE : DYNAMIC_CACHE;
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si falla todo, intentar buscar en cualquier cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si es una imagen, devolver una imagen placeholder
    if (request.destination === 'image') {
      return caches.match('/images/placeholder-catalog.png');
    }
    
    throw error;
  }
}

// Manejar páginas HTML (Network First con Cache Fallback)
async function handlePageRequest(request) {
  try {
    // Intentar red primero para contenido fresco
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cachear la respuesta
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Si falla la red, buscar en cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no hay cache y es la página principal, devolver página offline
    if (request.url.endsWith('/') || request.url.includes('index')) {
              return caches.match('/offline.html');
            }
    
    // Para otras páginas, intentar devolver la página principal desde cache
    const mainPage = await caches.match('/');
    if (mainPage) {
      return mainPage;
    }
    
    // Último recurso: página offline
    return caches.match('/offline.html');
  }
}

// Verificar si un recurso debe ser cacheado
function shouldCacheResource(url) {
  return CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// Verificar si debe usar cache estático o dinámico
function shouldUseStaticCache(url) {
  return url.includes('/build/') || url.includes('/icons/') || url.includes('manifest.json');
}

// Manejar mensajes del service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    
    // Notificar al cliente que se está actualizando
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'TOAST',
          message: 'Actualizando Cherry App...',
          toastType: 'info',
          duration: 2000
        });
      });
    });
  }
});

// Manejar notificaciones push (para futuras funcionalidades)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Cherry',
    icon: '/icons/icon-144x144.png',
    badge: '/icons/icon-144x144.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver más',
        icon: '/icons/icon-144x144.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/icon-144x144.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Cherry App', options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Manejar mensajes del service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    
    // Notificar al cliente que se está actualizando
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'TOAST',
          message: 'Actualizando Cherry App...',
          toastType: 'info',
          duration: 2000
        });
      });
    });
  }
});

// Manejar notificaciones push (para futuras funcionalidades)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Cherry',
    icon: '/icons/icon-144x144.png',
    badge: '/icons/icon-144x144.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver más',
        icon: '/icons/icon-144x144.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/icon-144x144.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Cherry App', options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
