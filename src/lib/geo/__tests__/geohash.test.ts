/**
 * Geohash Tests - Global Coverage
 * Tests encoding/decoding accuracy across all continents
 */

import { encode, decode } from '../geohash';

describe('Geohash Encoding/Decoding - Global Coverage', () => {
  describe('South America', () => {
    it('should encode Santiago, Chile accurately', () => {
      const hash = encode(-33.4489, -70.6693, 5);
      expect(hash).toBe('66mrt');
      expect(hash).toHaveLength(5);
    });

    it('should encode Buenos Aires, Argentina accurately', () => {
      const hash = encode(-34.6037, -58.3816, 5);
      expect(hash).toBe('69y7d');
    });

    it('should encode São Paulo, Brazil accurately', () => {
      const hash = encode(-23.5505, -46.6333, 5);
      expect(hash).toBe('6gyd4');
    });

    it('should encode Lima, Peru accurately', () => {
      const hash = encode(-12.0464, -77.0428, 5);
      expect(hash).toBe('6mts8');
    });

    it('should encode Bogotá, Colombia accurately', () => {
      const hash = encode(4.711, -74.0721, 5);
      expect(hash).toBe('d29y4');
    });

    it('should encode Caracas, Venezuela accurately', () => {
      const hash = encode(10.4806, -66.9036, 5);
      expect(hash).toBe('d5crt');
    });

    it('should encode Antofagasta, Chile (original bug location)', () => {
      const hash = encode(-23.6509, -70.3975, 5);
      expect(hash).toBe('6943b');
    });
  });

  describe('North America', () => {
    it('should encode New York, USA accurately', () => {
      const hash = encode(40.7128, -74.006, 5);
      expect(hash).toBe('dr5ru');
    });

    it('should encode Los Angeles, USA accurately', () => {
      const hash = encode(34.0522, -118.2437, 5);
      expect(hash).toBe('9q5cs');
    });

    it('should encode Mexico City, Mexico accurately', () => {
      const hash = encode(19.4326, -99.1332, 5);
      expect(hash).toBe('9g3wm');
    });

    it('should encode Toronto, Canada accurately', () => {
      const hash = encode(43.6532, -79.3832, 5);
      expect(hash).toBe('dpz8h');
    });

    it('should encode Vancouver, Canada accurately', () => {
      const hash = encode(49.2827, -123.1207, 5);
      expect(hash).toBe('c2b2q');
    });
  });

  describe('Europe', () => {
    it('should encode London, UK accurately', () => {
      const hash = encode(51.5074, -0.1278, 5);
      expect(hash).toBe('gcpvj');
    });

    it('should encode Paris, France accurately', () => {
      const hash = encode(48.8566, 2.3522, 5);
      expect(hash).toBe('u09tu');
    });

    it('should encode Berlin, Germany accurately', () => {
      const hash = encode(52.52, 13.405, 5);
      expect(hash).toBe('u33db');
    });

    it('should encode Madrid, Spain accurately', () => {
      const hash = encode(40.4168, -3.7038, 5);
      expect(hash).toBe('ezjme');
    });

    it('should encode Rome, Italy accurately', () => {
      const hash = encode(41.9028, 12.4964, 5);
      expect(hash).toBe('sr2yk');
    });

    it('should encode Moscow, Russia accurately', () => {
      const hash = encode(55.7558, 37.6173, 5);
      expect(hash).toBe('ucfv0');
    });

    it('should encode Stockholm, Sweden accurately', () => {
      const hash = encode(59.3293, 18.0686, 5);
      expect(hash).toBe('u6vgu');
    });
  });

  describe('Asia', () => {
    it('should encode Tokyo, Japan accurately', () => {
      const hash = encode(35.6762, 139.6503, 5);
      expect(hash).toBe('xn76u');
    });

    it('should encode Beijing, China accurately', () => {
      const hash = encode(39.9042, 116.4074, 5);
      expect(hash).toBe('wx4g0');
    });

    it('should encode Shanghai, China accurately', () => {
      const hash = encode(31.2304, 121.4737, 5);
      expect(hash).toBe('wtw3u');
    });

    it('should encode Seoul, South Korea accurately', () => {
      const hash = encode(37.5665, 126.978, 5);
      expect(hash).toBe('wydm6');
    });

    it('should encode Singapore accurately', () => {
      const hash = encode(1.3521, 103.8198, 5);
      expect(hash).toBe('w21z3');
    });

    it('should encode Bangkok, Thailand accurately', () => {
      const hash = encode(13.7563, 100.5018, 5);
      expect(hash).toBe('w4rqg');
    });

    it('should encode Mumbai, India accurately', () => {
      const hash = encode(19.076, 72.8777, 5);
      expect(hash).toBe('te7sv');
    });

    it('should encode Dubai, UAE accurately', () => {
      const hash = encode(25.2048, 55.2708, 5);
      expect(hash).toBe('thrve');
    });
  });

  describe('Africa', () => {
    it('should encode Cairo, Egypt accurately', () => {
      const hash = encode(30.0444, 31.2357, 5);
      expect(hash).toBe('stq4s');
    });

    it('should encode Lagos, Nigeria accurately', () => {
      const hash = encode(6.5244, 3.3792, 5);
      expect(hash).toBe('s12ug');
    });

    it('should encode Cape Town, South Africa accurately', () => {
      const hash = encode(-33.9249, 18.4241, 5);
      expect(hash).toBe('k3vp8');
    });

    it('should encode Nairobi, Kenya accurately', () => {
      const hash = encode(-1.2864, 36.8172, 5);
      expect(hash).toBe('kzgwg');
    });

    it('should encode Casablanca, Morocco accurately', () => {
      const hash = encode(33.5731, -7.5898, 5);
      expect(hash).toBe('eyd5q');
    });
  });

  describe('Oceania', () => {
    it('should encode Sydney, Australia accurately', () => {
      const hash = encode(-33.8688, 151.2093, 5);
      expect(hash).toBe('r3gx1');
    });

    it('should encode Melbourne, Australia accurately', () => {
      const hash = encode(-37.8136, 144.9631, 5);
      expect(hash).toBe('r1r0f');
    });

    it('should encode Auckland, New Zealand accurately', () => {
      const hash = encode(-36.8485, 174.7633, 5);
      expect(hash).toBe('rcfmh');
    });
  });

  describe('Decoding Accuracy', () => {
    it('should decode Santiago hash back to approximate coordinates', () => {
      const { latitude, longitude } = decode('66mrt');
      expect(latitude).toBeCloseTo(-33.4489, 1); // ~10km accuracy
      expect(longitude).toBeCloseTo(-70.6693, 1);
    });

    it('should decode Tokyo hash back to approximate coordinates', () => {
      const { latitude, longitude } = decode('xn76u');
      expect(latitude).toBeCloseTo(35.6762, 1);
      expect(longitude).toBeCloseTo(139.6503, 1);
    });

    it('should decode New York hash back to approximate coordinates', () => {
      const { latitude, longitude } = decode('dr5ru');
      expect(latitude).toBeCloseTo(40.7128, 1);
      expect(longitude).toBeCloseTo(-74.006, 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle equator (0° latitude)', () => {
      const hash = encode(0, 0, 5);
      expect(hash).toHaveLength(5);
      expect(typeof hash).toBe('string');
    });

    it('should handle international date line (180° longitude)', () => {
      const hash = encode(0, 180, 5);
      expect(hash).toHaveLength(5);
    });

    it('should handle north pole (90° latitude)', () => {
      const hash = encode(90, 0, 5);
      expect(hash).toHaveLength(5);
    });

    it('should handle south pole (-90° latitude)', () => {
      const hash = encode(-90, 0, 5);
      expect(hash).toHaveLength(5);
    });

    it('should handle negative longitude (western hemisphere)', () => {
      const hash = encode(0, -100, 5);
      expect(hash).toHaveLength(5);
    });

    it('should encode with different precision levels', () => {
      const lat = -33.4489;
      const lon = -70.6693;

      const hash1 = encode(lat, lon, 1);
      const hash3 = encode(lat, lon, 3);
      const hash5 = encode(lat, lon, 5);
      const hash7 = encode(lat, lon, 7);

      expect(hash1).toHaveLength(1);
      expect(hash3).toHaveLength(3);
      expect(hash5).toHaveLength(5);
      expect(hash7).toHaveLength(7);

      // Higher precision should start with lower precision
      expect(hash3.startsWith(hash1)).toBe(true);
      expect(hash5.startsWith(hash3)).toBe(true);
      expect(hash7.startsWith(hash5)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should encode 1000 locations in under 100ms', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        const lat = Math.random() * 180 - 90; // -90 to 90
        const lon = Math.random() * 360 - 180; // -180 to 180
        encode(lat, lon, 5);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should decode 1000 hashes in under 100ms', () => {
      const testHashes = [];
      for (let i = 0; i < 1000; i++) {
        const lat = Math.random() * 180 - 90;
        const lon = Math.random() * 360 - 180;
        testHashes.push(encode(lat, lon, 5));
      }

      const start = Date.now();
      testHashes.forEach((hash) => decode(hash));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Round-trip Accuracy', () => {
    const testLocations = [
      { name: 'Santiago', lat: -33.4489, lon: -70.6693 },
      { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { name: 'London', lat: 51.5074, lon: -0.1278 },
      { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
      { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
    ];

    testLocations.forEach(({ name, lat, lon }) => {
      it(`should maintain ${name} coordinates through encode/decode cycle`, () => {
        const hash = encode(lat, lon, 7); // Higher precision
        const decoded = decode(hash);

        expect(decoded.latitude).toBeCloseTo(lat, 2); // ~1km accuracy
        expect(decoded.longitude).toBeCloseTo(lon, 2);
      });
    });
  });
});
