import { Helmet } from 'react-helmet-async';
import Footer from '../../components/Footer/Footer';
import RegisterForm from '../../components/AuthForms/RegisterForm';
import './LoginPage.css';
import '../../index.css';

const RegisterPage = () => {
  return (
    <>
      <Helmet>
        <title>Registro | Cherry Central</title>
      </Helmet>
      <main className="home-page centered-page">
        <section className="container form-section">
          <h1 className="section-title form-title">Crear Cuenta</h1>
          <RegisterForm />
          <div className="form-link-text">
            ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default RegisterPage; 