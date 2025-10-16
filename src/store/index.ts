/**
 * 📦 Redux Store Configuration
 *
 * Main Redux Toolkit store with:
 * - userSlice (user profile & auth state)
 * - tripsSlice (trips data & breakdowns)
 * - tripsApi (RTK Query for trips)
 * - Redux Persist for AsyncStorage
 * - DevTools enabled in development
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import slices
import userReducer from './slices/userSlice';
import tripsReducer from './slices/tripsSlice';

// Import RTK Query APIs
import { tripsApi } from './api/tripsApi';
import { userApi } from './api/userApi';

// Persist config
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['user'], // Only persist user slice
  blacklist: ['trips', 'tripsApi', 'userApi'], // Don't persist trips or API cache
};

// Root reducer
const rootReducer = combineReducers({
  user: userReducer,
  trips: tripsReducer,
  // Add RTK Query reducers
  [tripsApi.reducerPath]: tripsApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(tripsApi.middleware as any) // Add RTK Query middleware
      .concat(userApi.middleware as any), // Add userApi middleware
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup RTK Query listeners for refetchOnFocus/refetchOnReconnect
setupListeners(store.dispatch);

// Persistor
export const persistor = persistStore(store);

// Infer types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
