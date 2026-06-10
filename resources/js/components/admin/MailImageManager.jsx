import { useState, useEffect, useRef, useCallback } from 'react';
import './MailImageManager.css';

const getToken = () => localStorage.getItem('token');

/** Correos con hero + promo: subida por modal (misma UX que bienvenida). */
const MULTI_ZONE_TEMPLATE_IDS = new Set(['welcome', 'abandoned_cart']);

function usesModalUpload(template) {
  return MULTI_ZONE_TEMPLATE_IDS.has(template.id);
}

function getSlotPreviewModifier(mailType) {
  if (mailType.endsWith('_hero')) {
    return 'hero';
  }
  if (mailType.endsWith('_promo')) {
    return 'promo';
  }
  return '';
}

/** Vista previa: mismo host/puerto que el admin (evita APP_URL en :8000 con pestaña en :8001). */
function mailImagePreviewSrc(row) {
  const path =
    row.image_preview_path ||
    (row.image_url && /^https?:\/\//i.test(row.image_url)
      ? (() => {
          try {
            return new URL(row.image_url).pathname;
          } catch {
            return null;
          }
        })()
      : null);

  if (path) {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${p}`;
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

function MailImageLinkField({ slot, saving, onSave }) {
  const [value, setValue] = useState(slot.click_url || '');

  useEffect(() => {
    setValue(slot.click_url || '');
  }, [slot.mail_type, slot.click_url]);

  const trimmed = value.trim();
  const saved = (slot.click_url || '') === trimmed;
  const canSave = !saving && !saved;

  return (
    <div className="mail-image-manager__link-field">
      <label className="mail-image-manager__link-label" htmlFor={`click-url-${slot.mail_type}`}>
        Enlace al hacer clic
      </label>
      <p className="mail-image-manager__link-hint">
        URL completa (https://…). Si la dejas vacía, la imagen no será clicable.
      </p>
      <div className="mail-image-manager__link-row">
        <input
          id={`click-url-${slot.mail_type}`}
          type="url"
          className="mail-image-manager__link-input"
          placeholder="https://tutienda.com/promociones"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
        />
        <button
          type="button"
          className="mail-image-manager__link-save"
          disabled={!canSave}
          onClick={() => onSave(slot.mail_type, trimmed)}
        >
          {saving ? 'Guardando…' : 'Guardar enlace'}
        </button>
      </div>
      {slot.click_url ? (
        <p className="mail-image-manager__link-active">
          Enlace activo:{' '}
          <a href={slot.click_url} target="_blank" rel="noopener noreferrer">
            {slot.click_url}
          </a>
        </p>
      ) : null}
    </div>
  );
}

function MailUploadModal({
  template,
  uploadingType,
  savingLinkType,
  fileInputs,
  onClose,
  onFileChange,
  onTriggerFile,
  onSaveClickUrl,
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
            {template.description ? (
              <p className="mail-image-modal__subtitle">{template.description}</p>
            ) : null}
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
              const modifier = getSlotPreviewModifier(slot.mail_type);
              const previewClass = modifier
                ? ` mail-image-modal__preview-wrap--${modifier}`
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
                  <MailImageLinkField
                    slot={slot}
                    saving={savingLinkType === slot.mail_type}
                    onSave={onSaveClickUrl}
                  />
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

/** Bienvenida y carrito abandonado: tarjeta + modal con varias zonas. */
function MultiZoneTemplateCard({ template, onOpenModal }) {
  const slotCount = template.slots.length;
  const customCount = template.custom_count ?? template.slots.filter((s) => s.uses_uploaded).length;

  return (
    <li className="mail-image-manager__card">
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
      {template.description ? (
        <p className="mail-image-manager__template-desc">{template.description}</p>
      ) : null}

      <ul
        className="mail-image-manager__thumb-list mail-image-manager__thumb-list--multi"
        aria-label="Vista previa de zonas"
      >
        {template.slots.map((slot) => {
          const modifier = getSlotPreviewModifier(slot.mail_type);
          const thumbWrapClass = modifier
            ? `mail-image-manager__thumb-wrap mail-image-manager__thumb-wrap--${modifier}`
            : 'mail-image-manager__thumb-wrap';

          return (
            <li key={slot.mail_type} className="mail-image-manager__thumb-item">
              <span className="mail-image-manager__thumb-label">{slot.area_label}</span>
              <div className={thumbWrapClass}>
                <img src={mailImagePreviewSrc(slot)} alt="" />
              </div>
            </li>
          );
        })}
      </ul>

      <button type="button" className="mail-image-manager__btn" onClick={() => onOpenModal(template)}>
        Subir nueva imagen
      </button>
    </li>
  );
}

/** Otros correos (una sola imagen): subida directa en la tarjeta. */
function SingleZoneTemplateCard({
  template,
  uploadingType,
  savingLinkType,
  fileInputs,
  onFileChange,
  onTriggerFile,
  onSaveClickUrl,
}) {
  const slot = template.slots[0];
  if (!slot) return null;

  const isUploading = uploadingType === slot.mail_type;

  return (
    <li className="mail-image-manager__card">
      <div className="mail-image-manager__card-header">
        <span className="mail-image-manager__badge">{template.id}</span>
        {slot.uses_uploaded ? (
          <span className="mail-image-manager__tag mail-image-manager__tag--custom">Personalizada</span>
        ) : (
          <span className="mail-image-manager__tag">Predeterminada</span>
        )}
      </div>
      <h3 className="mail-image-manager__template-title">{template.title}</h3>
      {template.description ? (
        <p className="mail-image-manager__template-desc">{template.description}</p>
      ) : null}
      <p className="mail-image-manager__label">{slot.area_label}</p>
      {slot.size_hint ? (
        <p className="mail-image-manager__size-hint">
          <strong>Tamaño:</strong> {slot.size_hint}
        </p>
      ) : null}
      <div className="mail-image-manager__preview-wrap">
        <img
          className="mail-image-manager__preview"
          src={mailImagePreviewSrc(slot)}
          alt={`Vista previa ${slot.mail_type}`}
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
        className="mail-image-manager__btn"
        disabled={isUploading}
        onClick={() => onTriggerFile(slot.mail_type)}
      >
        {isUploading ? (
          <span className="mail-image-manager__spinner-wrap">
            <span className="mail-image-manager__spinner" aria-hidden />
            Subiendo…
          </span>
        ) : (
          'Subir nueva imagen'
        )}
      </button>
      <MailImageLinkField
        slot={slot}
        saving={savingLinkType === slot.mail_type}
        onSave={onSaveClickUrl}
      />
    </li>
  );
}

export default function MailImageManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingType, setUploadingType] = useState(null);
  const [savingLinkType, setSavingLinkType] = useState(null);
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

  const onSaveClickUrl = async (mailType, clickUrl) => {
    setSavingLinkType(mailType);
    setError('');
    try {
      const res = await fetch('/api/admin/mail-images/click-url', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mail_type: mailType,
          click_url: clickUrl || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          'Error al guardar enlace';
        throw new Error(msg);
      }
      updateSlotInTemplates(mailType, {
        click_url: data.click_url ?? null,
      });
      if (window.showToast) {
        window.showToast(data.message || 'Enlace guardado', 'success');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar enlace');
      if (window.showToast) {
        window.showToast(err.message || 'Error al guardar enlace', 'error');
      }
    } finally {
      setSavingLinkType(null);
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
        Cada tarjeta es un tipo de correo. Sube la imagen y configura el enlace al hacer clic. En{' '}
        <strong>Bienvenida</strong> y <strong>Carrito abandonado</strong>,{' '}
        <strong>Subir nueva imagen</strong> abre el panel para hero y banner promocional.
      </p>
      {error ? <div className="mail-image-manager__error" role="alert">{error}</div> : null}

      <ul className="mail-image-manager__list">
        {templates.map((template) =>
          usesModalUpload(template) ? (
            <MultiZoneTemplateCard
              key={template.id}
              template={template}
              onOpenModal={setOpenTemplate}
            />
          ) : (
            <SingleZoneTemplateCard
              key={template.id}
              template={template}
              uploadingType={uploadingType}
              savingLinkType={savingLinkType}
              fileInputs={fileInputs}
              onFileChange={onFileChange}
              onTriggerFile={triggerFile}
              onSaveClickUrl={onSaveClickUrl}
            />
          )
        )}
      </ul>

      {openTemplate && usesModalUpload(openTemplate) ? (
        <MailUploadModal
          template={openTemplate}
          uploadingType={uploadingType}
          savingLinkType={savingLinkType}
          fileInputs={fileInputs}
          onClose={() => setOpenTemplate(null)}
          onFileChange={onFileChange}
          onTriggerFile={triggerFile}
          onSaveClickUrl={onSaveClickUrl}
        />
      ) : null}
    </div>
  );
}
