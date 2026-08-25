import { affiliateFaqService } from '../../services/api';
import { useAffiliateCrud } from './useAffiliateCrud';
import AffiliateCrudFormFields from './AffiliateCrudFormFields';
import AffiliateModal from './AffiliateModal';

const EMPTY = () => ({ question: '', answer: '', is_active: true, display_order: '' });
const FROM_ITEM = (item) => ({
  question: item.question,
  answer: item.answer,
  is_active: item.is_active,
  display_order: item.display_order ?? ''
});
const FIELDS = [
  { name: 'question', label: 'Pregunta *', required: true },
  { name: 'answer', label: 'Respuesta *', type: 'textarea', rows: 3, required: true },
  { name: 'display_order', label: 'Orden de visualización', type: 'number' },
  { name: 'is_active', label: 'Activa', type: 'switch' }
];

const AdminAffiliateFaqManager = () => {
  const crud = useAffiliateCrud({ service: affiliateFaqService, listKey: 'faqs', getForm: (item) => (item ? FROM_ITEM(item) : EMPTY()) });
  if (crud.loading) return <div className="text-center py-4">Cargando preguntas frecuentes...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Preguntas Frecuentes (FAQ)</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { crud.resetForm(); crud.setShowForm(true); }}>+ Nueva Pregunta</button>
      </div>

      <AffiliateModal
        isOpen={crud.showForm}
        onClose={crud.resetForm}
        title={crud.editing ? 'Editar Pregunta' : 'Nueva Pregunta'}
      >
        <form onSubmit={crud.handleSubmit}>
          <AffiliateCrudFormFields fields={FIELDS} form={crud.form} setField={crud.setField} editing={crud.editing} />
          <div className="affiliate-manager__form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={crud.submitting}>
              {crud.submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={crud.resetForm}>Cancelar</button>
          </div>
        </form>
      </AffiliateModal>

      {crud.items.length === 0 && <p className="text-muted">No hay preguntas frecuentes configuradas.</p>}
      <div className="affiliate-admin__records-grid">
        {crud.items.map((item, idx) => (
          <div key={item.id} className="affiliate-admin__record-card">
            <div className="affiliate-admin__record-image">
              <div className="affiliate-admin__record-no-image">Pregunta frecuente</div>
            </div>
            <div className="affiliate-admin__record-info">
              <h4>{idx + 1}. {item.question}</h4>
              <p>{item.answer}</p>
              <div className="affiliate-admin__record-stats">
                <span>↕ Orden: {item.display_order}</span>
              </div>
              <div className="affiliate-admin__record-status">
                <span className={`affiliate-admin__status-badge ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'Activa' : 'Inactiva'}</span>
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

export default AdminAffiliateFaqManager;