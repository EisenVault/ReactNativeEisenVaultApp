// src/store/slices/offlineSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Document } from '../../api/types';

interface OfflineState {
  // Documents available offline
  offlineDocuments: Document[];
  // Total size of offline documents in bytes
  totalOfflineSize: number;
  // Whether offline sync is in progress
  isSyncing: boolean;
  // Last sync timestamp
  lastSyncTime: string | null;
  error: string | null;
}

const initialState: OfflineState = {
  offlineDocuments: [],
  totalOfflineSize: 0,
  isSyncing: false,
  lastSyncTime: null,
  error: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    // Add a document to offline storage
    addOfflineDocument: (state, action: PayloadAction<Document>) => {
      state.offlineDocuments.push(action.payload);
      state.totalOfflineSize += action.payload.size;
    },
    
    // Remove a document from offline storage
    removeOfflineDocument: (state, action: PayloadAction<string>) => {
      state.offlineDocuments = state.offlineDocuments.filter(doc => {
        if (doc.id === action.payload) {
          state.totalOfflineSize -= doc.size;
          return false;
        }
        return true;
      });
    },
    
    // Set the entire offline documents list
    setOfflineDocuments: (state, action: PayloadAction<Document[]>) => {
      state.offlineDocuments = action.payload;
      state.totalOfflineSize = action.payload.reduce((total, doc) => total + doc.size, 0);
    },
    
    // Update sync status
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
      if (action.payload === false) {
        state.lastSyncTime = new Date().toISOString();
      }
    },
    
    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Clear all offline data
    clearOfflineData: (state) => {
      state.offlineDocuments = [];
      state.totalOfflineSize = 0;
      state.lastSyncTime = null;
    }
  },
});

export const {
  addOfflineDocument,
  removeOfflineDocument,
  setOfflineDocuments,
  setSyncing,
  setError,
  clearOfflineData,
} = offlineSlice.actions;

export default offlineSlice.reducer;