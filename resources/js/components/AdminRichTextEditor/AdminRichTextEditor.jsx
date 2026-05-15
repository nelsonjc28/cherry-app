import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

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
 * Misma configuración TinyMCE que el campo "Contenido" en Gestión de términos y condiciones.
 */
const AdminRichTextEditor = ({ value, onChange, height = 500 }) => (
  <Editor
    apiKey="uhtywi0yqpomfyb0hr8tkly5wd3qg1b2j856pe4wz4f3zh1q"
    value={value ?? ''}
    onEditorChange={(newValue) => onChange?.(newValue)}
    init={{
      ...DEFAULT_INIT,
      height,
    }}
  />
);

export default AdminRichTextEditor;
