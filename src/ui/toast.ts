import { $ } from '../util';

const el = () => $('#toast');
let timer = 0;

export function showToast(text: string, ms = 2600) {
  const t = el();
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(timer);
  if (ms > 0) timer = window.setTimeout(hideToast, ms);
}

export function hideToast() {
  el().classList.remove('show');
}
