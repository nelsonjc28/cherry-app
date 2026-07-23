import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../../store/userStore';
import { getMyProfile, updateMyIdvendedor } from '../../api/vendorApi';
import './VendorPages.css';

/**
 * Perfil del Vendedor.
 *
 * Permite al vendor autenticado:
 *  - Ver su idvendedor actual (o "No registrado" si está vacío).
 *  - Registrar / actualizar manualmente su idvendedor (provisto por la API externa).
 *  - Ver datos básicos de su cuenta.
 *
 * El idvendedor es único entre vendors (validado en backend y modelo).
 */
const VendorProfile = () => {
  const { user: storeUser, setUser } = useUserStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [idvendedorDraft, setIdvendedorDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMyProfile();
        if (cancelled) return;
        setProfile(data.user);
        setIdvendedorDraft(data.user?.idvendedor || '');
      } catch (err) {
        if (window.showToast) {
          window.showToast('Error al cargar el perfil: ' + err.message, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const trimmed = idvendedorDraft.trim();
    if (!trimmed) {
      setErrors({ idvendedor: 'Ingresa tu ID Vendedor.' });
      return;
    }
    try {
      setSaving(true);
      const res = await updateMyIdvendedor(trimmed);
      if (window.showToast) {
        window.showToast(res.message || 'ID Vendedor actualizado.', 'success');
      }
      setProfile(res.user);
      setIdvendedorDraft(res.user?.idvendedor || '');
      // Sincronizar el store para que el header muestre el idvendedor actualizado.
      if (setUser && res.user) setUser({ ...storeUser, idvendedor: res.user.idvendedor });
    } catch (err) {
      if (err.errors?.idvendedor) {
        setErrors({ idvendedor: err.errors.idvendedor[0] });
      } else if (window.showToast) {
        window.showToast(err.message || 'Error al guardar el idvendedor.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="vendor-page__loading">Cargando perfil...</div>;
  }

  if (!profile) {
    return (
      <div className="vendor-page__error">
        <p>No se pudo cargar el perfil.</p>
        <button type="button" onClick={() => navigate('/vendor')}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <header className="vendor-page__header">
        <h1>Mi Perfil</h1>
        <p>
          Configura tu identificador externo de vendedor. Este código lo
          proporciona la API del ERP y es único entre todos los vendedores.
        </p>
      </header>

      <div className="vendor-profile__grid">
        {/* Datos básicos */}
        <div className="vendor-card vendor-card--info">
          <div className="vendor-card__header">
            <div className="vendor-card__icon">👤</div>
            <div className="vendor-card__title">Datos de la cuenta</div>
          </div>
          <div className="vendor-card__content">
            <div className="vendor-card__row">
              <span className="vendor-card__label">Nombre</span>
              <span className="vendor-card__value">
                {profile.first_name} {profile.last_name} {profile.middle_name || ''}
              </span>
            </div>
            <div className="vendor-card__row">
              <span className="vendor-card__label">Email</span>
              <span className="vendor-card__value">{profile.email || '—'}</span>
            </div>
            <div className="vendor-card__row">
              <span className="vendor-card__label">Teléfono</span>
              <span className="vendor-card__value">{profile.phone || '—'}</span>
            </div>
            <div className="vendor-card__row">
              <span className="vendor-card__label">Rol</span>
              <span className="vendor-card__value">
                {profile.role?.name === 'vendedor' ? 'Vendedor' : (profile.role?.name || '—')}
              </span>
            </div>
          </div>
        </div>

        {/* ID Vendedor */}
        <div className="vendor-card vendor-card--form">
          <div className="vendor-card__header">
            <div className="vendor-card__icon">🆔</div>
            <div className="vendor-card__title">ID Vendedor (externo)</div>
          </div>
          <form onSubmit={handleSubmit} className="vendor-profile__form">
            <div className="vendor-card__content">
              <div className="vendor-form-group">
                <label htmlFor="idvendedor">
                  ID Vendedor <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="idvendedor"
                  name="idvendedor"
                  value={idvendedorDraft}
                  onChange={(e) => {
                    setIdvendedorDraft(e.target.value);
                    setErrors((prev) => ({ ...prev, idvendedor: null }));
                  }}
                  maxLength={64}
                  placeholder="Ej. 111, VEN-001"
                  className={errors.idvendedor ? 'input-error' : ''}
                  autoComplete="off"
                />
                {errors.idvendedor && (
                  <p className="vendor-form-error">{errors.idvendedor}</p>
                )}
                <p className="vendor-form-hint">
                  Este ID es único en el sistema. Lo provee la API del ERP y se
                  utiliza para asociar las órdenes y los clientes.
                </p>
                {profile.idvendedor && (
                  <p className="vendor-form-hint">
                    <strong>ID actual:</strong> {profile.idvendedor}
                  </p>
                )}
              </div>
            </div>
            <div className="vendor-form-actions">
              <button
                type="submit"
                className="vendor-btn vendor-btn--primary"
                disabled={saving || !idvendedorDraft.trim()}
              >
                {saving ? 'Guardando...' : 'Guardar ID Vendedor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;
