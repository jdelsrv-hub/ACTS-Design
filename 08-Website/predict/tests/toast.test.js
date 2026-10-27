import { test, eq, ok } from './harness.js';
import { createToastBox } from '../js/toast.js';

// A toast box and one open modal dialog on the page, as in index.html; runs fn, then removes both.
async function withToast(fn) {
  const box = Object.assign(document.createElement('div'), { id: 'test-toast', role: 'status' });
  box.setAttribute('popover', 'manual');
  const dialog = document.createElement('dialog');
  document.body.append(box, dialog);
  // Frames are paused in a hidden or unpainted tab, so they are stood in for by timers: what's tested is the order, not the painting.
  const { requestAnimationFrame: raf, cancelAnimationFrame: caf } = window;
  window.requestAnimationFrame = cb => setTimeout(cb, 10);
  window.cancelAnimationFrame = id => clearTimeout(id);
  const frame = () => new Promise(done => setTimeout(done, 40));
  // close() queues its 'close' event on a task a hidden tab can starve, so it is also sent by hand; the real one then finds nothing to do.
  const close = async d => { d.close(); d.dispatchEvent(new Event('close')); await frame(); };
  const toast = createToastBox(box);
  try { await fn({ box, dialog, toast, frame, close }); } finally { toast.hide(); dialog.close(); box.remove(); dialog.remove(); window.requestAnimationFrame = raf; window.cancelAnimationFrame = caf; }
}

test('a toast shown inside an open modal dialog is still on the page after the dialog closes', () => withToast(async ({ box, dialog, toast, frame, close }) => {
  dialog.showModal();
  toast.show(['Pinned "hello"']);
  await frame();
  eq(box.parentNode, dialog, 'inside the dialog while it is open');
  eq(box.textContent, 'Pinned "hello"');
  await close(dialog);
  eq(box.parentNode, document.body, 'back on the page');
  eq(box.textContent, 'Pinned "hello"', 'the message is kept');
  ok(box.checkVisibility(), 'and visible');
}));

test('when one dialog closes over another, the toast goes to the one still open', () => withToast(async ({ box, dialog, toast, frame, close }) => {
  const top = document.createElement('dialog');
  document.body.append(top);
  dialog.showModal();
  top.showModal();
  toast.show(['Removed']);
  await frame();
  eq(box.parentNode, top);
  await close(top);
  eq(box.parentNode, dialog);
  top.remove();
}));

test('a toast hidden before its dialog closes stays empty', () => withToast(async ({ box, dialog, toast, frame, close }) => {
  dialog.showModal();
  toast.show(['One']);
  await frame();
  toast.hide();
  await close(dialog);
  eq(box.textContent, '');
}));

test('toast does not throw where :modal is not supported, and still goes in the open dialog', () => withToast(async ({ box, dialog, toast, frame, close }) => {
  dialog.showModal();
  const matches = Element.prototype.matches;
  Element.prototype.matches = function (selector) {
    if (selector === ':modal') throw new SyntaxError("':modal' is not a valid selector");
    return matches.call(this, selector);
  };
  try {
    toast.show(['Hello']);
    await frame();
  } finally { Element.prototype.matches = matches; }
  eq(box.textContent, 'Hello');
  eq(box.parentNode, dialog, 'such browsers only open dialogs as modals');
}));

test('a toast moved to a new host gets its text on a later frame, and hide cancels that', () => withToast(async ({ box, dialog, toast, frame, close }) => {
  dialog.showModal();
  toast.show(['Hello']);
  eq(box.textContent, '', 'empty at the moment it moves, so the live region announces the text when it arrives');
  await frame();
  eq(box.textContent, 'Hello');
  await close(dialog);
  dialog.showModal();
  toast.show(['Again']); // moves again, so its text is waiting
  toast.hide();
  await frame();
  eq(box.textContent, '', 'hide wins over a text still waiting');
}));
