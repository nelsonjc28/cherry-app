import { useState } from 'react';
import PromoBanner from './PromoBanner';
import './AffiliateFaq.css';

const normalizeBanner = (banner) => {
  if (!banner) return null;

  return {
    ...banner,
    imageUrl: banner.imageUrl || (banner.image_path ? `/${banner.image_path}` : ''),
    redirectUrl: banner.redirectUrl || banner.button_url || '',
    isActive: banner.isActive ?? banner.is_active
  };
};

const AffiliateFaq = ({ faqs = [], topBanner, bottomBanner }) => {
  const [openId, setOpenId] = useState(null);
  const normalizedTopBanner = normalizeBanner(topBanner);
  const normalizedBottomBanner = normalizeBanner(bottomBanner);

  const toggleItem = (id) => {
    setOpenId((currentId) => (currentId === id ? null : id));
  };

  return (
    <section className="affiliate-faq" aria-labelledby="affiliate-faq-heading">
      <div className="affiliate-faq__container">
        {normalizedTopBanner && (
          <PromoBanner
            banner={normalizedTopBanner}
            className="affiliate-promo-banner--top"
          />
        )}

        <h2 id="affiliate-faq-heading" className="affiliate-faq__title">
          Preguntas frecuentes
        </h2>

        <div className="affiliate-faq__list">
          {faqs.map((item) => {
            const isOpen = openId === item.id;
            const panelId = `affiliate-faq-panel-${item.id}`;
            const buttonId = `affiliate-faq-button-${item.id}`;

            return (
              <div
                key={item.id}
                className={`affiliate-faq__item${isOpen ? ' is-open' : ''}`}
              >
                <button
                  id={buttonId}
                  type="button"
                  className="affiliate-faq__trigger"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(item.id)}
                >
                  <span className="affiliate-faq__question">{item.question}</span>
                  <span className="affiliate-faq__icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="affiliate-faq__panel"
                >
                  <p className="affiliate-faq__answer">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>

        {normalizedBottomBanner && (
          <PromoBanner
            banner={normalizedBottomBanner}
            className="affiliate-promo-banner--bottom"
          />
        )}
      </div>
    </section>
  );
};

export default AffiliateFaq;
