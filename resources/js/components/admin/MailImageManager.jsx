import { useState, useEffect, useRef, useCallback } from 'react';
import './MailImageManager.css';

const getToken = () => localStorage.getItem('token');

/** Vista previa: mismo host que el admin (evita https://localhost con APP_URL en http, etc.). */
function mailImagePreviewSrc(row) {
  if (row.image_preview_path) {
    const p = row.image_preview_path.startsWith('/') ? row.image_preview_path : `/${row.image_preview_path}`;
    return `${window.location.origin}${p}`;
  }
  if (row.image_url && /^https?:\/\//i.test(row.image_url)) {
    try {
      const u = new URL(row.image_url);
      return `${window.location.origin}${u.pathname}${u.search}`;
    } catch {
      return row.image_url;
    }
  }
  return row.image_url || '';
}

function buildTemplatesFromConfigs(configs) {
  const byId = {};
  for (const row of configs) {
    const id = row.template || row.mail_type;
    if (!byId[id]) {
      byId[id] = {
        id,
        title: row.template_label || row.label,
        description: row.template_description || '',
        slots: [],
      };
    }
    byId[id].slots.push(row);
  }
  return Object.values(byId).map((t) => ({
    ...t,
    slots: [...t.slots].sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)),
    slot_count: t.slots.length,
    custom_count: t.slots.filter((s) => s.uses_uploaded).length,
  }));
}

