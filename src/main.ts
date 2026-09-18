import './ui/style.css';
import { fleet } from './fleet';

/**
 * Routes: `/` fleet index, `/ship/:id` viewer, `/compare?a=&b=`. Links are plain anchors,
 * so each route boots on a fresh page and nothing needs tearing down.
 */
async function route() {
  const app = document.getElementById('app')!;
  const path = location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/' && redirectLegacy()) return;

  const ship = path.match(/^\/ship\/([^/]+)$/);
  if (ship) {
    const id = decodeURIComponent(ship[1]);
    if (!fleet().has(id)) return notFound(app, `No ship called “${id}”.`);
    document.body.dataset.view = 'viewer';
    const { mountViewer } = await import('./views/viewer');
    return mountViewer(app, id);
  }
  if (path === '/compare') {
    document.body.dataset.view = 'compare';
    const { mountCompare } = await import('./views/compare');
    return mountCompare(app);
  }
  if (path === '/') {
    document.body.dataset.view = 'fleet';
    const { mountFleet } = await import('./views/fleet');
    return mountFleet(app);
  }
  notFound(app, 'Nothing at this address.');
}

/** Links from before the router: /#ship=bcf-4&room=OPS-01 → /ship/bcf-4#room=OPS-01 */
function redirectLegacy(): boolean {
  const legacy = new URLSearchParams(location.hash.slice(1));
  const ship = legacy.get('ship');
  if (!ship) return false;
  legacy.delete('ship');
  const rest = legacy.toString();
  location.replace(`/ship/${encodeURIComponent(ship)}${rest ? '#' + rest : ''}`);
  return true;
}
addEventListener('hashchange', () => { if (location.pathname === '/') redirectLegacy(); });

function notFound(app: HTMLElement, msg: string) {
  document.body.dataset.view = 'fleet';
  app.innerHTML = `<div class="notfound"><div class="shipname">404</div><p>${msg}</p><a class="navback" href="/">◂ Back to the fleet</a></div>`;
}

route().catch(err => {
  console.error(err);
  const el = document.getElementById('loadingText');
  if (el) { el.textContent = String(err.message ?? err); el.style.color = '#ff5c7a'; }
});
