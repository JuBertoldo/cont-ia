/**
 * Geocodificação reversa via OpenStreetMap Nominatim (gratuito, sem chave de API).
 * Converte coordenadas em nome do local legível.
 */

const cache = new Map();

export async function reverseGeocode(latitude, longitude) {
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

  if (cache.has(key)) return cache.get(key);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=pt-BR`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ContIA-App/1.0' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};

    const parts = [
      addr.road || addr.pedestrian || addr.footway,
      addr.suburb || addr.neighbourhood || addr.quarter,
      addr.city || addr.town || addr.village || addr.county,
      addr.state,
    ].filter(Boolean);

    const label =
      parts.length > 0 ? parts.join(', ') : data.display_name || null;

    cache.set(key, label);
    return label;
  } catch {
    return null;
  }
}
