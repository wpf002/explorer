/**
 * Under 900 px the two side panels become bottom sheets behind a two-button tab bar.
 * Above it this does nothing and the panels keep their desktop toggles.
 */
const mobile = () => matchMedia('(max-width: 900px)').matches;

export function bindSheets(labels: [string, string]) {
  const nav = document.createElement('nav');
  nav.id = 'sheetTabs';
  nav.setAttribute('aria-label', 'Panels');
  nav.innerHTML = `<button data-sheet="left">${labels[0]}</button><button data-sheet="right">${labels[1]}</button>`;
  document.getElementById('app')!.appendChild(nav);
  nav.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!b) return;
    const id = b.dataset.sheet as 'left' | 'right';
    openSheet(document.getElementById(id)!.classList.contains('sheet-open') ? null : id);
  });
  document.getElementById('gl')?.addEventListener('pointerdown', () => { if (mobile()) openSheet(null); });
}

export function openSheet(which: 'left' | 'right' | null) {
  for (const id of ['left', 'right'] as const) {
    document.getElementById(id)?.classList.toggle('sheet-open', id === which);
    document.querySelector(`#sheetTabs [data-sheet="${id}"]`)?.classList.toggle('on', id === which);
  }
}

/** Show a panel's sheet only when the sheets are in use. */
export const revealOnMobile = (which: 'left' | 'right') => { if (mobile()) openSheet(which); };
