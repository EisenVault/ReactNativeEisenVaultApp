// src/store/store.ts

import { configureStore } from '@reduxjs/toolkit';
import documentsReducer from './slices/documentsSlice';
import offlineReducer from './slices/offlineSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
    reducer: {
        documents: documentsReducer,
        offline: offlineReducer,
        auth: authReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;