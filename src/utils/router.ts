import * as turf from '@turf/turf';
import { TravelMethod, TRAVEL_METHODS } from './config';

type Coord = [number, number]; // [lng, lat]

const osrmProfile = (m: TravelMethod) => (m === 'walk' ? 'foot' : 'driving');

/** Builds the path geometry for one leg using free OSRM routing, or a great-circle arc for non-road travel. */
export async function buildLeg(from: Coord, to: Coord, method: TravelMethod): Promise<Coord[]> {
  if (from[0] === to[0] && from[1] === to[1]) return [from, to];

  if (!TRAVEL_METHODS[method].road) {
    if (method === 'plane') return planeArc(from, to);
    const gc = turf.greatCircle(turf.point(from), turf.point(to), { npoints: 64 });
    return gc.geometry.type === 'LineString' ? (gc.geometry.coordinates as Coord[]) : [from, to];
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile(method)}/${from.join(',')};${to.join(',')}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates as Coord[] | undefined;
    if (coords && coords.length > 1) return coords;
  } catch (e) {
    console.warn('OSRM routing failed, using straight line', e);
  }
  return [from, to];
}

/** A visibly bowed arc so flights look like flights even on short hops. */
function planeArc(from: Coord, to: Coord): Coord[] {
  const n = 80;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const bow = 0.25;
  const out: Coord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const h = Math.sin(Math.PI * t) * bow;
    out.push([from[0] + dx * t - dy * h, from[1] + dy * t + dx * h]);
  }
  return out;
}
