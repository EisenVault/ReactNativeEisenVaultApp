// src/store/slices/authSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../../api/types';

interface AuthState {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  serverUrl: string | null;
  authToken: string | null;
  providerType: 'alfresco' | 'angora' | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  userProfile: null,
  serverUrl: null,
  authToken: null,
  providerType: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUserProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.userProfile = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setServerUrl: (state, action: PayloadAction<string | null>) => {
      state.serverUrl = action.payload;
    },
    setAuthToken: (state, action: PayloadAction<string | null>) => {
      state.authToken = action.payload;
    },
    setProviderType: (state, action: PayloadAction<'alfresco' | 'angora' | null>) => {
      state.providerType = action.payload;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.userProfile = null;
      state.serverUrl = null;
      state.authToken = null;
      state.providerType = null;
    }
  }
});

export const { 
  setUserProfile, 
  setServerUrl, 
  setAuthToken, 
  setProviderType,
  clearAuth 
} = authSlice.actions;

export default authSlice.reducer;