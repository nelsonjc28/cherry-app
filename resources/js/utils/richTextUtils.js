/**
 * Detecta si un HTML de editor (p. ej. TinyMCE) no tiene texto visible.
 */
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
