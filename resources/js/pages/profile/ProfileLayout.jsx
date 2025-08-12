import { Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ProfileSidebar from '../../components/ProfileSidebar';
import './ProfileLayout.css';

const ProfileLayout = () => {
  return (
    <>
      <Helmet>
        <title>Mi Perfil | Cherry Central</title>
        <meta name="description" content="Gestiona tu perfil, pedidos, favoritos y configuración en Cherry Central" />
      </Helmet>
      
      <div className="profile-layout">
        <div className="container">
          <div className="profile-layout__content">
            <ProfileSidebar />
            <main className="profile-layout__main">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileLayout;
