import L from 'leaflet';

// Inline styles so we don't depend on Tailwind reaching into Leaflet's DOM.
const RING = '#dc2626';        // --color-primary
const SURFACE = '#ffffff';     // --color-surface

// Escape HTML-attribute-sensitive characters to prevent markup/handler injection.
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\\/g, '&#92;');
}

function pinHtml(cupom) {
  const letter = esc((cupom.nome || '?').trim().charAt(0).toUpperCase());
  const img = cupom.logo
    ? `<img src="${esc(cupom.logo)}" alt="" loading="lazy"
         style="width:100%;height:100%;object-fit:cover;border-radius:50%"
         onerror="this.replaceWith(Object.assign(document.createElement('div'),{
           textContent:'${letter}',
           style:'width:100%;height:100%;display:grid;place-items:center;border-radius:50%;background:${RING};color:#fff;font-weight:700;font-family:Karla,sans-serif'
         }))" />`
    : `<div style="width:100%;height:100%;display:grid;place-items:center;border-radius:50%;background:${RING};color:#fff;font-weight:700">${letter}</div>`;

  return `
    <div style="position:relative;width:42px;height:42px">
      <div style="width:42px;height:42px;border-radius:50%;background:${SURFACE};
        border:3px solid ${RING};box-shadow:0 2px 6px rgba(59,26,26,.35);
        overflow:hidden">${img}</div>
      <div style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);
        width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
        border-top:8px solid ${RING}"></div>
    </div>`;
}

export function logoDivIcon(cupom) {
  return L.divIcon({
    html: pinHtml(cupom),
    className: '',          // suppress Leaflet's default white box
    iconSize: [42, 50],
    iconAnchor: [21, 50],   // tip of the pointer
    popupAnchor: [0, -50],
  });
}

export function clusterIcon(cluster) {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;
      background:${RING};color:#fff;display:grid;place-items:center;
      font-weight:700;font-family:Karla,sans-serif;border:3px solid ${SURFACE};
      box-shadow:0 2px 6px rgba(59,26,26,.35)">${count}</div>`,
    className: '',
    iconSize: [40, 40],
  });
}