function MailUploadModal({
  template,
  uploadingType,
  fileInputs,
  onClose,
  onFileChange,
  onTriggerFile,
}) {
  const overlayRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      className="mail-image-modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="mail-image-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mail-image-modal-title"
      >
        <header className="mail-image-modal__header">
          <div>
            <h3 id="mail-image-modal-title" className="mail-image-modal__title">
              {template.title}
            </h3>
          </div>
          <button
            type="button"
            className="mail-image-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="mail-image-modal__body">
          <p className="mail-image-modal__hint">
            Cada botón corresponde a una zona del correo. Sube la imagen con el tamaño indicado.
          </p>
          <ul className="mail-image-modal__slots">
            {template.slots.map((slot) => {
              const isUploading = uploadingType === slot.mail_type;
              const previewClass =
                slot.mail_type === 'welcome_hero'
                  ? ' mail-image-modal__preview-wrap--hero'
                  : slot.mail_type === 'welcome_promo'
                    ? ' mail-image-modal__preview-wrap--promo'
                    : '';

              return (
                <li key={slot.mail_type} className="mail-image-modal__slot">
                  <div className="mail-image-modal__slot-head">
                    <span className="mail-image-modal__slot-index">
                      Zona {slot.sort ?? '—'}
                    </span>
                    {slot.uses_uploaded ? (
                      <span className="mail-image-manager__tag mail-image-manager__tag--custom">
                        Personalizada
                      </span>
                    ) : (
                      <span className="mail-image-manager__tag">Predeterminada</span>
                    )}
                  </div>
                  <h4 className="mail-image-modal__area-label">{slot.area_label}</h4>
                  {slot.area_description ? (
                    <p className="mail-image-modal__area-desc">{slot.area_description}</p>
                  ) : null}
                  {slot.size_hint ? (
                    <p className="mail-image-modal__size-hint">
                      <strong>Tamaño:</strong> {slot.size_hint}
                    </p>
                  ) : null}
                  <div className={`mail-image-modal__preview-wrap${previewClass}`}>
                    <img
                      className="mail-image-modal__preview"
                      src={mailImagePreviewSrc(slot)}
                      alt={slot.area_label}
                    />
                  </div>
                  <input
                    ref={(el) => {
                      fileInputs.current[slot.mail_type] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="mail-image-manager__file-input"
                    onChange={(e) => onFileChange(slot.mail_type, e)}
                  />
                  <button
                    type="button"
                    className="mail-image-modal__upload-btn"
                    disabled={isUploading}
                    onClick={() => onTriggerFile(slot.mail_type)}
                  >
                    {isUploading ? (
                      <span className="mail-image-manager__spinner-wrap">
                        <span className="mail-image-manager__spinner mail-image-manager__spinner--dark" aria-hidden />
                        Subiendo…
                      </span>
                    ) : (
                      'Seleccionar imagen'
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="mail-image-modal__footer">
          <button type="button" className="mail-image-modal__done-btn" onClick={onClose}>
            Listo
          </button>
        </footer>
      </div>
    </div>
  );
}

function MailTemplateCard({ template, onOpenModal }) {
  const slotCount = template.slots.length;
  const customCount = template.custom_count ?? template.slots.filter((s) => s.uses_uploaded).length;

  return (
    <li className="mail-image-manager__card mail-image-manager__card--template">
      <div className="mail-image-manager__card-header">
        <span className="mail-image-manager__badge">{template.id}</span>
        <span className="mail-image-manager__tag">
          {slotCount} {slotCount === 1 ? 'zona' : 'zonas'}
        </span>
        {customCount > 0 ? (
          <span className="mail-image-manager__tag mail-image-manager__tag--custom">
            {customCount} personalizada{customCount !== 1 ? 's' : ''}
          </span>
        ) : null}
      </div>
      <h3 className="mail-image-manager__template-title">{template.title}</h3>

      <ul className="mail-image-manager__thumb-list" aria-label="Vista previa de zonas">
        {template.slots.map((slot) => (
          <li key={slot.mail_type} className="mail-image-manager__thumb-item">
            <span className="mail-image-manager__thumb-label">{slot.area_label}</span>
            <div className="mail-image-manager__thumb-wrap">
              <img src={mailImagePreviewSrc(slot)} alt="" />
            </div>
          </li>
        ))}
      </ul>

      <button type="button" className="mail-image-manager__btn" onClick={() => onOpenModal(template)}>
        Subir nueva imagen
      </button>
    </li>
  );
}

export default function MailImageManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingType, setUploadingType] = useState(null);
  const [openTemplate, setOpenTemplate] = useState(null);
  const fileInputs = useRef({});

  const load = async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/mail-images', {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json',
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudieron cargar las imágenes');
      }
      const list =
        data.templates?.length > 0
          ? data.templates
          : buildTemplatesFromConfigs(data.configs || []);
      setTemplates(list);
    } catch (e) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateSlotInTemplates = (mailType, patch) => {
    const apply = (t) => {
      const slots = t.slots.map((s) => (s.mail_type === mailType ? { ...s, ...patch } : s));
      return {
        ...t,
        slots,
        custom_count: slots.filter((s) => s.uses_uploaded).length,
      };
    };
    setTemplates((prev) => prev.map(apply));
    setOpenTemplate((prev) => (prev ? apply(prev) : prev));
  };

  const triggerFile = (mailType) => {
    fileInputs.current[mailType]?.click();
  };

  const onFileChange = async (mailType, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingType(mailType);
    setError('');
    try {
      const form = new FormData();
      form.append('mail_type', mailType);
      form.append('image', file);

      const res = await fetch('/api/admin/mail-images/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json',
        },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          'Error al subir';
        throw new Error(msg);
      }
      updateSlotInTemplates(mailType, {
        image_url: data.image_url,
        image_preview_path: data.image_preview_path ?? null,
        image_path: data.image_path,
        uses_uploaded: true,
      });
      if (window.showToast) {
        window.showToast(data.message || 'Imagen actualizada', 'success');
      }
    } catch (err) {
      setError(err.message || 'Error al subir');
      if (window.showToast) {
        window.showToast(err.message || 'Error al subir', 'error');
      }
    } finally {
      setUploadingType(null);
    }
  };

  if (loading) {
    return (
      <div className="mail-image-manager">
        <p className="mail-image-manager__loading">Cargando configuración…</p>
      </div>
    );
  }

  return (
    <div className="mail-image-manager">
      <h2 className="mail-image-manager__title">Imágenes de correos electrónicos</h2>
      <p className="mail-image-manager__intro">
        Cada tipo de correo tiene sus propias zonas de imagen. Pulsa <strong>Subir nueva imagen</strong>{' '}
        para abrir el panel y elegir qué zona del correo quieres actualizar.
      </p>
      {error ? <div className="mail-image-manager__error" role="alert">{error}</div> : null}

      <ul className="mail-image-manager__list">
        {templates.map((template) => (
          <MailTemplateCard
            key={template.id}
            template={template}
            onOpenModal={setOpenTemplate}
          />
        ))}
      </ul>

      {openTemplate ? (
        <MailUploadModal
          template={openTemplate}
          uploadingType={uploadingType}
          fileInputs={fileInputs}
          onClose={() => setOpenTemplate(null)}
          onFileChange={onFileChange}
          onTriggerFile={triggerFile}
        />
      ) : null}
    </div>
  );
}
