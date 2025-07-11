import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './App.css';

// Pages
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CartDetailsPage from './pages/CartDetailsPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';

// Components
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/carrito-detalle" element={<CartDetailsPage />} />
              <Route path="/compra-exitosa" element={<CheckoutSuccessPage />} />
              {/* Other routes will be added here */}
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  );
}

export default App;
