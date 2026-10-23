// Small DOM helpers shared by every tool. No framework: h() builds elements, icon() draws a sprite icon.

const SPRITE = new URL('../../img/icons.svg', import.meta.url).href;

/**
 * Create an element.
 *   h('button', { class: 'btn btn-purple', onclick: fn, disabled: true }, 'Save')
 * props: class/className, style (string or object), dataset (object), html (innerHTML, trusted only),
 *        on<event> (function), boolean attributes (true/false), anything else becomes an attribute.
 * children: strings, numbers, nodes, arrays, null/undefined/false (skipped).
 */
export function h(tag, props, ...children) {
  const svgTags = new Set(['svg', 'use', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'text', 'tspan', 'defs', 'clipPath', 'mask']);
  const el = svgTags.has(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class' || key === 'className') el.setAttribute('class', Array.isArray(value) ? value.filter(Boolean).join(' ') : value);
      else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'html') el.innerHTML = value;
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'value' && 'value' in el) el.value = value;
      else if (key === 'checked' && 'checked' in el) el.checked = !!value;
      else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** An icon from the shared sprite (public/assets/img/icons.svg), e.g. icon('download'). */
export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', ('ico ' + cls).trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `${SPRITE}#i-${name}`);
  svg.append(use);
  return svg;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Wait for the next animation frame (lets the browser paint progress before heavy work). */
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/** Yield to the event loop so long loops stay responsive. */
export const yieldToBrowser = () => new Promise((r) => setTimeout(r, 0));

let uid = 0;
export const uniqueId = (prefix = 'id') => `${prefix}-${++uid}`;
