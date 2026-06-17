const valid = (v) => typeof v === 'number' && Number.isFinite(v);

// Flatten coupons into one marker per address (endereco) with usable coords.
// Falls back to a coupon's top-level lat/lng when no address has coords.
export function buildMarkers(cupoms) {
  const out = [];
  for (const cupom of cupoms) {
    const pts = (cupom.endereco || [])
      .map((e) => ({ lat: e.latitude, lng: e.longitude }))
      .filter((p) => valid(p.lat) && valid(p.lng));

    const used = pts.length
      ? pts
      : valid(cupom.lat) && valid(cupom.lng)
        ? [{ lat: cupom.lat, lng: cupom.lng }]
        : [];

    used.forEach((p, i) => {
      out.push({ cupom, lat: p.lat, lng: p.lng, key: `${cupom.id}-${i}` });
    });
  }
  return out;
}
