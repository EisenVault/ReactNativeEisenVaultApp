// src/store/slices/authSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../../api/types';

// Define the state structure for authentication
interface AuthState {
    isAuthenticated: boolean;
    userProfile: UserProfile | null;
    serverUrl: string | null;    // Added to store the server URL
    authToken: string | null;
}

// Initial state when the app loads
const initialState: AuthState = {
    isAuthenticated: false,
    userProfile: null,
    serverUrl: null,
    authToken: null
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Handle successful login
        setUserProfile: (state, action: PayloadAction<UserProfile>) => {
            state.userProfile = action.payload;
            state.isAuthenticated = true;
        },
        // Set the server URL
        setServerUrl: (state, action: PayloadAction<string>) => {
            state.serverUrl = action.payload;
        },
        setAuthToken: (state, action: PayloadAction<string>) => {  // Add this
            state.authToken = action.payload;
        },
        // Handle logout
        clearAuth: (state) => {
            state.userProfile = null;
            state.isAuthenticated = false;
            state.serverUrl = null;
            state.authToken = null;
            // Clear local storage as well
            localStorage.removeItem('serverUrl');
            localStorage.removeItem('authToken');
        }
    }
});

export const { setUserProfile, setServerUrl, clearAuth, setAuthToken } = authSlice.actions;
export default authSlice.reducer;