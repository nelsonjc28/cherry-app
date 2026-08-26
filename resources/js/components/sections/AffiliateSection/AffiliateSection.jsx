import './AffiliateSection.css';
import { getHeroIconPath } from '../../../utils/assetPaths';
import useUserStore from '../../../store/userStore';
import { publicAffiliateContentService } from '../../../services/api';
import { useEffect, useState } from 'react';

const AffiliateSection = () => {
  const { user } = useUserStore();
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let mounted = true;

    publicAffiliateContentService.getAll()
      .then((response) => {
        if (mounted) setBanner(response.data?.data?.banner || null);
      })
      .catch(() => {
        if (mounted) setBanner(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Solo mostrar si no hay usuario logueado
  if (user) {
    return null;
  }

  if (!banner) {
    return null;
  }

  const imageUrl = banner.image_path ? `/${banner.image_path}` : `${window.location.origin}/images/AffiliateSection/affiliate-girl.png`;
  const isExternalUrl = /^https?:\/\//i.test(banner.button_url);

  return (
    <>
      <div className="affiliate-section__image">
        <img src={imageUrl} alt={banner.title} />

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
          {banner.title}
        </h2>
        {banner.subtitle && <p className="affiliateSubtitle">{banner.subtitle}</p>}
        <a
          href={banner.button_url}
          className="btn-explore"
          target={isExternalUrl ? '_blank' : undefined}
          rel={isExternalUrl ? 'noreferrer' : undefined}
          aria-label={banner.button_text}
        >
          {banner.button_text}
          <img 
            src={getHeroIconPath('Chevron Right.svg')} 
            alt="Flecha hacia la derecha" 
            width="20" 
            height="20" 
          />
        </a>
      </div>
    </>
  );
};

export default AffiliateSection;
