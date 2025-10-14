import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './styles/calendar-override.css'
import App from './App.jsx'
import './utils/calendarStyles.js'

// Importar CSS de componentes críticos para asegurar que se incluyan en el build
import './components/UserNotifications/UserNotifications.css'
import './components/AdminNotifications/AdminNotifications.css'
import './components/UserMultiSelect/UserMultiSelect.css'
import './components/ProductMultiSelect/ProductMultiSelect.css'
import './components/AdminCatalogManager/CatalogOffersModule.css'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // No refetch on window focus by default
      retry: 1, // Only retry failed queries once
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {

      })
      .catch((error) => {

      });
  });
}
