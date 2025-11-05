/**
 * Simple geohash encoder for Deno (no external dependencies)
 * Based on: https://github.com/davetroy/geohash-js
 *
 * Geohash precision levels:
 * - 1: ±2500 km
 * - 2: ±630 km
 * - 3: ±78 km
 * - 4: ±20 km
 * - 5: ±2.4 km (4.9 km²) ← Used for caching
 * - 6: ±0.61 km
 * - 7: ±0.076 km
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encode(latitude: number, longitude: number, precision: number = 5): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      // longitude
      const lonMid = (lonMin + lonMax) / 2;
      if (longitude > lonMid) {
        idx = (idx << 1) + 1;
        lonMin = lonMid;
      } else {
        idx = idx << 1;
        lonMax = lonMid;
      }
    } else {
      // latitude
      const latMid = (latMin + latMax) / 2;
      if (latitude > latMid) {
        idx = (idx << 1) + 1;
        latMin = latMid;
      } else {
        idx = idx << 1;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

/**
 * Decode geohash to lat/lng bounds
 */
export function decode(geohash: string): {
  latitude: [number, number];
  longitude: [number, number];
} {
  let evenBit = true;
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  for (let i = 0; i < geohash.length; i++) {
    const chr = geohash.charAt(i);
    const idx = BASE32.indexOf(chr);

    if (idx === -1) {
      throw new Error('Invalid geohash');
    }

    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;

      if (evenBit) {
        // longitude
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        // latitude
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }
      evenBit = !evenBit;
    }
  }

  return {
    latitude: [latMin, latMax],
    longitude: [lonMin, lonMax],
  };
}
