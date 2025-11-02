#!/usr/bin/env node

/**
 * Debug script to clear country detection cache
 *
 * Use this when:
 * - Cache becomes inconsistent with DB
 * - After clearing country_visits table
 * - Testing first-time country detection
 *
 * Run: node scripts/debug-clear-country-cache.js
 *
 * IMPORTANT: This only clears AsyncStorage cache on device
 * You need to run this from the app or manually clear AsyncStorage
 */

const CACHE_KEY = '@goveling/lastDetectedCountry';

console.log('🧹 Country Cache Cleaner');
console.log('========================\n');

console.log(`Cache key: ${CACHE_KEY}\n`);

console.log('⚠️  MANUAL STEPS TO CLEAR CACHE:\n');
console.log('1. Open your app in Expo Go or development build');
console.log('2. Run this in the browser console or React Native debugger:\n');
console.log('   await AsyncStorage.removeItem("@goveling/lastDetectedCountry");\n');
console.log('3. Or add this to your app temporarily:\n');
console.log(`
   import AsyncStorage from '@react-native-async-storage/async-storage';
   
   // Add this in a useEffect or button press
   await AsyncStorage.removeItem('${CACHE_KEY}');
   console.log('✅ Country cache cleared');
`);

console.log('\n💡 TIP: After clearing cache:');
console.log('   - Close and reopen the app');
console.log('   - The country detection modal should appear');
console.log('   - Country will be saved to both DB and cache\n');

console.log('🔍 To verify cache state, check logs for:');
console.log('   "💾 Loaded last detected country from cache: XX"\n');
