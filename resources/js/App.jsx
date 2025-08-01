import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './App.css';

// Pages
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import CatalogosPage from './pages/CatalogosPage';
import CatalogCollectionsPage from './pages/CatalogCollectionsPage';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CartDetailsPage from './pages/CartDetailsPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CarritoPage from './pages/CarritoPage';
import BuscarPage from './pages/BuscarPage';
import CategoriasPage from './pages/CategoriasPage';
import ContactoPage from './pages/ContactoPage';
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
import CustomToastContainer from './components/Toast/ToastContainer';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthInitializer>
          <SmartRedirect>
            <div className="App">
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/catalogo" element={<CatalogPage />} />
                  <Route path="/catalogos" element={<CatalogCollectionsPage />} />
                  <Route path="/producto/:productId" element={<ProductPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<RegisterPage />} />
                  <Route path="/carrito-detalle" element={<CartDetailsPage />} />
                  <Route path="/compra-exitosa" element={<CheckoutSuccessPage />} />
                  <Route path="/carrito" element={<CarritoPage />} />
                  <Route path="/buscar" element={<BuscarPage />} />
                  <Route path="/categorias" element={<CategoriasPage />} />
                  <Route path="/contacto" element={<ContactoPage />} />
                  <Route path="/afiliate" element={<AfiliatePage />} />
                  <Route path="/terminos" element={<TerminosPage />} />
                  <Route path="/privacidad" element={<PrivacidadPage />} />
                  <Route path="/cookies" element={<CookiesPage />} />
                  <Route path="/notificaciones" element={<NotificacionesPage />} />
                  <Route path="/explorar" element={<ExplorarPage />} />
                  <Route path="/promociones" element={<PromocionesPage />} />
                  <Route path="/destacados" element={<DestacadosPage />} />
                  <Route path="/nuevos" element={<NuevosPage />} />
                  <Route path="/productos" element={<ProductosPage />} />
                  <Route path="/destacados-ofertas" element={<DestacadosOfertasPage />} />
                  <Route path="/favoritos" element={<FavoritosPage />} />
                  <Route path="/admin" element={
                    <AdminRoute>
                      <AdminPanelPage />
                    </AdminRoute>
                  } />
                </Routes>
              </main>
              <CustomToastContainer />
            </div>
          </SmartRedirect>
        </AuthInitializer>
      </Router>
    </HelmetProvider>
  );
}

export default App;
