/**
 * Feature flags for Goveling app
 * Use these to enable/disable features gradually
 */

export const FeatureFlags = {
  /**
   * Enable precise geo-detection with Point-in-Polygon
   *
   * When enabled:
   * - Uses useGeoDetection hook with histéresis
   * - Edge Function geo-lookup for high accuracy (99.9%)
   * - AsyncStorage cache (30-day TTL)
   * - BBox pre-filtering to reduce server calls
   *
   * When disabled:
   * - Falls back to legacy CountryDetectionService
   * - Uses Nominatim + bbox detection
   * - Standard confirmation system
   *
   * Recommended rollout:
   * 1. Internal testing: true
   * 2. Beta users: true (10% sample)
   * 3. Production: false initially, then gradual rollout
   */
  USE_PRECISE_GEO_DETECTION: false,

  /**
   * Enable debug panel for geo detection
   * Shows cache hits, buffer size, accuracy, etc.
   */
  SHOW_GEO_DEBUG_PANEL: __DEV__,

  /**
   * Force Edge Function usage (bypass bbox pre-filter)
   * Only for testing - significantly increases server load
   */
  FORCE_EDGE_FUNCTION_DETECTION: false,
} as const;

export type FeatureFlagKey = keyof typeof FeatureFlags;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FeatureFlags[flag];
}

/**
 * Get all feature flags (for debugging)
 */
export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  return { ...FeatureFlags };
}
