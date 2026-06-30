/**
 * Detecta si un HTML de editor (p. ej. TinyMCE) no tiene texto visible.
 */
/**
 * Extrae texto plano de HTML (p. ej. para toasts o confirmaciones).
 */
export function getRichTextPlainText(html) {
  if (html == null || html === '') {
    return '';
  }
  try {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');

    return (doc.body.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export function isRichTextBodyEmpty(html) {
  if (html == null || html === '') {
    return true;
  }
  try {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const text = (doc.body.textContent || '').replace(/\u00a0/g, ' ').trim();

    return text.length === 0;
  } catch {
    return true;
  }
}
