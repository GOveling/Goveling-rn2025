/**
 * 📦 Redux Store Configuration
 * 
 * Main Redux Toolkit store with:
 * - userSlice (user profile & auth state)
 * - tripsSlice (trips data & breakdowns)
 * - Redux Persist for AsyncStorage
 * - DevTools enabled in development
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
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

// Persist config
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['user'], // Only persist user slice
  blacklist: ['trips'], // Don't persist trips (real-time priority)
};

// Root reducer
const rootReducer = combineReducers({
  user: userReducer,
  trips: tripsReducer,
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
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor
export const persistor = persistStore(store);

// Infer types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
