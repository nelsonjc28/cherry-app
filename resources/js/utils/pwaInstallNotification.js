/** Una sola notificación de éxito por instalación PWA (compartido con Blade / scripts públicos). */
export const APP_INSTALL_NOTIFIED_KEY = 'app_install_notified';

/**
 * @returns {boolean} true si esta llamada puede mostrar el mensaje (primera vez); false si ya se notificó.
 */
export function tryConsumeCherryPwaInstallSuccessNotification() {
  try {
    if (typeof localStorage === 'undefined') {
      return true;
    }
    if (localStorage.getItem(APP_INSTALL_NOTIFIED_KEY) === 'true') {
      return false;
    }
    localStorage.setItem(APP_INSTALL_NOTIFIED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}
