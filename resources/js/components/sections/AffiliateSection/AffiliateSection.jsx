import './AffiliateSection.css';
import { Link } from 'react-router-dom';
import { getHeroIconPath } from '../../../utils/assetPaths';

const AffiliateSection = () => {
  return (
    <>
      <div className="affiliate-section__image">
        <img src={`${window.location.origin}/images/AffiliateSection/affiliate-girl.png`} alt="Affiliate Girl" />

          <div className="flotantGlobes">
            <div className="bigGlobe"></div>
            <div className="smallGlobe"></div>
          </div>
      </div>

      <div className="affiliate-section__content">
        <div className="affiliate-section__logo">
          <img src={`${window.location.origin}/images/logo.svg`} alt="Cherry" width={175}/>
        </div>
        <h2 id="affiliate-heading" className="affiliateTitle">
          ¡Afíliate ahora mismo y comienza tu propio negocio!
        </h2>
        <Link 
          to="/registro" 
          className="btn-explore"
          title="Únete a nuestro programa de afiliados y comienza tu negocio"
          aria-label="Afiliate a Cherry Central y comienza tu negocio"
        >
          Afiliate ahora
          <img 
            src={getHeroIconPath('Chevron Right.svg')} 
            alt="Flecha hacia la derecha" 
            width="20" 
            height="20" 
          />
        </Link>
      </div>
    </>
  );
};

export default AffiliateSection;