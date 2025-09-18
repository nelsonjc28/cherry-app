import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PWAInstallToast from './components/PWAInstaller/PWAInstallToast';
import PWAInstallAlerts from './components/PWAInstaller/PWAInstallAlerts';
import PWADiagnostics from './components/PWAInstaller/PWADiagnostics';
import './App.css';

// Contexts
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ExternalApiProvider } from './contexts/ExternalApiContext';

// Pages
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import CatalogosPage from './pages/CatalogosPage';
import CatalogCollectionsPage from './pages/CatalogCollectionsPage';
import CatalogPdfPage from './pages/CatalogPdfPage';
import CatalogProductsPage from './pages/CatalogProductsPage';
import CategoryProductsPage from './pages/CategoryProductsPage';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfileLayout from './pages/profile/ProfileLayout';
import PersonalData from './pages/profile/PersonalData';
import MyOrders from './pages/profile/MyOrders';
import Favorites from './pages/profile/Favorites';
import Addresses from './pages/profile/Addresses';
import PaymentMethods from './pages/profile/PaymentMethods';
import PrivacySecurity from './pages/profile/PrivacySecurity';
import CartDetailsPage from './pages/CartDetailsPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CarritoPage from './pages/CarritoPage';
import BuscarPage from './pages/BuscarPage';
import CategoriasPage from './pages/CategoriasPage';

import ContactPage from './pages/ContactPage';
import AfiliatePage from './pages/AfiliatePage';
import TerminosPage from './pages/TerminosPage';
import PrivacidadPage from './pages/PrivacidadPage';
import CookiesPage from './pages/CookiesPage';
import NotificacionesPage from './pages/NotificacionesPage';
import ExplorarPage from './pages/ExplorarPage';
import PromocionesPage from './pages/PromocionesPage';
import DestacadosPage from './pages/DestacadosPage';
import NuevosPage from './pages/NuevosPage';

import ProductosPage from './pages/ProductosPage';
import DestacadosOfertasPage from './pages/DestacadosOfertasPage';
import FavoritosPage from './pages/FavoritosPage';
import AdminPanelPage from './pages/AdminPanelPage';

// Components
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import AdminRoute from './components/AdminRoute';
import AuthInitializer from './components/AuthInitializer';
import SmartRedirect from './components/SmartRedirect';
import RootRouteGuard from './components/RootRouteGuard';
import ForceHomePage from './components/ForceHomePage';
import DebugRouter from './components/DebugRouter';
import SimpleApp from './components/SimpleApp';
import CustomToastContainer from './components/Toast/ToastContainer';

function App() {
  // Usar la versión simplificada que garantiza que siempre se cargue HomePage
  return <SimpleApp />;
}

export default App;
