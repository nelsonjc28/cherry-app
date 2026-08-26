import { affiliatePromoBannerService } from '../../services/api';
import { useAffiliateCrud } from './useAffiliateCrud';
import AffiliateCrudFormFields from './AffiliateCrudFormFields';
import AffiliateModal from './AffiliateModal';

const EMPTY = () => ({ button_url: '', is_active: true, display_order: '' });
const FROM_ITEM = (item) => ({
  button_url: item.button_url ?? '',
  is_active: item.is_active,
  display_order: item.display_order ?? ''
});
const FIELDS = [
  { name: 'button_url', label: 'URL de redirección *', required: true },
  { name: 'display_order', label: 'Orden', type: 'number' },
  { name: 'is_active', label: 'Activo', type: 'switch' }
];

const AdminAffiliatePromoBannerManager = () => {
  const crud = useAffiliateCrud({ service: affiliatePromoBannerService, listKey: 'banners', withImage: true, getForm: (item) => (item ? FROM_ITEM(item) : EMPTY()) });
  if (crud.loading) return <div className="text-center py-4">Cargando banners promocionales...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Banners Promocionales e Interactivos</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { crud.resetForm(); crud.setShowForm(true); }}>+ Nuevo Banner</button>
      </div>

      <AffiliateModal
        isOpen={crud.showForm}
        onClose={crud.resetForm}
        title={crud.editing ? 'Editar Banner Promocional' : 'Nuevo Banner Promocional'}
      >
        <form onSubmit={crud.handleSubmit}>
          <AffiliateCrudFormFields
            fields={FIELDS}
            form={crud.form}
            setField={crud.setField}
            imageFile={crud.imageFile}
            setImageFile={crud.setImageFile}
            preview={crud.preview}
            withImage
            editing={crud.editing}
            imageHelpText="La imagen debe tener estas medidas: 1800 px de ancho × 900 px de alto."
          />
          <div className="affiliate-manager__form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={crud.submitting}>
              {crud.submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={crud.resetForm}>Cancelar</button>
          </div>
        </form>
      </AffiliateModal>

      {crud.items.length === 0 && <p className="text-muted">No hay banners promocionales configurados.</p>}
      <div className="affiliate-admin__records-grid">
        {crud.items.map((item) => (
          <div key={item.id} className="affiliate-admin__record-card">
            <div className="affiliate-admin__record-image">
              {item.image_path ? <img src={`/${item.image_path}`} alt="Promo Banner" /> : <div className="affiliate-admin__record-no-image">Sin imagen</div>}
            </div>
            <div className="affiliate-admin__record-info">
              <div className="affiliate-admin__record-stats">
                <span>🔗 {item.button_url ? 'Con enlace' : 'Sin enlace'}</span>
              </div>
              <div className="affiliate-admin__record-status">
                <span className={`affiliate-admin__status-badge ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
            <div className="affiliate-admin__record-actions">
              <button type="button" className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--edit" onClick={() => crud.handleEdit(item)} data-tooltip="Editar" title="Editar" aria-label="Editar">✏️</button>
              <button type="button" className={`order-action-btn client-manager__table-icon-btn affiliate-admin__toggle-btn${item.is_active ? ' is-active' : ''}`} onClick={() => crud.handleToggle(item)} data-tooltip={item.is_active ? 'Desactivar' : 'Activar'} title={item.is_active ? 'Desactivar' : 'Activar'} aria-label={item.is_active ? 'Desactivar' : 'Activar'}>{item.is_active ? '⏻' : '⭘'}</button>
              <button type="button" className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--delete" onClick={() => crud.handleDelete(item)} data-tooltip="Eliminar" title="Eliminar" aria-label="Eliminar">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAffiliatePromoBannerManager;