// This is our Redux store configuration
import { configureStore } from '@reduxjs/toolkit';
import documentsReducer from './slices/documentsSlice';
import offlineReducer from './slices/offlineSlice';

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    offline: offlineReducer,
  },
});

// These types are used for TypeScript type checking with Redux
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;