import { useEffect } from 'react';
import useUserStore from '../store/userStore';
import { scheduleRespondIoWidgetLoad, syncRespondIoContact } from '../utils/respondIo';

/**
 * Keeps window.__respond_settings in sync with Zustand auth and defers widget script load.
 */
export default function RespondIoBootstrap() {
  useEffect(() => {
    if (!document.querySelector('meta[name="respond-io-widget-src"]')) {
      return undefined;
    }

    if (document.querySelector('meta[name="respond-io-needs-config"]')) {
      // Sin URL no se carga script: placeholder en .env o falta RESPOND_IO_WIDGET_SCRIPT_URL
      console.warn(
        '[Cherry Respond.io] Widget desactivado hasta configurar .env: pon RESPOND_IO_CHANNEL_ID con el ID real (Settings → Channels → Website Chat → código) o RESPOND_IO_WIDGET_SCRIPT_URL con el src exacto del <script>. Luego ejecuta: php artisan config:clear',
      );
    }

    syncRespondIoContact(useUserStore.getState().user);

    const unsubscribe = useUserStore.subscribe((state) => {
      syncRespondIoContact(state.user);
    });

    scheduleRespondIoWidgetLoad();

    return () => unsubscribe();
  }, []);

  return null;
}
