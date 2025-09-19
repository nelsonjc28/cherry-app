import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { ExternalApiProvider } from '../contexts/ExternalApiContext';

// Pages
import HomePage from '../pages/HomePage';
import CatalogPage from '../pages/CatalogPage';
import CatalogProductsPage from '../pages/CatalogProductsPage';
import CatalogCollectionsPage from '../pages/CatalogCollectionsPage';
import CategoryProductsPage from '../pages/CategoryProductsPage';
import CatalogPdfPage from '../pages/CatalogPdfPage';
import ProductPage from '../pages/ProductPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import CartDetailsPage from '../pages/CartDetailsPage';
import CheckoutSuccessPage from '../pages/CheckoutSuccessPage';
import CarritoPage from '../pages/CarritoPage';
import BuscarPage from '../pages/BuscarPage';
import CategoriasPage from '../pages/CategoriasPage';
import ContactPage from '../pages/ContactPage';
import AfiliatePage from '../pages/AfiliatePage';
import TerminosPage from '../pages/TerminosPage';
import PrivacidadPage from '../pages/PrivacidadPage';
import CookiesPage from '../pages/CookiesPage';
import NotificacionesPage from '../pages/NotificacionesPage';
import ExplorarPage from '../pages/ExplorarPage';
import PromocionesPage from '../pages/PromocionesPage';
import DestacadosPage from '../pages/DestacadosPage';
import NuevosPage from '../pages/NuevosPage';
import ProductosPage from '../pages/ProductosPage';
import DestacadosOfertasPage from '../pages/DestacadosOfertasPage';
import FavoritosPage from '../pages/FavoritosPage';
import AdminPanelPage from '../pages/AdminPanelPage';

// Profile pages
import ProfileLayout from '../pages/profile/ProfileLayout';
import PersonalData from '../pages/profile/PersonalData';
import MyOrders from '../pages/profile/MyOrders';
import Favorites from '../pages/profile/Favorites';
import Addresses from '../pages/profile/Addresses';
import PaymentMethods from '../pages/profile/PaymentMethods';
import PrivacySecurity from '../pages/profile/PrivacySecurity';

// Components
import Header from './Header/Header';
import Footer from './Footer/Footer';
import AdminRoute from './AdminRoute';
import CustomToastContainer from './Toast/ToastContainer';

// PWA Components
import PWAInstallToast from './PWAInstaller/PWAInstallToast';
import PWAInstallAlerts from './PWAInstaller/PWAInstallAlerts';
import PWADiagnostics from './PWAInstaller/PWADiagnostics';

const SimpleApp = () => {
  return (
    <HelmetProvider>
      <FavoritesProvider>
        <Router>
          <ExternalApiProvider>
            <div className="App app-container">
              <Header />
              <main>
                <Routes>
                  {/* Root route - ALWAYS loads HomePage */}
                  <Route path="/" element={<HomePage />} />
                  
                  {/* Public routes */}
                  <Route path="/catalogo" element={<CatalogPage />} />
                  <Route path="/catalogo/:id" element={<CatalogProductsPage />} />
                  <Route path="/catalogos" element={<CatalogCollectionsPage />} />
                  <Route path="/categoria/:slug" element={<CategoryProductsPage />} />
                  <Route path="/catalogo-pdf" element={<CatalogPdfPage />} />
                  <Route path="/producto/:productId" element={<ProductPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<RegisterPage />} />
                  
                  {/* Profile Routes */}
                  <Route path="/perfil" element={<ProfileLayout />}>
                    <Route index element={<PersonalData />} />
                    <Route path="datos-personales" element={<PersonalData />} />
                    <Route path="mis-pedidos" element={<MyOrders />} />
                    <Route path="favoritos" element={<Favorites />} />
                    <Route path="direcciones" element={<Addresses />} />
                    <Route path="metodos-pago" element={<PaymentMethods />} />
                    <Route path="privacidad-seguridad" element={<PrivacySecurity />} />
                  </Route>
                  
                  {/* Shopping routes */}
                  <Route path="/carrito-detalle" element={<CartDetailsPage />} />
                  <Route path="/compra-exitosa" element={<CheckoutSuccessPage />} />
                  <Route path="/carrito" element={<CarritoPage />} />
                  <Route path="/buscar" element={<BuscarPage />} />
                  <Route path="/categorias" element={<CategoriasPage />} />
                  
                  {/* Information pages */}
                  <Route path="/contacto" element={<ContactPage />} />
                  <Route path="/afiliate" element={<AfiliatePage />} />
                  <Route path="/terminos" element={<TerminosPage />} />
                  <Route path="/privacidad" element={<PrivacidadPage />} />
                  <Route path="/cookies" element={<CookiesPage />} />
                  <Route path="/notificaciones" element={<NotificacionesPage />} />
                  
                  {/* Product pages */}
                  <Route path="/explorar" element={<ExplorarPage />} />
                  <Route path="/promociones" element={<PromocionesPage />} />
                  <Route path="/destacados" element={<DestacadosPage />} />
                  <Route path="/nuevos" element={<NuevosPage />} />
                  <Route path="/productos" element={<ProductosPage />} />
                  <Route path="/destacados-ofertas" element={<DestacadosOfertasPage />} />
                  <Route path="/favoritos" element={<FavoritosPage />} />
                  
                  {/* Admin routes */}
                  <Route path="/admin/*" element={
                    <AdminRoute>
                      <AdminPanelPage />
                    </AdminRoute>
                  } />
                  
                  {/* Catch-all route - redirect to home for any unmatched routes */}
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </main>
              <Footer />
              <CustomToastContainer />
              
              {/* PWA Install Components */}
              <PWAInstallToast />
              <PWAInstallAlerts />
              <PWADiagnostics />
            </div>
          </ExternalApiProvider>
        </Router>
      </FavoritesProvider>
    </HelmetProvider>
  );
};

export default SimpleApp;
