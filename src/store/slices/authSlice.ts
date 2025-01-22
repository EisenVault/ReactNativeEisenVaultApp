// src/store/slices/authSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../../api/types';

interface AuthState {
    isAuthenticated: boolean;
    userProfile: UserProfile | null;
}

const initialState: AuthState = {
    isAuthenticated: false,
    userProfile: null
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUserProfile: (state, action: PayloadAction<UserProfile>) => {
            state.userProfile = action.payload;
            state.isAuthenticated = true;
        },
        clearAuth: (state) => {
            state.userProfile = null;
            state.isAuthenticated = false;
        }
    }
});

export const { setUserProfile, clearAuth } = authSlice.actions;
export default authSlice.reducer;