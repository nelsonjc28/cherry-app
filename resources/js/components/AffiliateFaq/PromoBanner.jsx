import { Link } from 'react-router-dom';

const isExternalUrl = (url = '') => /^https?:\/\//i.test(url);

const PromoBanner = ({ banner, className = '' }) => {
  if (!banner?.isActive || !banner.imageUrl) {
    return null;
  }

  const classNames = `affiliate-promo-banner ${className}`.trim();

  const content = (
    <img
      src={banner.imageUrl}
      alt={banner.altText || 'Banner promocional'}
      className="affiliate-promo-banner__image"
    />
  );

  if (isExternalUrl(banner.redirectUrl)) {
    return (
      <a
        href={banner.redirectUrl}
        className={classNames}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={banner.redirectUrl || '/promociones'} className={classNames}>
      {content}
    </Link>
  );
};

export default PromoBanner;
