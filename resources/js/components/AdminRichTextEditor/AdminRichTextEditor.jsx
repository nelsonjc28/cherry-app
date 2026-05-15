import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

/**
 * TinyMCE self-hosted (OSS): sin API key de Tiny Cloud = no validación de dominio ni mensaje
 * "This domain is not registered in the TinyMCE Customer Portal".
 *
 * Por defecto se cargan los archivos del paquete npm publicados en jsDelivr.
 * Para CSP estricto o offline: copia `node_modules/tinymce` a `public/tinymce` y define en .env:
 * VITE_TINYMCE_BASE_URL=/tinymce
 */
const tinymceBaseUrl = () => {
  const fromEnv =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TINYMCE_BASE_URL
      ? String(import.meta.env.VITE_TINYMCE_BASE_URL).trim()
      : '';
  const base = (fromEnv || 'https://cdn.jsdelivr.net/npm/tinymce@6.8.5').replace(/\/$/, '');

  return base;
};

const DEFAULT_INIT = {
  menubar: false,
  plugins: [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
  ],
  toolbar:
    'undo redo | blocks | '
    + 'bold italic forecolor | alignleft aligncenter '
    + 'alignright alignjustify | bullist numlist outdent indent | '
    + 'removeformat | help',
  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
  language: 'es',
  /** Se resuelve contra `base_url` al montar (self-hosted). */
  language_url: 'langs/es.js',
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
  paste_auto_cleanup_on_paste: true,
};

/**
 * Editor enriquecido admin (misma barra/plugins que términos y bienvenida).
 * Self-hosted: no usar apiKey de Tiny Cloud.
 */
const AdminRichTextEditor = ({ value, onChange, height = 500 }) => {
  const base = tinymceBaseUrl();

  return (
    <Editor
      tinymceScriptSrc={`${base}/tinymce.min.js`}
      value={value ?? ''}
      onEditorChange={(newValue) => onChange?.(newValue)}
      init={{
        base_url: base,
        suffix: '.min',
        ...DEFAULT_INIT,
        height,
      }}
    />
  );
};

export default AdminRichTextEditor;
