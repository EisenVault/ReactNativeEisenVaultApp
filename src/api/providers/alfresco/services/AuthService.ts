// src/api/providers/alfresco/services/AuthService.ts

import { Platform } from 'react-native';
import { BaseService } from './BaseService';
import { ApiUtils } from '../utils/ApiUtils';
import { AuthResponse, UserProfile } from '../../../types';

// Configuration constants
const CONFIG = {
    TIMEOUT: 30000, // 30 seconds timeout
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // Base delay of 2 seconds between retries
    LOG_PREFIX: '[AuthService]'
};

// Type definitions for API responses
interface TicketResponse {
    entry: {
        id: string;
    };
}

interface ProfileResponse {
    entry: {
        id: string;
        firstName?: string;
        lastName?: string;
        displayName?: string;
        email?: string;
    };
}

interface RequestHeaders {
    'Accept': string;
    'Content-Type': string;
    'Authorization'?: string;
}

export class AuthService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    /**
     * Creates a delay promise for the specified duration
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Logging utilities with consistent formatting
     */
    private log = {
        info: (message: string, data?: any) => console.log(`${CONFIG.LOG_PREFIX} ${message}`, data || ''),
        error: (message: string, error?: any) => console.error(`${CONFIG.LOG_PREFIX} ${message}`, error || ''),
        debug: (message: string, data?: any) => console.debug(`${CONFIG.LOG_PREFIX} ${message}`, data || '')
    };

    /**
     * Creates a timeout promise with abort controller
     * This is a cross-platform compatible implementation that works on Android
     */
    private createTimeoutPromise(): { controller: AbortController; timeoutPromise: Promise<never> } {
        const controller = new AbortController();
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                controller.abort();
                reject(new Error('Request timeout'));
            }, CONFIG.TIMEOUT);
        });
        return { controller, timeoutPromise };
    }

    /**
     * Protected request handler that adds necessary headers and timeout
     * Works across all platforms (web, iOS, and Android)
     */
    protected async makeCustomRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
        // Debug log for mobile requests
        if (Platform.OS !== 'web') {
            this.log.debug('Making mobile request:', {
                url,
                method: options.method || 'GET',
                hasToken: !!this.apiUtils.getToken(),
                platform: Platform.OS
            });
        }

        try {
            this.log.debug("Inside makeCustomRequest ... token from apiUtils: ", this.apiUtils.getToken());
            
            // Create timeout with abort controller
            const { controller, timeoutPromise } = this.createTimeoutPromise();

            const headers: RequestHeaders = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // Only add Authorization header if we have a token
            const token = this.apiUtils.getToken();
            if (token) {
                headers['Authorization'] = token;
            }

            const fetchOptions: RequestInit = {
                ...options,
                signal: controller.signal,
                headers: {
                    ...headers,
                    ...options.headers,
                }
            };

            // Additional debug logging
            this.log.debug('Fetch configuration:', {
                method: fetchOptions.method,
                hasHeaders: !!fetchOptions.headers,
                hasSignal: !!fetchOptions.signal
            });

            // Race between the fetch and the timeout
            const response = await Promise.race([
                fetch(url, fetchOptions),
                timeoutPromise
            ]) as Response;

            // Debug log response
            this.log.debug('Response received:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const jsonData = await response.json();
            return jsonData;
        } catch (error) {
            if (error instanceof Error) {
                this.log.error('Request failed:', {
                    url,
                    method: options.method,
                    errorMessage: error.message,
                    errorStack: error.stack
                });
            }
            throw error;
        }
    }

    /**
     * Handles the mobile-specific authentication flow
     * Uses the ticket-based authentication for mobile platforms
     */
    private async handleMobileAuth(username: string, password: string): Promise<void> {
        try {
            this.log.info('Using mobile authentication flow');
            const loginUrl = this.buildUrl('api/-default-/public/authentication/versions/1/tickets');
            this.log.debug('Login URL:', loginUrl);

            // Use the existing basic auth token for this request
            const response = await this.makeCustomRequest<TicketResponse>(loginUrl, {
                method: 'POST',
                body: JSON.stringify({
                    userId: username,
                    password: password
                })
            });

            if (!response?.entry?.id) {
                throw new Error('Invalid ticket response');
            }

            // Continue using the same basic auth token (username:password)
            // No need to create a new token with the ticket
            this.log.debug('Continuing with initial auth token');
            
        } catch (error) {
            this.log.error('Mobile login request failed:', error);
            throw error;
        }
    }

    /**
     * Fetches user profile with retry logic
     * Will retry failed requests up to MAX_RETRIES times
     */
    private async fetchUserProfileWithRetry(userId: string, retryCount = 0): Promise<UserProfile> {
        try {
            this.log.debug(`Fetching user profile (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
            const profileUrl = this.buildUrl(`api/-default-/public/alfresco/versions/1/people/${userId}`);
            
            const data = await this.makeCustomRequest<ProfileResponse>(profileUrl);
            
            if (!data?.entry) {
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

            this.log.debug('Profile processed successfully');
            return profile;

        } catch (error) {
            this.log.error(`Profile fetch attempt ${retryCount + 1} failed:`, error);

            if (retryCount < CONFIG.MAX_RETRIES - 1) {
                const delayTime = CONFIG.RETRY_DELAY * (retryCount + 1); // Progressive delay
                this.log.debug(`Retrying after ${delayTime}ms...`);
                await this.delay(delayTime);
                return this.fetchUserProfileWithRetry(userId, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Main login method
     * Handles both web and mobile authentication flows
     */
    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            this.log.info('Starting login process');
            this.log.debug('Platform:', Platform.OS);
            this.log.debug('Base URL:', this.baseUrl);

            // Create basic auth token for initial auth
            const base64Credentials = btoa(`${username}:${password}`);
            const basicAuthToken = `Basic ${base64Credentials}`;
            
            this.log.debug('Setting initial auth token');
            this.apiUtils.setToken(basicAuthToken);

            if (Platform.OS !== 'web') {
                await this.handleMobileAuth(username, password);
            } else {
                this.log.info('Using web authentication flow');
            }

            this.log.info('Fetching user profile');
            const userProfile = await this.fetchUserProfileWithRetry(username);
            this.log.info('User profile fetched successfully');

            return {
                token: this.apiUtils.getToken()!,
                user: userProfile
            };

        } catch (error) {
            this.log.error('Login failed:', error);
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
            this.log.info('Starting logout process');
            if (!this.apiUtils.isAuthenticated()) {
                this.log.info('No active session, skipping logout');
                return;
            }

            if (Platform.OS !== 'web') {
                this.log.info('Using mobile logout flow');
                const logoutUrl = this.buildUrl('api/-default-/public/authentication/versions/1/tickets/-me-');
                
                try {
                    await this.makeCustomRequest(logoutUrl, {
                        method: 'DELETE'
                    });
                    this.log.info('Mobile logout request successful');
                } catch (error) {
                    this.log.error('Mobile logout request failed:', error);
                }
            }

            this.apiUtils.setToken(null);
            this.log.info('Logout completed');

        } catch (error) {
            this.log.error('Logout error:', error);
            this.apiUtils.setToken(null);
            throw this.createError('Logout failed', error);
        }
    }

    /**
     * Checks if the user is currently authenticated
     */
    isAuthenticated(): boolean {
        return this.apiUtils.isAuthenticated();
    }
}