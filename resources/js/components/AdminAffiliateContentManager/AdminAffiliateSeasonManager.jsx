import { useState, useCallback, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { affiliateSeasonService } from '../../services/api';
import AdminAffiliateSeasonBoxManager from './AdminAffiliateSeasonBoxManager';
import AffiliateModal from './AffiliateModal';

const EMPTY = () => ({ title: '', catalog_id: '', is_active: true, display_order: '' });
const FROM_ITEM = (item) => ({
  title: item.title,
  catalog_id: item.catalog_id ?? '',
  is_active: item.is_active,
  display_order: item.display_order ?? ''
});

const CatalogSelect = ({ catalogs, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const selectedCatalog = catalogs.find((catalog) => String(catalog.id) === String(value));
  const filteredCatalogs = catalogs.filter((catalog) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return `${catalog.name || ''} ${catalog.code || ''}`.toLowerCase().includes(query);
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (catalogId) => {
    onChange(String(catalogId));
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="affiliate-manager__select2" ref={wrapperRef}>
      <button
        type="button"
        className={`affiliate-manager__select2-trigger${isOpen ? ' is-open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedCatalog ? 'affiliate-manager__select2-value' : 'affiliate-manager__select2-placeholder'}>
          {selectedCatalog ? `${selectedCatalog.name}${selectedCatalog.code ? ` (${selectedCatalog.code})` : ''}` : '— Sin catálogo asociado —'}
        </span>
        <span className="affiliate-manager__select2-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="affiliate-manager__select2-dropdown" role="listbox">
          <input
            type="search"
            className="affiliate-manager__select2-search"
            placeholder="Buscar catálogo..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            autoFocus
          />
          <div className="affiliate-manager__select2-options">
            <button type="button" className="affiliate-manager__select2-option" onClick={() => handleSelect('')}>
              — Sin catálogo asociado —
            </button>
            {filteredCatalogs.map((catalog) => (
              <button
                type="button"
                key={catalog.id}
                className={`affiliate-manager__select2-option${String(catalog.id) === String(value) ? ' is-selected' : ''}`}
                onClick={() => handleSelect(catalog.id)}
                role="option"
                aria-selected={String(catalog.id) === String(value)}
              >
                {catalog.name}{catalog.code ? ` (${catalog.code})` : ''}
              </button>
            ))}
            {filteredCatalogs.length === 0 && <div className="affiliate-manager__select2-empty">No se encontraron catálogos</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminAffiliateSeasonManager = () => {
  const [seasons, setSeasons] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY());
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [seasonsRes, catalogsRes] = await Promise.all([
        affiliateSeasonService.getAll(),
        affiliateSeasonService.getAvailableCatalogs()
      ]);
      setSeasons((seasonsRes.data.seasons || []).sort((a, b) => a.display_order - b.display_order));
      setCatalogs(catalogsRes.data.catalogs || []);
    } catch (err) {
      if (window.showToast) window.showToast('Error al cargar temporadas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => { setForm(EMPTY()); setEditing(null); setShowForm(false); };

  const handleEdit = (season) => {
    setEditing(season);
    setForm(FROM_ITEM(season));
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await affiliateSeasonService.update(editing.id, form);
      } else {
        await affiliateSeasonService.create(form);
      }
      if (window.showToast) window.showToast(editing ? 'Sección actualizada' : 'Sección creada', 'success');
      fetchAll();
      resetForm();
    } catch (err) {
      if (window.showToast) window.showToast('Error al guardar: ' + err.message, 'error');
    }
  };

  const handleDelete = async (season) => {
    const result = await Swal.fire({
      title: '¿Eliminar sección?',
      text: 'Se eliminarán también sus recuadros internos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    try {
      await affiliateSeasonService.delete(season.id);
      if (selectedSeasonId === season.id) setSelectedSeasonId(null);
      fetchAll();
    } catch (err) {
      if (window.showToast) window.showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  if (loading) return <div className="text-center py-4">Cargando temporadas...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Conoce la Nueva Temporada</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>+ Nueva Sección</button>
      </div>

      <AffiliateModal
        isOpen={showForm}
        onClose={resetForm}
        title={editing ? 'Editar Sección Temporada' : 'Nueva Sección Temporada'}
      >
        <form onSubmit={handleSubmit}>
          <div className="affiliate-manager__form-content">
            <div className="affiliate-manager__form-row">
              <div className="affiliate-manager__form-group">
                <label>Título *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="affiliate-manager__form-group">
                <label>Catálogo</label>
                <CatalogSelect catalogs={catalogs} value={form.catalog_id} onChange={(catalog_id) => setForm({ ...form, catalog_id })} />
              </div>
            </div>
            <div className="affiliate-manager__form-row">
              <div className="affiliate-manager__form-group">
                <label>Orden</label>
                <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
              </div>
              <div className="affiliate-manager__form-group affiliate-manager__form-group--switch">
                <label>Activa</label>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              </div>
            </div>
          </div>
          <div className="affiliate-manager__form-actions">
            <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>Cancelar</button>
          </div>
        </form>
      </AffiliateModal>

      {seasons.length === 0 && <p className="text-muted">No hay secciones de temporada configuradas.</p>}
      <div className="affiliate-admin__records-grid mb-4">
        {seasons.map((season) => (
          <div key={season.id} className={`affiliate-admin__record-card${selectedSeasonId === season.id ? ' is-selected' : ''}`}>
            <div className="affiliate-admin__record-image">
              <div className="affiliate-admin__record-no-image">Temporada</div>
            </div>
            <div className="affiliate-admin__record-info">
              <h4>{season.title}</h4>
              <p>{season.catalog ? season.catalog.name : 'Sin catálogo asociado'}</p>
              <div className="affiliate-admin__record-stats">
                <span>📦 {season.boxes?.length ?? 0} recuadros</span>
              </div>
              <div className="affiliate-admin__record-status">
                <span className={`affiliate-admin__status-badge ${season.is_active ? 'active' : 'inactive'}`}>{season.is_active ? 'Activa' : 'Inactiva'}</span>
              </div>
            </div>
            <div className="affiliate-admin__record-actions">
                <button type="button" className="order-action-btn client-manager__table-icon-btn affiliate-admin__manage-btn" onClick={() => setSelectedSeasonId(season.id)} data-tooltip="Gestionar recuadros" title="Gestionar recuadros" aria-label="Gestionar recuadros">🧩</button>
                <button type="button" className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--edit" onClick={() => handleEdit(season)} data-tooltip="Editar" title="Editar" aria-label="Editar">✏️</button>
                <button type="button" className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--delete" onClick={() => handleDelete(season)} data-tooltip="Eliminar" title="Eliminar" aria-label="Eliminar">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {selectedSeasonId && <AdminAffiliateSeasonBoxManager seasonId={selectedSeasonId} />}
    </div>
  );
};

export default AdminAffiliateSeasonManager;