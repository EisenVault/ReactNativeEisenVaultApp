// src/api/providers/angora/services/AuthService.ts

import { BaseService } from './BaseService';
import { ApiUtils } from '../utils/ApiUtils';
import { AuthResponse, UserProfile } from '../../../types';
import { Platform } from 'react-native';

// Type definitions for requests
interface LoginRequest {
    email: string;
    password: string;
}

interface LoginResponse {
    data: {
        token: string;
        user: {
            id: string;
            firstName?: string;
            lastName?: string;
            email?: string;
            displayName?: string;
        };
    };
}

export class AuthService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    /**
     * Main login method
     * Handles both web and mobile authentication flows
     */
    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            this.logOperation('Starting login process', { platform: Platform.OS });

            const loginPayload: LoginRequest = {
                email: username,
                password: password
            };

            const response = await this.makeCustomRequest<LoginResponse>(
                'auth/login',
                {
                    method: 'POST',
                    serviceName: 'service-auth',
                    body: JSON.stringify(loginPayload)
                }
            );

            if (!response?.data?.token) {
                throw new Error('Invalid authentication response');
            }

            const token = response.data.token;
            this.apiUtils.setToken(token);

            // Map the user profile
            const userProfile: UserProfile = {
                id: response.data.user.id,
                firstName: response.data.user.firstName || '',
                lastName: response.data.user.lastName || '',
                displayName: response.data.user.displayName || 
                           `${response.data.user.firstName} ${response.data.user.lastName}`.trim() ||
                           username,
                email: response.data.user.email || '',
                username: username
            };

            return {
                token,
                user: userProfile
            };

        } catch (error) {
            this.logError('Login failed', error);
            this.apiUtils.setToken(null);

            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    throw this.createError('Request timeout: The server is taking too long to respond', error);
                } else if (error.message.includes('Network request failed')) {
                    throw this.createError('Network error: Unable to connect to the server', error);
                } else if (error.message.includes('401')) {
                    throw this.createError('Invalid username or password', error);
                }
            }

            throw this.createError('Authentication failed', error);
        }
    }

    /**
     * Handles user logout
     * Cleans up any existing sessions and tokens
     */
    async logout(): Promise<void> {
        try {
            this.logOperation('Starting logout process');
            
            if (!this.apiUtils.isAuthenticated()) {
                this.logOperation('No active session, skipping logout');
                return;
            }

            try {
                await this.makeCustomRequest(
                    'auth/logout',
                    {
                        method: 'POST',
                        serviceName: 'service-auth'
                    }
                );
                this.logOperation('Logout request successful');
            } catch (error) {
                this.logError('Logout request failed', error);
                // Continue with cleanup even if the request fails
            }

            this.apiUtils.setToken(null);
            this.logOperation('Logout completed');

        } catch (error) {
            this.logError('Logout error:', error);
            this.apiUtils.setToken(null);
            throw this.createError('Logout failed', error);
        }
    }

    /**
     * Verifies the JWT token
     */
    async verifyToken(token: string): Promise<boolean> {
        try {
            await this.makeCustomRequest(
                'auth/token',
                {
                    method: 'POST',
                    serviceName: 'service-auth',
                    body: JSON.stringify({ token })
                }
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Checks if the user is currently authenticated
     */
    isAuthenticated(): boolean {
        return this.apiUtils.isAuthenticated();
    }
}