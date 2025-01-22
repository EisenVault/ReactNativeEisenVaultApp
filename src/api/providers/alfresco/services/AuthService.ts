// src/api/providers/alfresco/services/AuthService.ts

import { BaseService } from './BaseService';
import { ApiUtils } from '../utils/ApiUtils';
import { AuthResponse, UserProfile } from '../../../types';

export class AuthService extends BaseService {
    private encodedCredentials: string | null = null;

    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            this.logOperation('login attempt', { username });

            // Create base64 encoded credentials
            this.encodedCredentials = btoa(`${username}:${password}`);
            
            // Set the Basic auth token
            const basicAuthToken = `Basic ${this.encodedCredentials}`;
            this.apiUtils.setToken(basicAuthToken);

            const loginUrl = this.buildUrl('api/-default-/public/authentication/versions/1/tickets');
            
            // Get ticket from Alfresco
            const response = await this.apiUtils.fetch(
                loginUrl,
                {
                    method: 'POST',
                    body: JSON.stringify({ userId: username, password: password }),
                }
            );

            const data = await this.handleResponse<{ entry: { id: string; userId: string } }>(response);

            if (!data.entry?.id) {
                throw new Error('Invalid authentication response');
            }

            // Important: Keep using the Basic auth token for subsequent requests
            // Don't switch to the ticket we received
            
            // Fetch user profile using the already set Basic auth token
            const userProfile = await this.fetchUserProfile(username);

            this.logOperation('login successful', { userId: username });

            return {
                token: basicAuthToken, // Return the Basic auth token, not the ticket
                user: userProfile
            };

        } catch (error) {
            this.logError('login failed', error);
            this.apiUtils.setToken(null);
            this.encodedCredentials = null;
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

            const logoutUrl = this.buildUrl('api/-default-/public/authentication/versions/1/tickets/-me-');
            
            try {
                await this.apiUtils.fetch(
                    logoutUrl,
                    {
                        method: 'DELETE',
                    }
                );
            } catch (error) {
                this.logError('logout request failed', error);
            } finally {
                // Always clear the tokens
                this.apiUtils.setToken(null);
                this.encodedCredentials = null;
            }

            this.logOperation('logout completed');

        } catch (error) {
            this.logError('logout error', error);
            this.apiUtils.setToken(null);
            this.encodedCredentials = null;
            throw this.createError('Logout failed', error);
        }
    }

    private async fetchUserProfile(userId: string): Promise<UserProfile> {
        try {
            this.logOperation('fetchUserProfile', { userId });

            const profileUrl = this.buildUrl(`api/-default-/public/alfresco/versions/1/people/${userId}`);
            
            const response = await this.apiUtils.fetch(profileUrl);
            const data = await this.handleResponse<{ entry: any }>(response);

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
            
            // Return a basic profile if fetch fails
            return {
                id: userId,
                firstName: '',
                lastName: '',
                displayName: userId,
                email: '',
                username: userId
            };
        }
    }

    isAuthenticated(): boolean {
        return this.apiUtils.isAuthenticated() && !!this.encodedCredentials;
    }
}