import { ItineraryPoint } from './parser';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LATLNG_RE = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

async function search(q: string, near?: { lat: number; lng: number }) {
  const params = new URLSearchParams({ q, format: 'json', limit: '1' });
  if (near) {
    // Soft bias toward the previous stop so ambiguous names (e.g. "Rest Area KM 72") resolve nearby.
    const d = 1.5;
    params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  const data = await res.json();
  return data?.[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}

/** Geocodes via Nominatim at <=1 req/sec. Accepts "lat,lng" literals as manual overrides. */
export async function geocodePoints(
  points: ItineraryPoint[],
  regionHint: string,
  onProgress?: (done: number, total: number) => void
): Promise<ItineraryPoint[]> {
  const result: ItineraryPoint[] = [];
  const cache = new Map<string, { lat: number; lng: number } | null>();

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    onProgress?.(i, points.length);
    const prev = result[result.length - 1];
    const key = point.locationName.trim().toLowerCase();

    if (point.lat !== undefined && point.lng !== undefined) {
      result.push(point);
      continue;
    }

    const literal = point.locationName.match(LATLNG_RE);
    if (literal) {
      result.push({ ...point, lat: parseFloat(literal[1]), lng: parseFloat(literal[2]) });
      continue;
    }

    if (cache.has(key) || (point.isRest && prev)) {
      const hit = cache.get(key) ?? (prev?.lat !== undefined ? { lat: prev.lat, lng: prev.lng! } : null);
      result.push({ ...point, ...(hit ?? {}) });
      continue;
    }

    const near = prev?.lat !== undefined ? { lat: prev.lat, lng: prev.lng! } : undefined;
    let hit: { lat: number; lng: number } | null = null;
    try {
      const queries = [regionHint ? `${point.locationName}, ${regionHint}` : point.locationName, point.locationName];
      // Also try progressively shorter names: "Shuttle Binus Kemanggisan Jackal Holidays" -> "Binus Kemanggisan"
      const words = point.locationName.split(' ');
      for (let n = words.length - 1; n >= 2; n--) {
        for (let s = 0; s + n <= words.length; s++) queries.push(words.slice(s, s + n).join(' '));
      }
      for (const q of [...new Set(queries)].slice(0, 6)) {
        await sleep(1100);
        hit = await search(q, near);
        if (hit) break;
      }
    } catch (err) {
      console.error('Geocode error', point.locationName, err);
    }
    cache.set(key, hit);
    result.push({ ...point, ...(hit ?? {}) });
  }
  onProgress?.(points.length, points.length);
  return result;
}
