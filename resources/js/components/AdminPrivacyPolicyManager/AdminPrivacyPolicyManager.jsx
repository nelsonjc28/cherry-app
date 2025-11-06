import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import apiClient from '../../api/config/apiConfig';
import Swal from 'sweetalert2';
import './AdminPrivacyPolicyManager.css';

const AdminPrivacyPolicyManager = () => {
  const [policies, setPolicies] = useState([]);
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editorContent, setEditorContent] = useState('');

  // Editor de texto rico con TinyMCE
  const [editorState, setEditorState] = useState({
    title: '',
    version: '',
    content: ''
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/privacy-policies');
      setPolicies(response.data.data);
      
      // Establecer la política activa como actual
      const activePolicy = response.data.data.find(p => p.is_active);
      if (activePolicy) {
        setCurrentPolicy(activePolicy);
      }
    } catch (error) {
      window.showToast('Error al cargar los terminos y condiciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingPolicy({
      id: null,
      title: 'Nuevo Termino y Condicion',
      version: '1.0',
      content: '',
      is_active: false
    });
    setEditorState({
      title: 'Nuevo Termino y Condicion',
      version: '1.0',
      content: ''
    });
    setShowEditor(true);
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setEditorState({
      title: policy.title,
      version: policy.version,
      content: policy.content
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (editingPolicy.id) {
        // Actualizar política existente
        await apiClient.post(`/api/admin/privacy-policies/${editingPolicy.id}`, {
          title: editorState.title,
          version: editorState.version,
          content: editorState.content,
          is_active: editingPolicy.is_active
        });
        window.showToast('Termino y Condicion actualizado exitosamente', 'success');
      } else {
        // Crear nueva política
        await apiClient.post('/api/admin/privacy-policies', {
          title: editorState.title,
          version: editorState.version,
          content: editorState.content
        });
        window.showToast('Termino y Condicion creado exitosamente', 'success');
      }
      
      setShowEditor(false);
      setEditingPolicy(null);
      setEditorState({ title: '', version: '', content: '' });
      loadPolicies();
    } catch (error) {
      console.error('Error al guardar el termino y condicion:', error);
      window.showToast('Error al guardar el termino y condicion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (policyId) => {
    try {
      await apiClient.patch(`/api/admin/privacy-policies/${policyId}/activate`);
      window.showToast('Termino y Condicion activado exitosamente', 'success');
      loadPolicies();
    } catch (error) {
      window.showToast('Error al activar el termino y condicion', 'error');
    }
  };

  const handleDelete = async (policyId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Quieres eliminar esta termino y condicion? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await apiClient.delete(`/api/admin/privacy-policies/${policyId}`);
      window.showToast('Termino y Condicion eliminado exitosamente', 'success');
      loadPolicies();
    } catch (error) {
      window.showToast('Error al eliminar el termino y condicion', 'error');
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingPolicy(null);
    setEditorState({ title: '', version: '', content: '' });
  };

  // Función para manejar cambios en TinyMCE
  const handleEditorChange = (content) => {
    setEditorState(prev => ({
      ...prev,
      content: content
    }));
  };

  if (loading && policies.length === 0) {
    return (
      <div className="admin-privacy-manager">
        <div className="admin-privacy-manager__loading">
          <p>Cargando terminos y condiciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-privacy-manager">
      <div className="admin-privacy-manager__header">
        <h2 className="admin-privacy-manager__title">Gestión de Terminos y condiciones</h2>
        <button 
          className="admin-privacy-manager__create-btn"
          onClick={handleCreateNew}
        >
          Crear Nuevo Termino y Condicion
        </button>
      </div>

      {message && (
        <div className={`admin-privacy-manager__message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Lista de políticas */}
      <div className="admin-privacy-manager__policies">
        <h3>Terminos y Condiciones Existentes</h3>
        {policies.length === 0 ? (
          <p>No hay terminos y condiciones creados.</p>
        ) : (
          <div className="admin-privacy-manager__policies-list">
            {policies.map((policy) => (
              <div 
                key={policy.id} 
                className={`admin-privacy-manager__policy-item ${policy.is_active ? 'active' : ''}`}
              >
                <div className="admin-privacy-manager__policy-info">
                  <h4>{policy.title}</h4>
                  <p><strong>Versión:</strong> {policy.version}</p>
                  <p><strong>Estado:</strong> {policy.is_active ? 'Activa' : 'Inactiva'}</p>
                  <p><strong>Creada:</strong> {new Date(policy.created_at).toLocaleDateString()}</p>
                  {policy.published_at && (
                    <p><strong>Publicada:</strong> {new Date(policy.published_at).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="admin-privacy-manager__policy-actions">
                  <button 
                    className="admin-privacy-manager__edit-btn"
                    onClick={() => handleEdit(policy)}
                  >
                    Editar
                  </button>
                  {!policy.is_active && (
                    <button 
                      className="admin-privacy-manager__activate-btn"
                      onClick={() => handleActivate(policy.id)}
                    >
                      Activar
                    </button>
                  )}
                  {!policy.is_active && (
                    <button 
                      className="admin-privacy-manager__delete-btn"
                      onClick={() => handleDelete(policy.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor de texto rico */}
      {showEditor && (
        <div className="admin-privacy-manager__editor-overlay">
          <div className="admin-privacy-manager__editor">
            <div className="admin-privacy-manager__editor-header">
              <h3>{editingPolicy.id ? 'Editar Termino y Condicion' : 'Nuevo Termino y Condicion'}</h3>
              <button 
                className="admin-privacy-manager__close-btn"
                onClick={handleCancel}
              >
                ×
              </button>
            </div>

            <div className="admin-privacy-manager__editor-form">
              <div className="admin-privacy-manager__form-group">
                <label htmlFor="policy-title">Título:</label>
                <input
                  id="policy-title"
                  type="text"
                  value={editorState.title}
                  onChange={(e) => setEditorState(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título de la termino y condicion"
                />
              </div>

              <div className="admin-privacy-manager__form-group">
                <label htmlFor="policy-version">Versión:</label>
                <input
                  id="policy-version"
                  type="text"
                  value={editorState.version}
                  onChange={(e) => setEditorState(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0"
                />
              </div>

                             <div className="admin-privacy-manager__form-group">
                 <label>Contenido:</label>
                 
                                   {/* Indicador de caracteres */}
                  <div className="admin-privacy-manager__editor-status">
                    <small>
                      Caracteres: {editorState.content.length}
                    </small>
                  </div>

                                 {/* Editor TinyMCE */}
                 <Editor
                   apiKey="uhtywi0yqpomfyb0hr8tkly5wd3qg1b2j856pe4wz4f3zh1q"
                   value={editorState.content}
                   onEditorChange={handleEditorChange}
                   init={{
                     height: 500,
                     menubar: false,
                     plugins: [
                       'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                       'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                       'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                     ],
                     toolbar: 'undo redo | blocks | ' +
                       'bold italic forecolor | alignleft aligncenter ' +
                       'alignright alignjustify | bullist numlist outdent indent | ' +
                       'removeformat | help',
                     content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                     language: 'es',
                     branding: false,
                     elementpath: false,
                     statusbar: true,
                     resize: true,
                     paste_as_text: true,
                     paste_enable_default_filters: true,
                     paste_word_valid_elements: 'b,strong,i,em,h1,h2,h3,h4,h5,h6,p,br,ul,ol,li',
                     paste_retain_style_properties: 'none',
                     paste_remove_styles_if_webkit: true,
                     paste_remove_styles: true,
                     paste_filter_drop: true,
                     paste_convert_word_fake_lists: true,
                     paste_remove_styles_selector: 'b,strong,i,em,h1,h2,h3,h4,h5,h6',
                     paste_auto_cleanup_on_paste: true
                   }}
                 />
              </div>

              <div className="admin-privacy-manager__form-actions">
                <button 
                  type="button"
                  className="admin-privacy-manager__cancel-btn"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  className="admin-privacy-manager__save-btn"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Termino y Condicion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrivacyPolicyManager;
