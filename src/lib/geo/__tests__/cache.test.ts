/**
 * Cache System Tests - Global Coverage
 * Tests AsyncStorage cache with TTL, expiration, and stats
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCachedGeoResult, setCachedGeoResult, clearExpiredCache, getCacheStats } from '../cache';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('Cache System - Global Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage mock
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
  });

  describe('setCachedGeoResult - Worldwide Locations', () => {
    it('should cache Santiago, Chile correctly', async () => {
      await setCachedGeoResult('66mrt', 'CL', 'Región Metropolitana');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'geo_cache_66mrt',
        expect.stringContaining('"country":"CL"')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'geo_cache_66mrt',
        expect.stringContaining('"region":"Región Metropolitana"')
      );
    });

    it('should cache Tokyo, Japan correctly', async () => {
      await setCachedGeoResult('xn76u', 'JP', 'Tokyo');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'geo_cache_xn76u',
        expect.stringContaining('"country":"JP"')
      );
    });

    it('should cache New York, USA correctly', async () => {
      await setCachedGeoResult('dr5ru', 'US', 'New York');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'geo_cache_dr5ru',
        expect.stringContaining('"country":"US"')
      );
    });

    it('should cache London, UK correctly', async () => {
      await setCachedGeoResult('gcpvj', 'GB', 'England');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'geo_cache_gcpvj',
        expect.stringContaining('"country":"GB"')
      );
    });

    it('should cache Sydney, Australia correctly', async () => {
      await setCachedGeoResult('r3gx1', 'AU', 'New South Wales');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'geo_cache_r3gx1',
        expect.stringContaining('"country":"AU"')
      );
    });

    it('should include expiration timestamp 30 days in future', async () => {
      const beforeTime = Date.now() + 30 * 24 * 60 * 60 * 1000 - 1000; // 30 days - 1s
      await setCachedGeoResult('66mrt', 'CL', null);
      const afterTime = Date.now() + 30 * 24 * 60 * 60 * 1000 + 1000; // 30 days + 1s

      const call = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const cachedData = JSON.parse(call[1]);

      expect(cachedData.expiresAt).toBeGreaterThan(beforeTime);
      expect(cachedData.expiresAt).toBeLessThan(afterTime);
    });

    it('should handle null region (offshore/undefined)', async () => {
      await setCachedGeoResult('s00000', 'OFFSHORE', null);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'geo_cache_s00000',
        expect.stringContaining('"region":null')
      );
    });
  });

  describe('getCachedGeoResult - Worldwide Locations', () => {
    it('should retrieve cached Santiago, Chile data', async () => {
      const mockData = {
        country: 'CL',
        region: 'Región Metropolitana',
        expiresAt: Date.now() + 10000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getCachedGeoResult('66mrt');

      expect(result).toEqual({ country: 'CL', region: 'Región Metropolitana' });
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('geo_cache_66mrt');
    });

    it('should retrieve cached Tokyo, Japan data', async () => {
      const mockData = {
        country: 'JP',
        region: 'Tokyo',
        expiresAt: Date.now() + 10000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getCachedGeoResult('xn76u');

      expect(result).toEqual({ country: 'JP', region: 'Tokyo' });
    });

    it('should return null for cache miss', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getCachedGeoResult('99999');

      expect(result).toBeNull();
    });

    it('should return null for expired cache entry', async () => {
      const mockData = {
        country: 'CL',
        region: 'Región Metropolitana',
        expiresAt: Date.now() - 10000, // Expired 10 seconds ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getCachedGeoResult('66mrt');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('geo_cache_66mrt');
    });

    it('should return null for corrupted cache data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json{');

      const result = await getCachedGeoResult('66mrt');

      expect(result).toBeNull();
    });

    it('should handle OFFSHORE detection', async () => {
      const mockData = {
        country: 'OFFSHORE',
        region: null,
        expiresAt: Date.now() + 10000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getCachedGeoResult('s00000');

      expect(result).toEqual({ country: 'OFFSHORE', region: null });
    });
  });

  describe('clearExpiredCache - All Continents', () => {
    it('should remove expired entries and keep valid ones', async () => {
      const now = Date.now();
      const keys = [
        'geo_cache_66mrt', // Santiago - valid
        'geo_cache_xn76u', // Tokyo - expired
        'geo_cache_dr5ru', // New York - valid
        'geo_cache_gcpvj', // London - expired
        'other_key', // Not a geo cache key
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(keys);

      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem
        .mockResolvedValueOnce(JSON.stringify({ country: 'CL', expiresAt: now + 10000 })) // Santiago - valid
        .mockResolvedValueOnce(JSON.stringify({ country: 'JP', expiresAt: now - 10000 })) // Tokyo - expired
        .mockResolvedValueOnce(JSON.stringify({ country: 'US', expiresAt: now + 10000 })) // New York - valid
        .mockResolvedValueOnce(JSON.stringify({ country: 'GB', expiresAt: now - 10000 })); // London - expired

      await clearExpiredCache();

      // Should only remove expired entries
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(2);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('geo_cache_xn76u');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('geo_cache_gcpvj');
    });

    it('should handle empty cache', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

      await clearExpiredCache();

      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should handle corrupted entries gracefully', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(['geo_cache_66mrt']);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json{');

      await expect(clearExpiredCache()).resolves.not.toThrow();
    });
  });

  describe('getCacheStats - Performance Metrics', () => {
    it('should calculate stats for mixed cache with global locations', async () => {
      const now = Date.now();
      const keys = [
        'geo_cache_66mrt', // Santiago - valid
        'geo_cache_xn76u', // Tokyo - expired
        'geo_cache_dr5ru', // New York - valid
        'geo_cache_gcpvj', // London - valid
        'geo_cache_r3gx1', // Sydney - expired
        'other_key', // Not geo cache
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(keys);

      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem
        .mockResolvedValueOnce(JSON.stringify({ country: 'CL', expiresAt: now + 10000 })) // Santiago - valid
        .mockResolvedValueOnce(JSON.stringify({ country: 'JP', expiresAt: now - 10000 })) // Tokyo - expired
        .mockResolvedValueOnce(JSON.stringify({ country: 'US', expiresAt: now + 10000 })) // New York - valid
        .mockResolvedValueOnce(JSON.stringify({ country: 'GB', expiresAt: now + 10000 })) // London - valid
        .mockResolvedValueOnce(JSON.stringify({ country: 'AU', expiresAt: now - 10000 })); // Sydney - expired

      const stats = await getCacheStats();

      expect(stats.total).toBe(5);
      expect(stats.valid).toBe(3);
      expect(stats.expired).toBe(2);
    });

    it('should return zero stats for empty cache', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

      const stats = await getCacheStats();

      expect(stats).toEqual({ total: 0, valid: 0, expired: 0 });
    });

    it('should count only geo cache keys', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'user_settings',
        'auth_token',
        'other_data',
      ]);

      const stats = await getCacheStats();

      expect(stats).toEqual({ total: 0, valid: 0, expired: 0 });
    });

    it('should handle corrupted entries in stats calculation', async () => {
      const now = Date.now();
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        'geo_cache_66mrt', // Valid
        'geo_cache_xn76u', // Corrupted
      ]);

      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem
        .mockResolvedValueOnce(JSON.stringify({ country: 'CL', expiresAt: now + 10000 }))
        .mockResolvedValueOnce('invalid json{');

      const stats = await getCacheStats();

      // Corrupted entry should not crash, might be counted as total but not valid/expired
      expect(stats.total).toBeGreaterThanOrEqual(1);
      expect(stats.valid).toBe(1);
    });
  });

  describe('TTL Edge Cases', () => {
    it('should treat entry expiring exactly now as expired', async () => {
      const now = Date.now();
      const mockData = {
        country: 'CL',
        region: 'Región Metropolitana',
        expiresAt: now, // Expires exactly now
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getCachedGeoResult('66mrt');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('geo_cache_66mrt');
    });

    it('should keep entry expiring 1ms in future', async () => {
      const mockData = {
        country: 'CL',
        region: 'Región Metropolitana',
        expiresAt: Date.now() + 1,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await getCachedGeoResult('66mrt');

      expect(result).toEqual({ country: 'CL', region: 'Región Metropolitana' });
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple simultaneous reads', async () => {
      const mockData = {
        country: 'CL',
        region: 'Región Metropolitana',
        expiresAt: Date.now() + 10000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const promises = [
        getCachedGeoResult('66mrt'),
        getCachedGeoResult('66mrt'),
        getCachedGeoResult('66mrt'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual({ country: 'CL', region: 'Región Metropolitana' });
      });
    });

    it('should handle multiple simultaneous writes', async () => {
      const promises = [
        setCachedGeoResult('66mrt', 'CL', 'Región Metropolitana'),
        setCachedGeoResult('xn76u', 'JP', 'Tokyo'),
        setCachedGeoResult('dr5ru', 'US', 'New York'),
      ];

      await Promise.all(promises);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance', () => {
    it('should set 100 cache entries in under 1 second', async () => {
      const start = Date.now();

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(setCachedGeoResult(`hash${i}`, 'CL', 'Region'));
      }

      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(100);
    });

    it('should get 100 cache entries in under 1 second', async () => {
      const mockData = {
        country: 'CL',
        region: 'Región Metropolitana',
        expiresAt: Date.now() + 10000,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const start = Date.now();

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(getCachedGeoResult(`hash${i}`));
      }

      await Promise.all(promises);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});
