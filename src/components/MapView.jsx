// src/components/MapView.jsx
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroupImport from 'react-leaflet-cluster';
// react-leaflet-cluster ships CJS (exports.default); Vite's dev pre-bundle
// hands it back as { default: Component }, prod hands back the Component.
// Unwrap so both paths get the actual component.
const MarkerClusterGroup = MarkerClusterGroupImport.default ?? MarkerClusterGroupImport;
import 'leaflet/dist/leaflet.css';
import { buildMarkers } from '../lib/markers.js';
import { regraResumo } from '../lib/regra.js';
import { isOpenAt } from '../lib/schedule.js';
import { logoDivIcon, clusterIcon } from './mapIcon.js';

const POA_CENTER = [-30.0346, -51.2177];

// Fit the map to the markers ONCE on first load. Filtering afterwards must not
// move the map (it was zooming back out on every filter change).
function FitBoundsOnce({ markers }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !markers.length) return;
    done.current = true;
    map.fitBounds(markers.map((m) => [m.lat, m.lng]), { padding: [48, 48], maxZoom: 15 });
  }, [markers, map]);
  return null;
}

function MarkerPopup({ cupom, now, onOpen }) {
  const openNow = isOpenAt(cupom, now.day, now.minutes);

  return (
    <div className="w-[200px] font-sans">
      <div className="flex items-center gap-2">
        {cupom.logo && (
          <img
            src={cupom.logo}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <strong className="text-[14px] text-fg">{cupom.nome}</strong>
      </div>
      {regraResumo(cupom.regra) && (
        <p className="mt-0.5 text-[12px] text-fg-muted">{regraResumo(cupom.regra)}</p>
      )}
      <div
        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${
          openNow ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
        }`}
      >
        <span
          className={`h-[7px] w-[7px] rounded-full ${
            openNow ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
          }`}
        />
        {openNow ? 'Aberto' : 'Fechado'}
      </div>
      <button
        type="button"
        onClick={() => onOpen(cupom)}
        className="mt-2 w-full rounded-[9px] bg-primary py-[7px] font-bold text-white"
      >
        Ver cupom
      </button>
    </div>
  );
}

export default function MapView({ cupoms, now, onOpen }) {
  const markers = useMemo(() => buildMarkers(cupoms), [cupoms]);

  return (
    <div className="min-h-0 flex-1 h-[70dvh] md:h-auto">
      <MapContainer
        center={POA_CENTER}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <FitBoundsOnce markers={markers} />
        <MarkerClusterGroup
          iconCreateFunction={clusterIcon}
          showCoverageOnHover={false}
          maxClusterRadius={40}
        >
          {markers.map((m) => (
            <Marker key={m.key} position={[m.lat, m.lng]} icon={logoDivIcon(m.cupom)}>
              <Popup>
                <MarkerPopup cupom={m.cupom} now={now} onOpen={onOpen} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
