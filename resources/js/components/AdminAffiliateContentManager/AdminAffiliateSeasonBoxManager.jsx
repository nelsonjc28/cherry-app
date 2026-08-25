import { useState, useCallback, useEffect } from 'react';
import Swal from 'sweetalert2';
import { affiliateSeasonBoxService, formDataUtils } from '../../services/api';

const EMPTY_BOX = () => ({ title: '', description: '', button_text: '', button_url: '', is_active: true, display_order: '' });

const AdminAffiliateSeasonBoxManager = ({ seasonId }) => {
  const [boxes, setBoxes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const [boxForm, setBoxForm] = useState(EMPTY_BOX());
  const [boxImage, setBoxImage] = useState(null);
  const [boxPreview, setBoxPreview] = useState(null);

  const fetchBoxes = useCallback(async () => {
    try {
      const res = await affiliateSeasonBoxService.getAll(seasonId);
      setBoxes((res.data.boxes || []).sort((a, b) => a.display_order - b.display_order));
    } catch (err) {
      if (window.showToast) window.showToast('Error al cargar recuadros: ' + err.message, 'error');
    }
  }, [seasonId]);

  useEffect(() => { fetchBoxes(); }, [fetchBoxes]);

  const resetBoxForm = () => {
    setBoxForm(EMPTY_BOX());
    setBoxImage(null);
    setBoxPreview(null);
    setEditingBox(null);
    setShowForm(false);
  };

  const handleBoxEdit = (box) => {
    setEditingBox(box);
    setBoxForm({
      title: box.title,
      description: box.description,
      button_text: box.button_text ?? '',
      button_url: box.button_url ?? '',
      is_active: box.is_active,
      display_order: box.display_order ?? ''
    });
    setBoxPreview(box.image_path ? `/${box.image_path}` : null);
    setShowForm(true);
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    if (!editingBox && !boxImage) {
      if (window.showToast) window.showToast('Selecciona una imagen para el recuadro', 'error');
      return;
    }
    try {
      const fd = formDataUtils.createFromObject(boxForm, { trim: true, skipEmpty: false });
      if (boxImage) fd.append('image', boxImage);
      if (editingBox) {
        await affiliateSeasonBoxService.update(seasonId, editingBox.id, fd);
      } else {
        await affiliateSeasonBoxService.create(seasonId, fd);
      }
      if (window.showToast) window.showToast(editingBox ? 'Recuadro actualizado' : 'Recuadro creado', 'success');
      fetchBoxes();
      resetBoxForm();
    } catch (err) {
      if (window.showToast) window.showToast('Error al guardar recuadro: ' + err.message, 'error');
    }
  };

  const handleBoxDelete = async (box) => {
    const result = await Swal.fire({
      title: '¿Eliminar recuadro?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    try {
      await affiliateSeasonBoxService.delete(seasonId, box.id);
      fetchBoxes();
    } catch (err) {
      if (window.showToast) window.showToast('Error al eliminar recuadro: ' + err.message, 'error');
    }
  };

  return (
    <div className="card p-3 mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Recuadros Destacados</h4>
        <button className="btn btn-primary btn-sm" onClick={() => { resetBoxForm(); setShowForm(true); }}>+ Nuevo Recuadro</button>
      </div>

      {showForm && (
        <form onSubmit={handleBoxSubmit} className="border rounded p-3 mb-3">
          <h5>{editingBox ? 'Editar Recuadro' : 'Nuevo Recuadro'}</h5>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label">Título (ej. Tendencias) *</label>
              <input className="form-control" value={boxForm.title} onChange={(e) => setBoxForm({ ...boxForm, title: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Texto descriptivo *</label>
              <input className="form-control" value={boxForm.description} onChange={(e) => setBoxForm({ ...boxForm, description: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Texto del botón</label>
              <input className="form-control" value={boxForm.button_text} onChange={(e) => setBoxForm({ ...boxForm, button_text: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Enlace del botón</label>
              <input className="form-control" value={boxForm.button_url} onChange={(e) => setBoxForm({ ...boxForm, button_url: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Orden</label>
              <input type="number" className="form-control" value={boxForm.display_order} onChange={(e) => setBoxForm({ ...boxForm, display_order: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Imagen {!editingBox && '*'}</label>
              <input type="file" accept="image/*" className="form-control" onChange={(e) => {
                const f = e.target.files[0];
                setBoxImage(f);
                setBoxPreview(f ? URL.createObjectURL(f) : (editingBox?.image_path ? `/${editingBox.image_path}` : null));
              }} />
            </div>
            <div className="col-md-6">
              <div className="form-check form-switch mt-4">
                <input className="form-check-input" type="checkbox" checked={boxForm.is_active} onChange={(e) => setBoxForm({ ...boxForm, is_active: e.target.checked })} />
                <label className="form-check-label">Activo</label>
              </div>
            </div>
            {boxPreview && (
              <div className="col-12">
                <img src={boxPreview} alt="Vista previa" className="affiliate-admin__preview" />
              </div>
            )}
          </div>
          <div className="mt-3 d-flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetBoxForm}>Cancelar</button>
          </div>
        </form>
      )}

      {boxes.length === 0 && !showForm && <p className="text-muted">No hay recuadros para esta sección.</p>}
      <div className="row g-3">
        {boxes.map((box) => (
          <div key={box.id} className="col-md-4">
            <div className="card h-100">
              {box.image_path && <img src={`/${box.image_path}`} className="card-img-top" alt={box.title} style={{ maxHeight: 120, objectFit: 'cover' }} />}
              <div className="card-body">
                <h6 className="card-title mb-1">{box.title}</h6>
                <p className="card-text small">{box.description}</p>
                <span className={`badge ${box.is_active ? 'bg-success' : 'bg-secondary'}`}>{box.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div className="card-footer d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" onClick={() => handleBoxEdit(box)}>Editar</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => handleBoxDelete(box)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAffiliateSeasonBoxManager;