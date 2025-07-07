import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './App.css';

// Pages
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import AfiliatePage from './pages/AfiliatePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotificacionesPage from './pages/NotificacionesPage';
import CarritoPage from './pages/CarritoPage';
import NuevosPage from './pages/NuevosPage';
import DestacadosPage from './pages/DestacadosPage';
import CategoriasPage from './pages/CategoriasPage';
import PromocionesPage from './pages/PromocionesPage';
import ContactoPage from './pages/ContactoPage';
import PrivacidadPage from './pages/PrivacidadPage';
import TerminosPage from './pages/TerminosPage';
import CookiesPage from './pages/CookiesPage';
import ExplorarPage from './pages/ExplorarPage';
import DestacadosOfertasPage from './pages/DestacadosOfertasPage';
import ProductosPage from './pages/ProductosPage';

// Components
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

function NotFoundPage() {
  return <div style={{ padding: 40, textAlign: 'center' }}><h2>Página no encontrada</h2></div>;
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="app-container">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalogo" element={<CatalogPage />} />
              <Route path="/producto/:productId" element={<ProductPage />} />
              <Route path="/afiliate" element={<AfiliatePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/notificaciones" element={<NotificacionesPage />} />
              <Route path="/carrito" element={<CarritoPage />} />
              <Route path="/nuevos" element={<NuevosPage />} />
              <Route path="/destacados" element={<DestacadosPage />} />
              <Route path="/categorias" element={<CategoriasPage />} />
              <Route path="/promociones" element={<PromocionesPage />} />
              <Route path="/contacto" element={<ContactoPage />} />
              <Route path="/privacidad" element={<PrivacidadPage />} />
              <Route path="/terminos" element={<TerminosPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              <Route path="/explorar" element={<ExplorarPage />} />
              <Route path="/destacados/ofertas" element={<DestacadosOfertasPage />} />
              <Route path="/productos" element={<ProductosPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;
