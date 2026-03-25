/**
 * Respond.io Website Chat — load after idle / window.load to reduce LCP impact.
 * Contact fields: https://help.respond.io/l/en/website-chat-widget/website-chat-widget
 */

function splitName(fullName) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

/**
 * Sync logged-in Cherry user to window.__respond_settings (required before / on widget init).
 * @param {object|null} user — shape from /api/me (id, name, email)
 */
export function syncRespondIoContact(user) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!user) {
    window.__respond_settings = {};
    return;
  }

  const email = (user.email || '').trim();
  const id = user.id != null ? String(user.id) : '';
  const identifier = email || id;
  if (!identifier) {
    window.__respond_settings = {};
    return;
  }

  const { firstName, lastName } = splitName(user.name);

  window.__respond_settings = {
    identifier,
    email: email || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    language: 'es',
  };
}

export function scheduleRespondIoWidgetLoad() {
  if (typeof document === 'undefined') {
    return;
  }

  const meta = document.querySelector('meta[name="respond-io-widget-src"]');
  if (!meta) {
    return;
  }

  const src = (meta.getAttribute('content') || '').trim();
  if (!src) {
    return;
  }

  const inject = () => {
    if (document.querySelector('script[data-cherry-respond-io]')) {
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.cherryRespondIo = '1';
    script.onerror = () => {
      console.error(
        '[Cherry Respond.io] No se pudo cargar el script:',
        src,
        '— Revisa la URL (copia el src del snippet del panel), el dominio en Website domains de Respond.io y la consola Red.',
      );
    };
    document.body.appendChild(script);
  };

  const runAfterLoad = () => {
    if (document.querySelector('script[data-cherry-respond-io]')) {
      return;
    }
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => inject(), { timeout: 5000 });
    } else {
      window.setTimeout(inject, 2000);
    }
  };

  if (document.readyState === 'complete') {
    runAfterLoad();
  } else {
    window.addEventListener('load', runAfterLoad, { once: true });
  }
}
