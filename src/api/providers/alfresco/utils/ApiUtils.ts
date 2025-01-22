// src/api/providers/alfresco/utils/ApiUtils.ts

import { Platform } from 'react-native';
import { ApiConfig } from '../../../types';

/**
 * Utility class for handling API requests and responses
 * Provides consistent error handling, request formatting, and authentication management
 */
export class ApiUtils {
    private token: string | null = null;
    private readonly timeout: number;

    /**
     * Creates a new ApiUtils instance
     * @param config - Configuration for API requests
     */
    constructor(private config: ApiConfig) {
        if (!config.baseUrl) {
            throw new Error('Base URL is required in API configuration');
        }
        this.timeout = config.timeout || 30000;
    }

    /**
     * Sets the authentication token for subsequent requests
     * Handles proper formatting for Alfresco's authentication requirements
     * @param token - Authentication token
     */
    setToken(token: string | null): void {
        if (token) {
            // Ensure the token is in the correct format for Alfresco
            // Alfresco expects: "Basic base64(username:password)"
            this.token = token.startsWith('Basic ') ? token : `Basic ${token}`;
        } else {
            this.token = null;
        }
        this.logOperation('Token updated', { hasToken: !!this.token });
    }

    /**
     * Gets the current authentication token
     * @returns Current token or null if not authenticated
     */
    getToken(): string | null {
        return this.token;
    }

    /**
     * Checks if there is an active authenticated session
     * @returns boolean indicating if authenticated
     */
    isAuthenticated(): boolean {
        return !!this.token;
    }

    /**
     * Performs a fetch request with standard error handling and logging
     * Automatically includes authentication if token is present
     * @param url - The URL to fetch from
     * @param options - Fetch options
     */
    async fetch(url: string, options: RequestInit = {}): Promise<Response> {
        try {
            this.logOperation('Fetching', { 
                url, 
                method: options.method || 'GET',
                hasToken: !!this.token
            });

            const headers = new Headers(options.headers || {});
            
            // Set default headers if not already set
            if (!headers.has('Content-Type') && !options.body?.toString().includes('FormData')) {
                headers.set('Content-Type', 'application/json');
            }
            if (!headers.has('Accept')) {
                headers.set('Accept', 'application/json');
            }

            // Add authorization header if token exists
            if (this.token) {
                headers.set('Authorization', this.token);
            }

            // Add any custom headers from config
            if (this.config.headers) {
                Object.entries(this.config.headers).forEach(([key, value]) => {
                    if (!headers.has(key)) {
                        headers.set(key, value);
                    }
                });
            }

            const response = await Promise.race([
                fetch(url, {
                    ...options,
                    headers,
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), this.timeout)
                ),
            ]) as Response;

            // Log response details (in development only)
            if (__DEV__) {
                this.logOperation('Response details', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                });
            }

            if (!response.ok) {
                throw await this.handleErrorResponse(response);
            }

            return response;
        } catch (error) {
            this.logError('Fetch failed', error);
            throw this.createError('Network request failed', error);
        }
    }

    /**
     * Handles API response with proper error checking and parsing
     * @param response - Response object to handle
     */
    async handleResponse<T>(response: Response): Promise<T> {
        try {
            const contentType = response.headers.get('content-type');
            const responseText = await response.text();

            this.logOperation('Processing response', { 
                contentType,
                responseLength: responseText.length 
            });

            if (!responseText) {
                throw new Error('Empty response received');
            }

            try {
                return JSON.parse(responseText) as T;
            } catch (error) {
                throw new Error('Invalid JSON response');
            }
        } catch (error) {
            this.logError('Response handling failed', error);
            throw this.createError('Response processing failed', error);
        }
    }

    /**
     * Creates a standardized error object
     * @param message - Error message
     * @param originalError - Original error object
     */
    createError(message: string, originalError?: unknown): Error {
        const error = new Error(message);
        if (originalError instanceof Error) {
            error.cause = originalError;
            error.message = `${message}: ${originalError.message}`;
            error.stack = originalError.stack;
        }
        return error;
    }

    /**
     * Handles error responses from the API
     * @param response - Error response from fetch
     */
    private async handleErrorResponse(response: Response): Promise<Error> {
        try {
            const contentType = response.headers.get('content-type');
            const responseText = await response.text();
            
            let errorMessage = `HTTP ${response.status}`;
            
            if (contentType?.includes('application/json')) {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.error?.briefSummary || 
                             errorData.error?.message || 
                             errorData.message ||
                             `HTTP ${response.status}: ${response.statusText}`;
            } else {
                errorMessage = responseText || response.statusText;
            }

            const error = new Error(errorMessage);
            error.cause = { status: response.status, statusText: response.statusText };
            return error;
        } catch (error) {
            return new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }

    /**
     * Logs operations with consistent format
     * @param operation - Operation being performed
     * @param details - Optional operation details
     */
    private logOperation(operation: string, details?: any): void {
        if (__DEV__) {
            if (details) {
                console.log(`[ApiUtils] ${operation}:`, details);
            } else {
                console.log(`[ApiUtils] ${operation}`);
            }
        }
    }

    /**
     * Logs errors with consistent format
     * @param operation - Operation that failed
     * @param error - Error details
     */
    private logError(operation: string, error: unknown): void {
        console.error(`[ApiUtils] Error in ${operation}:`, error);
        if (error instanceof Error && error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
}