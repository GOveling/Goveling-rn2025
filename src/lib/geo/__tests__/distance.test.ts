/**
 * Distance Calculation Tests - Global Coverage
 * Tests Haversine distance formula across all continents
 */

import { haversineDistance, getDistanceToEdge, areCoordinatesClose } from '../distance';

describe('Distance Calculations - Global Coverage', () => {
  describe('haversineDistance - Worldwide Pairs', () => {
    describe('South America', () => {
      it('should calculate distance Santiago to Antofagasta (Chile)', () => {
        const distance = haversineDistance(
          -33.4489,
          -70.6693, // Santiago
          -23.6509,
          -70.3975 // Antofagasta
        );
        // Expected: ~1,085 km
        expect(distance).toBeGreaterThan(1000);
        expect(distance).toBeLessThan(1200);
      });

      it('should calculate distance Santiago to Buenos Aires', () => {
        const distance = haversineDistance(
          -33.4489,
          -70.6693, // Santiago, Chile
          -34.6037,
          -58.3816 // Buenos Aires, Argentina
        );
        // Expected: ~1,140 km
        expect(distance).toBeGreaterThan(1000);
        expect(distance).toBeLessThan(1300);
      });

      it('should calculate distance São Paulo to Rio de Janeiro', () => {
        const distance = haversineDistance(
          -23.5505,
          -46.6333, // São Paulo
          -22.9068,
          -43.1729 // Rio de Janeiro
        );
        // Expected: ~357 km
        expect(distance).toBeGreaterThan(300);
        expect(distance).toBeLessThan(400);
      });

      it('should calculate distance Lima to Bogotá', () => {
        const distance = haversineDistance(
          -12.0464,
          -77.0428, // Lima, Peru
          4.711,
          -74.0721 // Bogotá, Colombia
        );
        // Expected: ~1,860 km
        expect(distance).toBeGreaterThan(1700);
        expect(distance).toBeLessThan(2000);
      });
    });

    describe('North America', () => {
      it('should calculate distance New York to Los Angeles', () => {
        const distance = haversineDistance(
          40.7128,
          -74.006, // New York
          34.0522,
          -118.2437 // Los Angeles
        );
        // Expected: ~3,935 km
        expect(distance).toBeGreaterThan(3800);
        expect(distance).toBeLessThan(4100);
      });

      it('should calculate distance Toronto to Vancouver', () => {
        const distance = haversineDistance(
          43.6532,
          -79.3832, // Toronto
          49.2827,
          -123.1207 // Vancouver
        );
        // Expected: ~3,364 km
        expect(distance).toBeGreaterThan(3200);
        expect(distance).toBeLessThan(3500);
      });

      it('should calculate distance Mexico City to Cancun', () => {
        const distance = haversineDistance(
          19.4326,
          -99.1332, // Mexico City
          21.1619,
          -86.8515 // Cancun
        );
        // Expected: ~1,555 km
        expect(distance).toBeGreaterThan(1400);
        expect(distance).toBeLessThan(1700);
      });
    });

    describe('Europe', () => {
      it('should calculate distance London to Paris', () => {
        const distance = haversineDistance(
          51.5074,
          -0.1278, // London
          48.8566,
          2.3522 // Paris
        );
        // Expected: ~344 km
        expect(distance).toBeGreaterThan(300);
        expect(distance).toBeLessThan(400);
      });

      it('should calculate distance Madrid to Berlin', () => {
        const distance = haversineDistance(
          40.4168,
          -3.7038, // Madrid
          52.52,
          13.405 // Berlin
        );
        // Expected: ~1,870 km
        expect(distance).toBeGreaterThan(1700);
        expect(distance).toBeLessThan(2000);
      });

      it('should calculate distance Rome to Moscow', () => {
        const distance = haversineDistance(
          41.9028,
          12.4964, // Rome
          55.7558,
          37.6173 // Moscow
        );
        // Expected: ~2,376 km
        expect(distance).toBeGreaterThan(2200);
        expect(distance).toBeLessThan(2500);
      });
    });

    describe('Asia', () => {
      it('should calculate distance Tokyo to Beijing', () => {
        const distance = haversineDistance(
          35.6762,
          139.6503, // Tokyo
          39.9042,
          116.4074 // Beijing
        );
        // Expected: ~2,099 km
        expect(distance).toBeGreaterThan(1900);
        expect(distance).toBeLessThan(2300);
      });

      it('should calculate distance Singapore to Bangkok', () => {
        const distance = haversineDistance(
          1.3521,
          103.8198, // Singapore
          13.7563,
          100.5018 // Bangkok
        );
        // Expected: ~1,436 km
        expect(distance).toBeGreaterThan(1300);
        expect(distance).toBeLessThan(1600);
      });

      it('should calculate distance Mumbai to Dubai', () => {
        const distance = haversineDistance(
          19.076,
          72.8777, // Mumbai
          25.2048,
          55.2708 // Dubai
        );
        // Expected: ~1,936 km
        expect(distance).toBeGreaterThan(1800);
        expect(distance).toBeLessThan(2100);
      });
    });

    describe('Africa', () => {
      it('should calculate distance Cairo to Cape Town', () => {
        const distance = haversineDistance(
          30.0444,
          31.2357, // Cairo
          -33.9249,
          18.4241 // Cape Town
        );
        // Expected: ~7,006 km
        expect(distance).toBeGreaterThan(6700);
        expect(distance).toBeLessThan(7300);
      });

      it('should calculate distance Lagos to Nairobi', () => {
        const distance = haversineDistance(
          6.5244,
          3.3792, // Lagos
          -1.2864,
          36.8172 // Nairobi
        );
        // Expected: ~4,244 km
        expect(distance).toBeGreaterThan(4000);
        expect(distance).toBeLessThan(4500);
      });
    });

    describe('Oceania', () => {
      it('should calculate distance Sydney to Melbourne', () => {
        const distance = haversineDistance(
          -33.8688,
          151.2093, // Sydney
          -37.8136,
          144.9631 // Melbourne
        );
        // Expected: ~714 km
        expect(distance).toBeGreaterThan(650);
        expect(distance).toBeLessThan(800);
      });

      it('should calculate distance Sydney to Auckland', () => {
        const distance = haversineDistance(
          -33.8688,
          151.2093, // Sydney
          -36.8485,
          174.7633 // Auckland
        );
        // Expected: ~2,155 km
        expect(distance).toBeGreaterThan(2000);
        expect(distance).toBeLessThan(2300);
      });
    });

    describe('Intercontinental', () => {
      it('should calculate distance New York to London', () => {
        const distance = haversineDistance(
          40.7128,
          -74.006, // New York
          51.5074,
          -0.1278 // London
        );
        // Expected: ~5,570 km
        expect(distance).toBeGreaterThan(5400);
        expect(distance).toBeLessThan(5700);
      });

      it('should calculate distance Tokyo to San Francisco', () => {
        const distance = haversineDistance(
          35.6762,
          139.6503, // Tokyo
          37.7749,
          -122.4194 // San Francisco
        );
        // Expected: ~8,281 km
        expect(distance).toBeGreaterThan(8000);
        expect(distance).toBeLessThan(8500);
      });

      it('should calculate distance Sydney to Los Angeles', () => {
        const distance = haversineDistance(
          -33.8688,
          151.2093, // Sydney
          34.0522,
          -118.2437 // Los Angeles
        );
        // Expected: ~12,050 km
        expect(distance).toBeGreaterThan(11500);
        expect(distance).toBeLessThan(12500);
      });
    });

    describe('Edge Cases', () => {
      it('should return 0 for same coordinates', () => {
        const distance = haversineDistance(-33.4489, -70.6693, -33.4489, -70.6693);
        expect(distance).toBe(0);
      });

      it('should handle coordinates crossing the equator', () => {
        const distance = haversineDistance(
          10,
          0, // Northern hemisphere
          -10,
          0 // Southern hemisphere
        );
        expect(distance).toBeGreaterThan(2200);
        expect(distance).toBeLessThan(2300);
      });

      it('should handle coordinates crossing the international date line', () => {
        const distance = haversineDistance(
          0,
          179, // Just west of date line
          0,
          -179 // Just east of date line
        );
        expect(distance).toBeGreaterThan(200);
        expect(distance).toBeLessThan(300);
      });

      it('should handle north pole to south pole', () => {
        const distance = haversineDistance(
          90,
          0, // North pole
          -90,
          0 // South pole
        );
        // Expected: ~20,015 km (half Earth circumference)
        expect(distance).toBeGreaterThan(19500);
        expect(distance).toBeLessThan(20500);
      });

      it('should handle very small distances (< 1km)', () => {
        const distance = haversineDistance(
          -33.4489,
          -70.6693,
          -33.4495,
          -70.67 // ~100m away
        );
        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThan(0.2);
      });
    });
  });

  describe('getDistanceToEdge - BBox Calculations', () => {
    describe('South America', () => {
      it('should calculate distance to Chile bbox edge from Santiago', () => {
        const chileBBox = [-109.5, -55.9, -66.4, -17.5]; // Chile
        const distance = getDistanceToEdge(-33.4489, -70.6693, chileBBox);

        // Santiago is ~400km from Argentina border (eastern edge)
        expect(distance).toBeGreaterThan(300);
        expect(distance).toBeLessThan(500);
      });

      it('should detect Antofagasta near Peru border', () => {
        const chileBBox = [-109.5, -55.9, -66.4, -17.5];
        const distance = getDistanceToEdge(-23.6509, -70.3975, chileBBox);

        // Antofagasta is ~200km from Peru border (northern edge)
        expect(distance).toBeGreaterThan(100);
        expect(distance).toBeLessThan(350);
      });

      it('should calculate distance to Argentina bbox edge from Buenos Aires', () => {
        const argentinaBBox = [-73.6, -55.1, -53.6, -21.8];
        const distance = getDistanceToEdge(-34.6037, -58.3816, argentinaBBox);

        // Buenos Aires is ~280km from Uruguay border (eastern edge)
        expect(distance).toBeGreaterThan(200);
        expect(distance).toBeLessThan(400);
      });
    });

    describe('Europe', () => {
      it('should calculate distance to UK bbox edge from London', () => {
        const ukBBox = [-8.2, 49.9, 1.8, 60.9];
        const distance = getDistanceToEdge(51.5074, -0.1278, ukBBox);

        // London is ~100km from southern coast
        expect(distance).toBeGreaterThan(50);
        expect(distance).toBeLessThan(200);
      });

      it('should detect border proximity in small countries (Belgium)', () => {
        const belgiumBBox = [2.5, 49.5, 6.4, 51.5];
        const brusselsLat = 50.8503;
        const brusselsLng = 4.3517;

        const distance = getDistanceToEdge(brusselsLat, brusselsLng, belgiumBBox);

        // Belgium is small, Brussels should be < 100km from any edge
        expect(distance).toBeLessThan(150);
      });
    });

    describe('Asia', () => {
      it('should calculate distance to Japan bbox edge from Tokyo', () => {
        const japanBBox = [122.9, 20.4, 154.0, 45.5];
        const distance = getDistanceToEdge(35.6762, 139.6503, japanBBox);

        // Tokyo is relatively central, should be >200km from nearest edge
        expect(distance).toBeGreaterThan(100);
      });

      it('should detect Singapore near Malaysia border', () => {
        const singaporeBBox = [103.6, 1.1, 104.1, 1.5];
        const distance = getDistanceToEdge(1.3521, 103.8198, singaporeBBox);

        // Singapore is tiny, should be < 20km from edge
        expect(distance).toBeLessThan(30);
      });
    });

    describe('Africa', () => {
      it('should calculate distance to Egypt bbox edge from Cairo', () => {
        const egyptBBox = [24.7, 22.0, 37.0, 31.7];
        const distance = getDistanceToEdge(30.0444, 31.2357, egyptBBox);

        // Cairo is in northern Egypt, relatively close to edges
        expect(distance).toBeGreaterThan(100);
        expect(distance).toBeLessThan(300);
      });
    });

    describe('North America', () => {
      it('should calculate distance to USA bbox edge from New York', () => {
        const usaBBox = [-179.2, 18.9, -66.9, 71.4];
        const distance = getDistanceToEdge(40.7128, -74.006, usaBBox);

        // New York is ~300km from Canada border
        expect(distance).toBeGreaterThan(200);
        expect(distance).toBeLessThan(500);
      });

      it('should calculate distance to Mexico bbox edge from Mexico City', () => {
        const mexicoBBox = [-118.4, 14.5, -86.7, 32.7];
        const distance = getDistanceToEdge(19.4326, -99.1332, mexicoBBox);

        // Mexico City is relatively central
        expect(distance).toBeGreaterThan(300);
        expect(distance).toBeLessThan(700);
      });
    });

    describe('Oceania', () => {
      it('should calculate distance to Australia bbox edge from Sydney', () => {
        const australiaBBox = [113.0, -43.6, 153.6, -10.7];
        const distance = getDistanceToEdge(-33.8688, 151.2093, australiaBBox);

        // Sydney is on the coast, should be close to edge
        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThan(200);
      });

      it('should calculate distance to New Zealand bbox edge from Auckland', () => {
        const newZealandBBox = [166.5, -47.3, 178.6, -34.4];
        const distance = getDistanceToEdge(-36.8485, 174.7633, newZealandBBox);

        // Auckland is on North Island, relatively close to edges
        expect(distance).toBeGreaterThan(50);
        expect(distance).toBeLessThan(300);
      });
    });
  });

  describe('areCoordinatesClose - Proximity Detection', () => {
    it('should detect coordinates within 50m', () => {
      const result = areCoordinatesClose(
        -33.4489,
        -70.6693,
        -33.4492,
        -70.6696, // ~40m away
        0.05 // 50m threshold
      );
      expect(result).toBe(true);
    });

    it('should reject coordinates beyond 50m', () => {
      const result = areCoordinatesClose(
        -33.4489,
        -70.6693,
        -33.4499,
        -70.671, // ~200m away
        0.05 // 50m threshold
      );
      expect(result).toBe(false);
    });

    it('should detect identical coordinates', () => {
      const result = areCoordinatesClose(-33.4489, -70.6693, -33.4489, -70.6693, 0.001);
      expect(result).toBe(true);
    });

    it('should work with default threshold (300m)', () => {
      const result = areCoordinatesClose(
        -33.4489,
        -70.6693,
        -33.4515,
        -70.673 // ~250m away
      );
      expect(result).toBe(true);
    });

    it('should handle global distances', () => {
      const result = areCoordinatesClose(
        -33.4489,
        -70.6693, // Santiago
        35.6762,
        139.6503, // Tokyo
        1 // 1km threshold
      );
      expect(result).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should calculate 1000 distances in under 100ms', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        const lat1 = Math.random() * 180 - 90;
        const lon1 = Math.random() * 360 - 180;
        const lat2 = Math.random() * 180 - 90;
        const lon2 = Math.random() * 360 - 180;
        haversineDistance(lat1, lon1, lat2, lon2);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should calculate 1000 edge distances in under 200ms', () => {
      const bbox = [-73.6, -55.1, -53.6, -21.8]; // Argentina
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        const lat = Math.random() * 180 - 90;
        const lon = Math.random() * 360 - 180;
        getDistanceToEdge(lat, lon, bbox);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });
  });
});
