import { useState, useEffect, useRef } from 'react';
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

export default function MailImageManager() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingType, setUploadingType] = useState(null);
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
      setConfigs(data.configs || []);
    } catch (e) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      setConfigs((prev) =>
        prev.map((c) =>
          c.mail_type === mailType
            ? {
                ...c,
                image_url: data.image_url,
                image_preview_path: data.image_preview_path ?? null,
                image_path: data.image_path,
                uses_uploaded: true,
              }
            : c
        )
      );
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
        Cabeceras y banners de los correos automáticos. Se guardan en{' '}
        <code>public/mail-assets</code> (URL <code>/mail-assets/…</code>). Si subiste imágenes antes del cambio,
        también se leen desde <code>storage/app/public/mail-assets</code> hasta que vuelvas a subir.
      </p>
      {error ? <div className="mail-image-manager__error" role="alert">{error}</div> : null}

      <ul className="mail-image-manager__list">
        {configs.map((row) => (
          <li key={row.mail_type} className="mail-image-manager__card">
            <div className="mail-image-manager__card-header">
              <span className="mail-image-manager__badge">{row.mail_type}</span>
              {row.uses_uploaded ? (
                <span className="mail-image-manager__tag mail-image-manager__tag--custom">Personalizada</span>
              ) : (
                <span className="mail-image-manager__tag">Predeterminada</span>
              )}
            </div>
            <p className="mail-image-manager__label">{row.label}</p>
            <div className="mail-image-manager__preview-wrap">
              <img
                className="mail-image-manager__preview"
                src={mailImagePreviewSrc(row)}
                alt={`Vista previa ${row.mail_type}`}
              />
            </div>
            <input
              ref={(el) => {
                fileInputs.current[row.mail_type] = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mail-image-manager__file-input"
              onChange={(e) => onFileChange(row.mail_type, e)}
            />
            <button
              type="button"
              className="mail-image-manager__btn"
              disabled={uploadingType === row.mail_type}
              onClick={() => triggerFile(row.mail_type)}
            >
              {uploadingType === row.mail_type ? (
                <span className="mail-image-manager__spinner-wrap">
                  <span className="mail-image-manager__spinner" aria-hidden />
                  Subiendo…
                </span>
              ) : (
                'Subir nueva imagen'
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
