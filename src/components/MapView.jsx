// src/components/MapView.jsx
import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroupImport from 'react-leaflet-cluster';
// react-leaflet-cluster ships CJS (exports.default); Vite's dev pre-bundle
// hands it back as { default: Component }, prod hands back the Component.
// Unwrap so both paths get the actual component.
const MarkerClusterGroup = MarkerClusterGroupImport.default ?? MarkerClusterGroupImport;
import 'leaflet/dist/leaflet.css';
import { buildMarkers } from '../lib/markers.js';
import { logoDivIcon, clusterIcon } from './mapIcon.js';

const POA_CENTER = [-30.0346, -51.2177];

// Pan/zoom to fit the current markers whenever they change.
function FitBounds({ markers }) {
  const map = useMap();
  useMemo(() => {
    if (!markers.length) return;
    const bounds = markers.map((m) => [m.lat, m.lng]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [markers, map]);
  return null;
}

export default function MapView({ cupoms, onOpen }) {
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
        <FitBounds markers={markers} />
        <MarkerClusterGroup iconCreateFunction={clusterIcon} showCoverageOnHover={false}>
          {markers.map((m) => (
            <Marker key={m.key} position={[m.lat, m.lng]} icon={logoDivIcon(m.cupom)}>
              <Popup>
                <div style={{ width: 200, fontFamily: 'Karla, sans-serif' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {m.cupom.logo && (
                      <img
                        src={m.cupom.logo}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <strong style={{ color: '#3b1a1a', fontSize: 14 }}>{m.cupom.nome}</strong>
                  </div>
                  <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 13, marginTop: 6 }}>
                    {m.cupom.beneficio}
                  </div>
                  {m.cupom.endereco?.[0]?.bairro && (
                    <div style={{ color: '#8a6f6f', fontSize: 12, marginTop: 2 }}>
                      {m.cupom.endereco[0].bairro}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpen(m.cupom)}
                    style={{
                      marginTop: 8, width: '100%', padding: '7px 0', border: 'none',
                      borderRadius: 9, background: '#dc2626', color: '#fff',
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'Karla, sans-serif',
                    }}
                  >
                    Ver cupom
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
