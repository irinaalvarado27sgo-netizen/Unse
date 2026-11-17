// src/ui/dom.js

export function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} no encontrado en el DOM`);
  return el;
}

export function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Asigna el valor a un <input> solo si cambió (evita saltos de cursor y trabajo inútil). */
export function setInputValue(el, value) {
  if (parseFloat(el.value) !== value) el.value = value;
}
