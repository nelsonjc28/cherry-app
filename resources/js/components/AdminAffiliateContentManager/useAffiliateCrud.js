import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { formDataUtils } from '../../services/api';

/**
 * Hook genérico CRUD para los módulos de contenido de afiliación.
 * - service: objeto de servicio API con getAll/create/update/delete/toggleStatus
 * - listKey: clave del arreglo en la respuesta (p.ej. 'banners', 'seasons', 'faqs')
 * - withImage: si el recurso maneja imagen
 * - getForm: función que construye el form inicial o desde item (retorna objeto)
 */
export const useAffiliateCrud = ({ service, listKey, withImage = false, getForm }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await service.getAll();
      const list = res.data && res.data[listKey] ? res.data[listKey] : [];
      setItems([...list].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch (err) {
      if (window.showToast) window.showToast('Error al cargar datos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [service, listKey]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setForm(getForm());
    setImageFile(null);
    setPreview(null);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm(getForm(item));
    if (withImage) setPreview(item.image_path ? `/${item.image_path}` : null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (withImage && !editing && !imageFile) {
      if (window.showToast) window.showToast('Selecciona una imagen', 'error');
      return;
    }

    try {
      setSubmitting(true);
      let payload;

      if (withImage) {
        payload = formDataUtils.createFromObject(form, { trim: true, skipEmpty: false });
        if (imageFile) payload.append('image', imageFile);
      } else {
        payload = form;
      }

      if (editing) {
        await service.update(editing.id, payload);
      } else {
        await service.create(payload);
      }

      if (window.showToast) window.showToast(editing ? 'Registro actualizado' : 'Registro creado', 'success');
      fetchItems();
      resetForm();
    } catch (err) {
      if (window.showToast) window.showToast('Error al guardar: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item, additionalMessage = '') => {
    const result = await Swal.fire({
      title: '¿Eliminar registro?',
      text: additionalMessage || 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    try {
      await service.delete(item.id);
      if (window.showToast) window.showToast('Registro eliminado', 'success');
      fetchItems();
    } catch (err) {
      if (window.showToast) window.showToast('Error al eliminar: ' + err.message, 'error');
    }
  };

  const handleToggle = async (item) => {
    try {
      await service.toggleStatus(item.id);
      fetchItems();
    } catch (err) {
      if (window.showToast) window.showToast('Error al cambiar estado: ' + err.message, 'error');
    }
  };

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  return {
    items,
    loading,
    showForm,
    setShowForm,
    editing,
    submitting,
    form,
    setField,
    imageFile,
    setImageFile,
    preview,
    resetForm,
    handleEdit,
    handleSubmit,
    handleDelete,
    handleToggle,
    fetchItems
  };
};