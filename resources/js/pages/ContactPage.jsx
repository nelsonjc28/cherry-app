import './ContactPage.css';
import { getIconPath } from '../utils/assetPaths';

const ContactPage = () => {
  return (
    <div className="container">
      <div className="contact-page">
        {/* Right column: Card */}
        <div className="contact-card-col">
          <div className="contact-card">
            <h1 className="contact-title">Contáctanos</h1>
            <div className="cherry-divider"></div>
            <p className="contact-description">
              Con gusto te atenderemos, forma parte de la familia <span className="cherry-highlight">Cherry</span>
            </p>
            <div className="contact-info-list">
              <div className="contact-info-item contact-info-address">
                <div className="round-icon-contact">
                  <img src={getIconPath('Map Marker.svg')} alt="location" className="map-icon-contact" loading="lazy" />
                </div>
                <div>
                  <span className="contact-info-title">Dirección</span>
                  <div className="contact-text-address">
                    <span className="contact-info-text">José María Izazaga 127 piso 2 Col.</span>
                    <span className="contact-info-text">Centros México D.F. C.P. 06080</span>
                  </div>
                </div>
              </div>
              <div className="contact-info-item contact-info-phone">
                <div className="round-icon-contact">
                  <img src={getIconPath('Map Phone.svg')} alt="phone" className="map-icon-contact" loading="lazy" />
                </div>
                <div>
                  <span className="contact-info-title">Llámanos</span>
                  <span className="contact-info-text">55-5542-4442</span>
                </div>
              </div>
              <div className="contact-info-item contact-info-email">
                <div className="round-icon-contact">
                  <img src={getIconPath('Map Email.svg')} alt="email" className="map-icon-contact" loading="lazy" />
                </div>
                <div>
                  <span className="contact-info-title">Vía email</span>
                  <span className="contact-info-text email">cherryonline@cherry.com.mx</span>
                </div>
              </div>
            </div>
            <div className="contact-map-wrapper">
              <iframe
                title="Cherry"
                src="https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d3830947.253725377!2d-99.1779212!3d20.3350315!3m2!1i1024!2i768!4f13.1!2m1!1scherry%20tienda%20mx%20direccion!5e0!3m2!1ses-419!2sve!4v1753274350284!5m2!1ses-419!2sve"
                width="100%"
                height="200"
                style={{ border: 0, borderRadius: '4px' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="cherry-divider"></div>
            <div className="contact-hours-section">
              <div className="contact-hours-card">
                <div className="contact-hours-title">
                  <img src={getIconPath('Clock.svg')} className="contact-hours-icon" alt="clock" loading="lazy" />
                  <span>Horario de atención en tienda</span> 
                </div>
                <ul className="contact-hours-list">
                  <li><span>Lunes</span><span>9:30 am – 7:00 pm</span></li>
                  <li><span>Martes</span><span>9:30 am – 7:00 pm</span></li>
                  <li><span>Miércoles</span><span>9:30 am – 7:00 pm</span></li>
                  <li><span>Jueves</span><span>9:30 am – 7:00 pm</span></li>
                  <li><span>Viernes</span><span>9:30 am – 5:00 pm</span></li>
                  <li className="closed-text"><span>Sábado</span><span className="closed">Cerrado</span></li>
                  <li className="closed-text"><span>Domingo</span><span className="closed">Cerrado</span></li>
                </ul>
              </div>
              <div className="contact-hours-card">
                <div className="contact-hours-title">
                  <img src={getIconPath('Clock.svg')} className="contact-hours-icon" alt="clock" loading="lazy" />
                  <span>Horario de atención en línea</span>
                </div>
                <ul className="contact-hours-list">
                  <li><span>Lunes</span><span>9:30 am – 7:00 pm</span></li>
                  <li><span>Martes</span><span>9:30 am – 7:00 pm</span></li>
                  <li><span>Miércoles</span><span>9:30 am – 7:00 pm</span></li>
                  <li><span>Jueves</span><span>9:30 am – 7:00 pm</span></li>
                  <li><span>Viernes</span><span>9:30 am – 5:00 pm</span></li>
                  <li><span>Sábado</span><span className="closed">Cerrado</span></li>
                  <li><span>Domingo</span><span className="closed">Cerrado</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {/* Left column: Image */}
        <div className="contact-image-col">
          <img
            src="/images/ContactPage/contact-girl.png"
            alt="Modelo Cherry"
            className="contact-model-image"
            draggable="false"
          />
          <img src="/images/ContactPage/small-ellipse.png" alt="Small Ellipse" className="small-ellipse-image"/>
          <img src="/images/ContactPage/large-ellipse.png" alt="Small Ellipse" className="large-ellipse-image"/>
        </div>
      </div>
    </div>
  );
};

export default ContactPage; 