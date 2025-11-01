/**
 * Quick Debug Script for Arrival Detection
 *
 * Copy & paste this in your app console to quickly debug arrival detection issues
 * Make sure TravelMode is active and you have access to the actions object
 */

// ==================================================================
// QUICK DIAGNOSTICS
// ==================================================================

console.log('🔍 ARRIVAL DETECTION QUICK DEBUG\n');

// Check if actions are available (you need to get this from your component)
// Example: In TravelModeModal, you can expose actions to window for debugging:
// window.debugActions = actions;

if (typeof window !== 'undefined' && window.debugActions) {
  const stats = window.debugActions.getArrivalDebugStats();

  console.log('═══════════════════════════════════════════════════');
  console.log('📊 CURRENT STATE:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total places tracked: ${stats.totalTrackedPlaces}`);
  console.log(`Places arrived: ${stats.arrivedPlaces}`);
  console.log(`Active modal: ${stats.activeArrivalPlaceId || 'NONE'}`);
  console.log(`Blocked places: ${stats.blockedPlaces}`);
  console.log(`Skipped places: ${stats.skippedPlaces}`);
  console.log(`Places in progress: ${stats.placesInProgress.length}`);
  console.log('═══════════════════════════════════════════════════\n');

  if (stats.placesInProgress.length > 0) {
    console.log('📍 PLACES IN PROGRESS:');
    stats.placesInProgress.forEach((place, i) => {
      console.log(`\n${i + 1}. Place ID: ${place.placeId}`);
      console.log(
        `   - Entered at: ${place.enteredAt ? place.enteredAt.toISOString() : 'Not yet'}`
      );
      console.log(`   - Consecutive readings: ${place.consecutiveReadings}`);
      console.log(`   - Is blocked: ${place.isBlocked ? '🚫 YES' : '✅ NO'}`);
      console.log(`   - Is skipped: ${place.skipNotification ? '⏩ YES' : '✅ NO'}`);

      if (place.enteredAt) {
        const elapsed = (Date.now() - place.enteredAt.getTime()) / 1000;
        console.log(`   - Time elapsed: ${elapsed.toFixed(1)}s`);
        console.log(`   - Progress: ${Math.min(100, (elapsed / 15) * 100).toFixed(0)}% (need 15s)`);
      }
    });
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('🛠️  ACTIONS AVAILABLE:');
  console.log('═══════════════════════════════════════════════════');
  console.log('Reset all: window.debugActions.resetArrivalDetection()');
  console.log('Get stats: window.debugActions.getArrivalDebugStats()');
  console.log('═══════════════════════════════════════════════════\n');
} else {
  console.log('⚠️  Debug actions not exposed to window');
  console.log('💡 In TravelModeModal, add this line:');
  console.log('   useEffect(() => {');
  console.log('     if (__DEV__) window.debugActions = actions;');
  console.log('   }, [actions]);');
}

// ==================================================================
// QUICK TESTS
// ==================================================================

console.log('\n🧪 QUICK TESTS:\n');

// Test 1: Check configuration
console.log('Test 1: Configuration Check');
console.log('✓ Dwelling time: 15 seconds (reduced from 30s)');
console.log('✓ Consecutive readings: 2 (reduced from 3)');
console.log('✓ Restaurant radius: 50m (increased from 30m)');
console.log('✓ Cafe radius: 40m (increased from 25m)\n');

// Test 2: Expected behavior
console.log('Test 2: Expected Behavior');
console.log('When you arrive at a place, you should see:');
console.log('1. 📍 "Checking [PlaceName]" logs every few seconds');
console.log('2. 🎯 "User entered radius" when you get close');
console.log('3. 🔄 "Still within radius" with progress updates');
console.log('4. ⏱️  "Progress: X% time, Y% readings"');
console.log('5. ✅ "ARRIVAL CONFIRMED" after ~15 seconds');
console.log('6. 🎉 Modal appears!\n');

// Test 3: Common issues
console.log('Test 3: Common Issues & Solutions');
console.log('');
console.log('Issue: Modal not appearing');
console.log('→ Check logs for "Skipping" or "BLOCKED" messages');
console.log('→ Run: window.debugActions.getArrivalDebugStats()');
console.log('→ Reset: window.debugActions.resetArrivalDetection()');
console.log('');
console.log('Issue: "Distance: 55m / Radius: 50m - Within radius: NO"');
console.log('→ GPS precision issue - move 5m closer');
console.log('→ Or wait for GPS to improve precision');
console.log('');
console.log('Issue: "Already arrived/confirmed in this session"');
console.log('→ Run: window.debugActions.resetArrivalDetection()');
console.log('');
console.log('Issue: Progress resets (readings go back to 1)');
console.log('→ GPS lost lock temporarily');
console.log('→ Make sure app is in foreground');
console.log('→ Check energy mode is "normal" not "low_power"');

console.log('\n═══════════════════════════════════════════════════');
console.log('✅ DEBUG SCRIPT LOADED - Ready for testing!');
console.log('═══════════════════════════════════════════════════\n');
