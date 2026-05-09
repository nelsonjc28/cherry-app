import { useEffect } from 'react';

/**
 * Respond.io Growth Tool: el snippet en body a veces corre antes de que la SPA esté lista y no pinta el launcher.
 * La URL viene de <meta name="respond-io-growth-src"> (app.blade.php).
 */
export default function RespondIoGrowthBootstrap() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="respond-io-growth-src"]');
    const src = meta?.getAttribute('content')?.trim();
    if (!src) {
      return undefined;
    }

    if (document.getElementById('respondio__growth_tool')) {
      return undefined;
    }

    const run = () => {
      if (document.getElementById('respondio__growth_tool')) {
        return;
      }
      const script = document.createElement('script');
      script.id = 'respondio__growth_tool';
      script.src = src;
      script.async = true;
      script.dataset.cherryRespondIoGrowth = '1';
      script.onerror = () => {
        console.error('[Cherry Respond.io Growth] No se pudo cargar:', src);
      };
      document.body.appendChild(script);
    };

    const schedule =
      typeof window.requestIdleCallback === 'function'
        ? () => window.requestIdleCallback(() => run(), { timeout: 5000 })
        : () => window.setTimeout(run, 300);

    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', () => schedule(), { once: true });
    }

    return undefined;
  }, []);

  return null;
}
