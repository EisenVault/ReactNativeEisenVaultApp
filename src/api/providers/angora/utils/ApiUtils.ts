// src/api/providers/angora/utils/ApiUtils.ts

import { Platform } from 'react-native';
import { ApiConfig } from '../../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Interface for structured error responses from the Angora API
 */
interface AngoraErrorResponse {
    error?: {
        code?: string;
        message?: string;
        details?: any;
    };
    status?: number;
    message?: string;
}

/**
 * Interface for API error object with additional context
 */
interface ApiError extends Error {
    status?: number;
    code?: string;
    details?: any;
    originalError?: any;
}

/**
 * Configuration constants for the API
 */
const API_CONFIG = {
    // Default timeout in milliseconds
    DEFAULT_TIMEOUT: 30000,
    
    // Storage keys for persistent data
    STORAGE_KEYS: {
        AUTH_TOKEN: '@AngoraApi:token',
        REFRESH_TOKEN: '@AngoraApi:refreshToken',
    },
    
    // HTTP status codes
    HTTP_STATUS: {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        TIMEOUT: 408,
        SERVER_ERROR: 500,
    },
    
    // Header names
    HEADERS: {
        AUTHORIZATION: 'Authorization',
        CONTENT_TYPE: 'Content-Type',
        PORTAL: 'x-portal',
        SERVICE_NAME: 'x-service-name',
    },
} as const;

/**
 * ApiUtils class handles all API-related utilities including:
 * - Authentication token management
 * - Request/response processing
 * - Error handling
 * - Logging
 */
export class ApiUtils {
    private token: string | null = null;
    private refreshToken: string | null = null;
    private readonly config: ApiConfig;
    private isRefreshing: boolean = false;
    private refreshSubscribers: Array<(token: string) => void> = [];

    constructor(config: ApiConfig) {
        this.config = {
            ...config,
            timeout: config.timeout || API_CONFIG.DEFAULT_TIMEOUT,
        };
        this.initializeTokens().catch(error => 
            this.logError('Failed to initialize tokens', error)
        );
    }

    /**
     * Initialize tokens from storage on startup
     * @private
     */
    private async initializeTokens(): Promise<void> {
        try {
            const [authToken, refreshToken] = await Promise.all([
                AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN),
                AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN),
            ]);
            
            if (authToken) this.token = authToken;
            if (refreshToken) this.refreshToken = refreshToken;
            
