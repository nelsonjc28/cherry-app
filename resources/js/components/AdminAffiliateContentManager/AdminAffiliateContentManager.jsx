import { useState } from 'react';
import AdminAffiliateBannerManager from './AdminAffiliateBannerManager';
import AdminAffiliateSeasonManager from './AdminAffiliateSeasonManager';
import AdminAffiliatePromoBannerManager from './AdminAffiliatePromoBannerManager';
import AdminAffiliateFaqManager from './AdminAffiliateFaqManager';
import './AdminAffiliateContentManager.css';

const AdminAffiliateContentManager = () => {
  const [activeTab, setActiveTab] = useState('banners');

  return (
    <div className="affiliate-admin">
      <div className="affiliate-admin__header">
        <h2>Contenido del Módulo de Afiliación</h2>
        <div className="affiliate-admin__header-actions" />
      </div>

      <div className="affiliate-admin__tabs">
        <button
          className={`affiliate-admin__tab${activeTab === 'banners' ? ' active' : ''}`}
          onClick={() => setActiveTab('banners')}
        >
          Banner Superior
        </button>
        <button
          className={`affiliate-admin__tab${activeTab === 'seasons' ? ' active' : ''}`}
          onClick={() => setActiveTab('seasons')}
        >
          Nueva Temporada
        </button>
        <button
          className={`affiliate-admin__tab${activeTab === 'promos' ? ' active' : ''}`}
          onClick={() => setActiveTab('promos')}
        >
          Banners Promocionales
        </button>
        <button
          className={`affiliate-admin__tab${activeTab === 'faqs' ? ' active' : ''}`}
          onClick={() => setActiveTab('faqs')}
        >
          Preguntas Frecuentes
        </button>
      </div>

      <div className="affiliate-admin__content">
        {activeTab === 'banners' && <AdminAffiliateBannerManager />}
        {activeTab === 'seasons' && <AdminAffiliateSeasonManager />}
        {activeTab === 'promos' && <AdminAffiliatePromoBannerManager />}
        {activeTab === 'faqs' && <AdminAffiliateFaqManager />}
      </div>
    </div>
  );
};

export default AdminAffiliateContentManager;