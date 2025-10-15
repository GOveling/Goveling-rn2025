// Utilidad global para refrescar el CurrentTripCard desde cualquier lugar de la app
let globalTripRefresh: (() => void) | null = null;

export const setGlobalTripRefresh = (refreshFn: () => void) => {
  globalTripRefresh = refreshFn;
  console.log('🔄 Global trip refresh function registered');
};

export const triggerGlobalTripRefresh = () => {
  if (globalTripRefresh) {
    console.log('🔄 Triggering global trip refresh');
    globalTripRefresh();
  } else {
    console.log('⚠️ Global trip refresh function not available');
  }
};