            this.logDebug('Tokens initialized', { hasAuthToken: !!authToken, hasRefreshToken: !!refreshToken });
        } catch (error) {
            this.logError('Token initialization failed', error);
            throw error;
        }
    }

    /**
     * Set the authentication token and store it
     * @param token - JWT token or null to clear
     */
    async setToken(token: string | null): Promise<void> {
        try {
            this.token = token;
            if (token) {
                await AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
                this.logDebug('Auth token stored');
            } else {
                await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
                this.logDebug('Auth token cleared');
            }
        } catch (error) {
            this.logError('Failed to handle token storage', error);
            throw this.createError('Token storage failed', error);
        }
    }

    /**
     * Set the refresh token and store it
     * @param token - Refresh token or null to clear
     */
    async setRefreshToken(token: string | null): Promise<void> {
        try {
            this.refreshToken = token;
            if (token) {
                await AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, token);
                this.logDebug('Refresh token stored');
            } else {
                await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
                this.logDebug('Refresh token cleared');
            }
        } catch (error) {
            this.logError('Failed to handle refresh token storage', error);
            throw this.createError('Refresh token storage failed', error);
        }
    }

    /**
     * Get the current auth token
     */
    getToken(): string | null {
        return this.token;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.token;
    }

    /**
     * Make an authenticated API request
     * Handles token refresh and request retries
     */
    async fetch(url: string, options: RequestInit = {}): Promise<Response> {
        try {
            this.logDebug('Making API request', { 
                url, 
                method: options.method || 'GET',
                hasToken: !!this.token
            });

            // Create headers with defaults and auth token
            const headers = new Headers(options.headers || {});
            
            if (!headers.has(API_CONFIG.HEADERS.CONTENT_TYPE) && 
                !options.body?.toString().includes('FormData')) {
                headers.set(API_CONFIG.HEADERS.CONTENT_TYPE, 'application/json');
            }
            
            if (this.token) {
                headers.set(API_CONFIG.HEADERS.AUTHORIZATION, this.token);
            }

            // Set portal header based on platform
            headers.set(
                API_CONFIG.HEADERS.PORTAL, 
                Platform.OS === 'web' ? 'web' : 'mobile'
            );

            // Add custom headers from config
            if (this.config.headers) {
                Object.entries(this.config.headers).forEach(([key, value]) => {
                    if (!headers.has(key)) {
                        headers.set(key, value);
                    }
                });
            }

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            // Make the request
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Handle 401 with token refresh
            if (response.status === API_CONFIG.HTTP_STATUS.UNAUTHORIZED && this.refreshToken) {
                const newToken = await this.handleTokenRefresh();
                if (newToken) {
                    headers.set(API_CONFIG.HEADERS.AUTHORIZATION, newToken);
                    return fetch(url, {
                        ...options,
                        headers,
                    });
                }
            }

            if (!response.ok) {
                throw await this.handleErrorResponse(response);
            }

            this.logDebug('Request successful', {
                status: response.status,
                url: response.url
            });

            return response;

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw this.createError('Request timeout', error);
            }
            this.logError('Request failed', error);
            throw this.createError('Request failed', error);
        }
    }

    /**
     * Handle token refresh process
     * Manages concurrent refresh requests
     * @private
     */
    private async handleTokenRefresh(): Promise<string | null> {
        try {
            // If already refreshing, wait for completion
            if (this.isRefreshing) {
                return new Promise(resolve => {
                    this.refreshSubscribers.push(resolve);
                });
            }

            this.isRefreshing = true;
            this.logDebug('Starting token refresh');

            const response = await fetch(`${this.config.baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.refreshToken}`,
                },
            });

            if (!response.ok) {
                throw await this.handleErrorResponse(response);
            }

            const data = await response.json();
            const newToken = data.token;

            await this.setToken(newToken);
            
            // Notify subscribers
            this.refreshSubscribers.forEach(callback => callback(newToken));
            this.refreshSubscribers = [];

            this.logDebug('Token refresh successful');
            return newToken;

        } catch (error) {
            this.logError('Token refresh failed', error);
            await this.setToken(null);
            await this.setRefreshToken(null);
            throw this.createError('Token refresh failed', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Process API response and parse JSON
     */
    async handleResponse<T>(response: Response): Promise<T> {
        try {
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                throw new Error('Invalid response content type');
            }

            const data = await response.json();
            return data as T;
        } catch (error) {
            this.logError('Response processing failed', error);
            throw this.createError('Invalid response format', error);
        }
    }

    /**
     * Handle error responses from the API
     * @private
     */
    private async handleErrorResponse(response: Response): Promise<Error> {
        try {
            const contentType = response.headers.get('content-type');
            const responseText = await response.text();
            
            let errorMessage = `HTTP ${response.status}`;
            let errorDetails: any = {};
            
            if (contentType?.includes('application/json') && responseText) {
                try {
                    const errorData: AngoraErrorResponse = JSON.parse(responseText);
                    errorMessage = errorData.error?.message || 
                                 errorData.message || 
                                 `HTTP ${response.status}: ${response.statusText}`;
                    errorDetails = {
                        code: errorData.error?.code,
                        details: errorData.error?.details,
                        status: response.status,
                    };
                } catch {
                    errorMessage = responseText;
                }
            }

            const error = this.createError(errorMessage) as ApiError;
            error.status = response.status;
            error.code = errorDetails.code;
            error.details = errorDetails.details;
            
            return error;
        } catch (error) {
            return this.createError(`HTTP ${response.status}: ${response.statusText}`, error);
        }
    }

    /**
     * Create standardized error object
     */
    createError(message: string, originalError?: unknown): Error {
        const error = new Error(message) as ApiError;
        if (originalError instanceof Error) {
            error.stack = originalError.stack;
            error.originalError = originalError;
        }
        return error;
    }

    /**
     * Logging utilities
     */
    private logDebug(message: string, data?: any): void {
        if (__DEV__) {
            console.debug(`[ApiUtils] ${message}:`, this.sanitizeLogData(data || {}));
        }
    }

    private logError(message: string, error?: any): void {
        console.error(`[ApiUtils] ${message}:`, error);
        if (error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Remove sensitive data before logging
     * @private
     */
    private sanitizeLogData(data: Record<string, any>): Record<string, any> {
        const sanitized = { ...data };
        const sensitiveFields = ['password', 'token', 'authorization', 'key', 'secret'];

        Object.keys(sanitized).forEach(key => {
            if (sensitiveFields.includes(key.toLowerCase())) {
                sanitized[key] = '***REDACTED***';
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeLogData(sanitized[key]);
            }
        });

        return sanitized;
    }
}