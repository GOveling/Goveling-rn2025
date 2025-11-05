/**
 * Country bounding boxes for pre-filtering
 * Corrected bboxes with Argentina/Chile fix
 */

import { BBox } from './distance';

/**
 * Lightweight bbox dictionary for quick pre-filtering
 * Source: CountryDetectionService with corrections
 */
export const COUNTRY_BBOXES: Map<string, BBox> = new Map([
  // South America
  [
    'AR',
    {
      latRange: [-55.1, -21.8],
      lngRange: [-68.0, -53.6], // CORRECTED: was -73.6
    },
  ],
  [
    'CL',
    {
      latRange: [-56.0, -17.5],
      lngRange: [-109.5, -66.5], // CORRECTED: was -66.4
    },
  ],
  [
    'BR',
    {
      latRange: [-33.8, 5.3],
      lngRange: [-73.9, -28.8],
    },
  ],
  [
    'PE',
    {
      latRange: [-18.4, -0.0],
      lngRange: [-81.4, -68.7],
    },
  ],
  [
    'BO',
    {
      latRange: [-22.9, -9.7],
      lngRange: [-69.6, -57.5],
    },
  ],
  [
    'PY',
    {
      latRange: [-27.6, -19.3],
      lngRange: [-62.6, -54.3],
    },
  ],
  [
    'UY',
    {
      latRange: [-35.0, -30.1],
      lngRange: [-58.4, -53.1],
    },
  ],
  [
    'CO',
    {
      latRange: [-4.2, 12.5],
      lngRange: [-79.0, -66.9],
    },
  ],
  [
    'VE',
    {
      latRange: [0.6, 12.2],
      lngRange: [-73.4, -59.8],
    },
  ],
  [
    'EC',
    {
      latRange: [-5.0, 1.7],
      lngRange: [-92.0, -75.2],
    },
  ],
  [
    'GY',
    {
      latRange: [1.2, 8.6],
      lngRange: [-61.4, -56.5],
    },
  ],
  [
    'SR',
    {
      latRange: [1.8, 6.0],
      lngRange: [-58.1, -53.9],
    },
  ],
  [
    'GF',
    {
      latRange: [2.1, 5.8],
      lngRange: [-54.6, -51.6],
    },
  ],

  // North America
  [
    'US',
    {
      latRange: [24.5, 71.5],
      lngRange: [-179.2, -66.9],
    },
  ],
  [
    'CA',
    {
      latRange: [41.7, 83.1],
      lngRange: [-141.0, -52.6],
    },
  ],
  [
    'MX',
    {
      latRange: [14.5, 32.7],
      lngRange: [-118.4, -86.7],
    },
  ],

  // Central America
  [
    'GT',
    {
      latRange: [13.7, 17.8],
      lngRange: [-92.2, -88.2],
    },
  ],
  [
    'BZ',
    {
      latRange: [15.9, 18.5],
      lngRange: [-89.2, -87.5],
    },
  ],
  [
    'SV',
    {
      latRange: [13.1, 14.4],
      lngRange: [-90.1, -87.7],
    },
  ],
  [
    'HN',
    {
      latRange: [12.9, 16.5],
      lngRange: [-89.4, -83.1],
    },
  ],
  [
    'NI',
    {
      latRange: [10.7, 15.0],
      lngRange: [-87.7, -82.7],
    },
  ],
  [
    'CR',
    {
      latRange: [8.0, 11.2],
      lngRange: [-85.9, -82.6],
    },
  ],
  [
    'PA',
    {
      latRange: [7.2, 9.6],
      lngRange: [-83.1, -77.2],
    },
  ],

  // Caribbean
  [
    'CU',
    {
      latRange: [19.8, 23.3],
      lngRange: [-84.9, -74.1],
    },
  ],
  [
    'DO',
    {
      latRange: [17.5, 19.9],
      lngRange: [-72.0, -68.3],
    },
  ],
  [
    'HT',
    {
      latRange: [18.0, 20.1],
      lngRange: [-74.5, -71.6],
    },
  ],
  [
    'JM',
    {
      latRange: [17.7, 18.5],
      lngRange: [-78.4, -76.2],
    },
  ],
  [
    'PR',
    {
      latRange: [17.9, 18.5],
      lngRange: [-67.3, -65.2],
    },
  ],

  // Europe
  [
    'ES',
    {
      latRange: [36.0, 43.8],
      lngRange: [-18.2, 4.3],
    },
  ],
  [
    'FR',
    {
      latRange: [41.3, 51.1],
      lngRange: [-5.1, 9.6],
    },
  ],
  [
    'IT',
    {
      latRange: [36.6, 47.1],
      lngRange: [6.6, 18.5],
    },
  ],
  [
    'DE',
    {
      latRange: [47.3, 55.1],
      lngRange: [5.9, 15.0],
    },
  ],
  [
    'GB',
    {
      latRange: [49.9, 60.9],
      lngRange: [-8.6, 1.8],
    },
  ],
  [
    'PT',
    {
      latRange: [36.9, 42.2],
      lngRange: [-31.3, -6.2],
    },
  ],
  [
    'NL',
    {
      latRange: [50.8, 53.6],
      lngRange: [3.4, 7.2],
    },
  ],
  [
    'BE',
    {
      latRange: [49.5, 51.5],
      lngRange: [2.5, 6.4],
    },
  ],
  [
    'CH',
    {
      latRange: [45.8, 47.8],
      lngRange: [5.9, 10.5],
    },
  ],
  [
    'AT',
    {
      latRange: [46.4, 49.0],
      lngRange: [9.5, 17.2],
    },
  ],
  [
    'PL',
    {
      latRange: [49.0, 54.8],
      lngRange: [14.1, 24.1],
    },
  ],
  [
    'SE',
    {
      latRange: [55.3, 69.1],
      lngRange: [11.1, 24.2],
    },
  ],
  [
    'NO',
    {
      latRange: [57.9, 71.2],
      lngRange: [4.6, 31.1],
    },
  ],
  [
    'FI',
    {
      latRange: [59.8, 70.1],
      lngRange: [20.5, 31.6],
    },
  ],
  [
    'DK',
    {
      latRange: [54.6, 57.7],
      lngRange: [8.1, 15.2],
    },
  ],
  [
    'GR',
    {
      latRange: [34.8, 41.7],
      lngRange: [19.4, 28.2],
    },
  ],

  // Add more countries as needed
]);

/**
 * Get candidate countries for a point based on bbox pre-filtering
 */
export function getCandidateCountries(lat: number, lng: number): string[] {
  const candidates: string[] = [];

  for (const [countryCode, bbox] of COUNTRY_BBOXES.entries()) {
    const [minLat, maxLat] = bbox.latRange;
    const [minLng, maxLng] = bbox.lngRange;

    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      candidates.push(countryCode);
    }
  }

  return candidates;
}
