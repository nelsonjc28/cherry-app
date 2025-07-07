import { Helmet } from 'react-helmet-async';
import Footer from '../../components/Footer/Footer';
import LoginForm from '../../components/AuthForms/LoginForm';
import './LoginPage.css';
import '../../index.css';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../../store/userStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLoginSuccess = () => {
    navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Iniciar Sesión | Cherry Central</title>
      </Helmet>
      <main className="home-page centered-page">
        <section className="container form-section">
          <h1 className="section-title form-title">Iniciar Sesión</h1>
          <LoginForm onSuccess={handleLoginSuccess} />
          <div className="form-link-text">
            ¿No tienes cuenta? <a href="/registro">Regístrate</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default LoginPage; 