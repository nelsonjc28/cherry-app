import { affiliatePromoBannerService } from '../../services/api';
import { useAffiliateCrud } from './useAffiliateCrud';
import AffiliateCrudFormFields from './AffiliateCrudFormFields';
import AffiliateModal from './AffiliateModal';

const EMPTY = () => ({ title: '', description: '', button_text: '', button_url: '', start_date: '', end_date: '', is_active: true, display_order: '' });
const FROM_ITEM = (item) => ({
  title: item.title,
  description: item.description,
  button_text: item.button_text ?? '',
  button_url: item.button_url ?? '',
  start_date: item.start_date ?? '',
  end_date: item.end_date ?? '',
  is_active: item.is_active,
  display_order: item.display_order ?? ''
});
const FIELDS = [
  { name: 'title', label: 'Título / Campaña (ej. Summer Sale) *', required: true },
  { name: 'description', label: 'Descripción *', required: true },
  { name: 'button_text', label: 'Texto del botón' },
  { name: 'button_url', label: 'URL de redirección' },
  { name: 'start_date', label: 'Fecha de inicio', type: 'date' },
  { name: 'end_date', label: 'Fecha de fin', type: 'date' },
  { name: 'display_order', label: 'Orden', type: 'number' },
  { name: 'is_active', label: 'Activo', type: 'switch' }
];

const isCurrent = (item) => {
  const today = new Date().toISOString().slice(0, 10);
  if (item.start_date && today < item.start_date) return false;
  if (item.end_date && today > item.end_date) return false;
  return true;
};

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
        {crud.items.map((item) => {
          const current = isCurrent(item);
          return (
            <div key={item.id} className={`affiliate-admin__record-card${!current ? ' is-expired' : ''}`}>
              <div className="affiliate-admin__record-image">
                {item.image_path ? <img src={`/${item.image_path}`} alt={item.title} /> : <div className="affiliate-admin__record-no-image">Sin imagen</div>}
              </div>
              <div className="affiliate-admin__record-info">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <div className="affiliate-admin__record-stats">
                  {item.start_date && <span>📅 Inicio: {item.start_date}</span>}
                  {item.end_date && <span>📅 Fin: {item.end_date}</span>}
                </div>
                <div className="affiliate-admin__record-status">
                  <span className={`affiliate-admin__status-badge ${current ? 'active' : 'inactive'}`}>{current ? 'Vigente' : 'Fuera de vigencia'}</span>
                  <span className={`affiliate-admin__status-badge ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
              <div className="affiliate-admin__record-actions">
                <button type="button" className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--edit" onClick={() => crud.handleEdit(item)} data-tooltip="Editar" title="Editar" aria-label="Editar">✏️</button>
                <button type="button" className={`order-action-btn client-manager__table-icon-btn affiliate-admin__toggle-btn${item.is_active ? ' is-active' : ''}`} onClick={() => crud.handleToggle(item)} data-tooltip={item.is_active ? 'Desactivar' : 'Activar'} title={item.is_active ? 'Desactivar' : 'Activar'} aria-label={item.is_active ? 'Desactivar' : 'Activar'}>{item.is_active ? '⏻' : '⭘'}</button>
                <button type="button" className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--delete" onClick={() => crud.handleDelete(item)} data-tooltip="Eliminar" title="Eliminar" aria-label="Eliminar">🗑️</button>
                </div>
              </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAffiliatePromoBannerManager;