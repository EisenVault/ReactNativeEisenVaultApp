// src/api/providers/angora/services/AuthService.ts

import { BaseService } from './BaseService';
import { ApiUtils } from '../utils/ApiUtils';
import { AuthResponse, UserProfile } from '../../../types';
import { Platform } from 'react-native';

export class AuthService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    /**
     * Main login method
     * Matches exactly the successful Postman request format
     */
    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            this.logOperation('Starting login process', { 
                platform: Platform.OS,
                username
            });

            // Headers must be in exact order as Postman
            const headers = {
                'x-portal': 'web',
                'x-service-name': 'service-user',
                'Content-Type': 'application/json',
                'Accept-Language': 'en'
            };

            // Request body matching Postman
            const requestBody = {
                email: username,
                password: password
            };
            console.log('Request body:', JSON.stringify(requestBody));
            const response = await this.makeCustomRequest<{
                data?: {
                    token: string;
                    user: {
                        id: string;
                        firstName?: string;
                        lastName?: string;
                        email?: string;
                    };
                };
                error?: {
                    message?: string;
                    details?: string;
                };
                message?: string;
            }>(
                'auth/login',
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody)
                }
            );

            this.logOperation('Received response', { 
                hasData: !!response?.data,
                hasError: !!response?.error 
            });

            if (response?.error) {
                throw new Error(response.error.message || response.error.details || 'Authentication failed');
            }

            if (!response?.data?.token) {
                throw new Error('Invalid authentication response: Missing token');
            }

            const token = response.data.token;
            this.apiUtils.setToken(token);

            // Map the user profile
            const userProfile: UserProfile = {
                id: response.data.user.id,
                firstName: response.data.user.firstName || '',
                lastName: response.data.user.lastName || '',
                displayName: [
                    response.data.user.firstName,
                    response.data.user.lastName
                ].filter(Boolean).join(' ') || username,
                email: response.data.user.email || '',
                username: username
            };

            this.logOperation('Login successful', { userId: userProfile.id });

            return {
                token,
                user: userProfile
            };

        } catch (error) {
            this.logError('Login failed', error);
            this.apiUtils.setToken(null);

            if (error instanceof Error) {
                // Specific error handling based on error message
                const message = error.message.toLowerCase();
                
                if (message.includes('invalid credentials') || 
                    message.includes('user not found')) {
                    throw this.createError('Invalid username or password', error);
                }
                
                if (message.includes('timeout')) {
                    throw this.createError('Request timeout: The server is taking too long to respond', error);
                }
                
                if (message.includes('network')) {
                    throw this.createError('Network error: Unable to connect to the server', error);
                }
                
                // Return the original error message from the server if available
                throw this.createError(error.message, error);
            }

            throw this.createError('Authentication failed', error);
        }
    }

    /**
     * Handles user logout
     */
    async logout(): Promise<void> {
        try {
            this.logOperation('Starting logout process');
            
            if (!this.apiUtils.isAuthenticated()) {
                this.logOperation('No active session, skipping logout');
                return;
            }

            // Headers matching Postman collection
            const headers = {
                'x-portal': 'web',
                'x-service-name': 'service-user',
                'Content-Type': 'application/json',
                'Authorization': this.apiUtils.getToken()!
            };

            try {
                await this.makeCustomRequest(
                    'auth/logout',
                    {
                        method: 'POST',
                        headers
                    }
                );
                this.logOperation('Logout request successful');
            } catch (error) {
                this.logError('Logout request failed', error);
            }

            this.apiUtils.setToken(null);
            this.logOperation('Logout completed');

        } catch (error) {
            this.logError('Logout error:', error);
            this.apiUtils.setToken(null);
            throw this.createError('Logout failed', error);
        }
    }

    isAuthenticated(): boolean {
        return this.apiUtils.isAuthenticated();
    }
}