// src/api/providers/alfresco/services/AuthService.ts

import { Platform } from 'react-native';
import { BaseService } from './BaseService';
import { ApiUtils } from '../utils/ApiUtils';
import { AuthResponse, UserProfile } from '../../../types';

export class AuthService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            this.logOperation('login attempt', { username });

            // Create basic auth token
            const base64Credentials = btoa(`${username}:${password}`);
            const basicAuthToken = `Basic ${base64Credentials}`;
            
            // Set the token in ApiUtils
            this.apiUtils.setToken(basicAuthToken);

            if (Platform.OS !== 'web') {
                // For mobile platforms, use the tickets endpoint with JSON body
                const loginUrl = this.buildUrl('api/-default-/public/authentication/versions/1/tickets');
                
                const response = await this.apiUtils.fetch(
                    loginUrl,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: username,
                            password: password
                        })
                    }
                );

                const ticketData = await this.handleResponse<{ entry: { id: string } }>(response);
                const ticket = ticketData.entry.id;

                // Use the ticket for subsequent requests
                const ticketAuthToken = `Basic ${btoa(`${username}:${ticket}`)}`;
                this.apiUtils.setToken(ticketAuthToken);
            }

            // Test authentication by fetching user profile
            const userProfile = await this.fetchUserProfile(username);

            this.logOperation('login successful', { userId: username });

            return {
                token: this.apiUtils.getToken()!,
                user: userProfile
            };

        } catch (error) {
            this.logError('login failed', error);
            this.apiUtils.setToken(null);
            throw this.createError('Authentication failed', error);
        }
    }

    async logout(): Promise<void> {
        try {
            if (!this.apiUtils.isAuthenticated()) {
                this.logOperation('logout skipped - no active session');
                return;
            }

            this.logOperation('logout started');

            if (Platform.OS !== 'web') {
                const logoutUrl = this.buildUrl('api/-default-/public/authentication/versions/1/tickets/-me-');
                
                try {
                    await this.apiUtils.fetch(
                        logoutUrl,
                        {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                } catch (error) {
                    // Log but don't throw error for logout failures
                    this.logError('logout request failed', error);
                }
            }

            this.apiUtils.setToken(null);
            this.logOperation('logout completed');

        } catch (error) {
            this.logError('logout error', error);
            this.apiUtils.setToken(null);
            throw this.createError('Logout failed', error);
        }
    }

    private async fetchUserProfile(userId: string): Promise<UserProfile> {
        try {
            this.logOperation('fetchUserProfile', { userId });

            const profileUrl = this.buildUrl(`api/-default-/public/alfresco/versions/1/people/${userId}`);
            const response = await this.apiUtils.fetch(profileUrl);
            const data = await this.handleResponse<{ entry: any }>(response);

            if (!data.entry) {
                throw new Error('Invalid user profile response');
            }

            const profile: UserProfile = {
                id: data.entry.id,
                firstName: data.entry.firstName || '',
                lastName: data.entry.lastName || '',
                displayName: data.entry.displayName || 
                           `${data.entry.firstName} ${data.entry.lastName}`.trim() || 
                           userId,
                email: data.entry.email || '',
                username: data.entry.id || userId
            };

            this.logOperation('fetchUserProfile successful', { userId: profile.id });
            return profile;

        } catch (error) {
            this.logError('fetchUserProfile failed', error);
            throw error; // Propagate error to login method
        }
    }

    isAuthenticated(): boolean {
        return this.apiUtils.isAuthenticated();
    }
}