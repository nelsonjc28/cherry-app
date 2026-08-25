import { useState } from 'react';
import PromoBanner from './PromoBanner';
import './AffiliateFaq.css';

const FAQ_ITEMS = [
  {
    id: 'start-selling',
    question: '¿Cómo empiezo a vender los productos de Cherry?',
    answer:
      'Solo tienes que afiliarte como distribuidora, acceder a nuestros catálogos y precios especiales de mayoreo, y empezar a ofrecer los productos a tus clientes. Nosotros te damos la asesoría para arrancar.',
  },
  {
    id: 'experience',
    question: '¿Necesito experiencia previa para ser distribuidora?',
    answer:
      'No, no se requiere experiencia. Cualquier persona puede unirse; tú decides cómo y cuándo vender, y te acompañamos con asesoría personalizada durante el proceso.',
  },
  {
    id: 'catalog-products',
    question: '¿Qué productos puedo encontrar en los catálogos?',
    answer:
      'Ropa y calzado para dama: vestidos, blusas, pantalones, faldas, conjuntos, sacos, chamarras, entre otros, con modelos nuevos de forma constante según la temporada.',
  },
  {
    id: 'wholesale-access',
    question: '¿Cómo obtengo el catálogo y los precios de mayoreo?',
    answer:
      'Al afiliarte tienes acceso exclusivo a los catálogos completos y a precios especiales de mayoreo, distintos a los de venta al público.',
  },
  {
    id: 'earnings',
    question: '¿Cuánto puedo ganar vendiendo con Cherry?',
    answer:
      'Tus ingresos dependen de tu ritmo de venta y dedicación; al comprar a precio de mayoreo y vender al público, tú defines tu margen de ganancia por producto.',
  },
];

// TODO: Conectar con API/Base de datos de banners
// Mapear aquí la respuesta del backend (p. ej. GET /api/affiliate-promo-banners)
// para agregar, editar o desactivar cada campaña con isActive.
const MOCK_PROMO_BANNERS = {
  topBanner: {
    id: 1,
    imageUrl: '/images/AuthPages/register-banner-girl.png',
    altText: 'México nos une',
    redirectUrl: '/promocion-mexico',
    isActive: true,
  },
  bottomBanner: {
    id: 2,
    imageUrl: '/images/AuthPages/phone-banner.png',
    altText: 'Afíliate y comienza a vender con Cherry',
    redirectUrl: '/promociones',
    isActive: true,
  },
};

const AffiliateFaq = ({ topBanner, bottomBanner }) => {
  const [openId, setOpenId] = useState(null);

  // TODO: Conectar con API/Base de datos de banners
  // Sustituir el mock por topBanner/bottomBanner que vengan del backend.
  const resolvedTopBanner = topBanner ?? MOCK_PROMO_BANNERS.topBanner;
  const resolvedBottomBanner = bottomBanner ?? MOCK_PROMO_BANNERS.bottomBanner;

  const toggleItem = (id) => {
    setOpenId((currentId) => (currentId === id ? null : id));
  };

  return (
    <section className="affiliate-faq" aria-labelledby="affiliate-faq-heading">
      <div className="affiliate-faq__container">
        <PromoBanner
          banner={resolvedTopBanner}
          className="affiliate-promo-banner--top"
        />

        <h2 id="affiliate-faq-heading" className="affiliate-faq__title">
          Preguntas frecuentes
        </h2>

        <div className="affiliate-faq__list">
          {FAQ_ITEMS.map((item) => {
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

        <PromoBanner
          banner={resolvedBottomBanner}
          className="affiliate-promo-banner--bottom"
        />
      </div>
    </section>
  );
};

export default AffiliateFaq;
