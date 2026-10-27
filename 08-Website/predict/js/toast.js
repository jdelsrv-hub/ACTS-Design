// Where the toast box sits. An open modal dialog makes everything outside it inert, Undo and Pin it included,
// so the toast goes inside the newest one, and back out when that one closes.
// Browsers without :modal throw on it; every dialog in this app opens as a modal, so there an open one counts.
const isModal = d => { try { return d.matches(':modal'); } catch { return true; } };
const hostNow = () => [...document.querySelectorAll('dialog[open]')].filter(isModal).at(-1) ?? document.body;

export function createToastBox(box) {
  let frame;
  const show = nodes => {
    cancelAnimationFrame(frame);
    const host = hostNow();
    const fill = () => {
      box.replaceChildren(...nodes);
      box.hidePopover?.(); // hide then show moves it above any dialog opened since
      box.showPopover?.();
    };
    if (box.parentNode === host) return fill();
    // A live region can miss the first text after it moves, so it moves empty and gets its text on the next frame.
    box.replaceChildren();
    host.append(box);
    frame = requestAnimationFrame(fill);
  };
  // 'close' doesn't bubble, so it's caught on the way down.
  document.addEventListener('close', e => { if (e.target === box.parentNode && box.firstChild) show([...box.childNodes]); }, true);
  return { show, hide() { cancelAnimationFrame(frame); box.replaceChildren(); } };
}
