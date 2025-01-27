// src/api/providers/alfresco/utils/ApiUtils.ts

import { Platform } from 'react-native';
import { ApiConfig } from '../../../types';

interface ApiError extends Error {
    cause?: {
        status?: number;
        statusText?: string;
        url?: string;
    };
    name: string;
}

export class ApiUtils {
    private token: string | null = null;
    private readonly timeout: number;

    constructor(private config: ApiConfig) {
        if (!config.baseUrl) {
            throw new Error('Base URL is required in API configuration');
        }
        this.timeout = config.timeout || 30000;
    }

    setToken(token: string | null): void {
        this.token = token;
        this.logOperation('Token updated', { hasToken: !!token });
    }

    getToken(): string | null {
        return this.token;
    }

    isAuthenticated(): boolean {
        return !!this.token;
    }

    async fetch(url: string, options: RequestInit = {}): Promise<Response> {
        try {
            this.logOperation('Fetching', { 
                url, 
                method: options.method || 'GET',
                hasToken: !!this.token
            });

            const headers = new Headers(options.headers || {});
            
            // Set default headers
            if (!headers.has('Content-Type') && !options.body?.toString().includes('FormData')) {
                headers.set('Content-Type', 'application/json');
            }
            
            if (!headers.has('Accept')) {
                headers.set('Accept', 'application/json');
            }

            // Add authentication header if token exists
            if (this.token) {
                headers.set('Authorization', this.token);
                console.log("Token inside ApiUtils.fetch: ", this.token);
            }

            // Mobile-specific headers
            if (Platform.OS !== 'web') {
                // Some servers require this for mobile clients
                headers.set('User-Agent', 'EisenVault-Mobile-App');
            }

            // Add custom headers from config
            if (this.config.headers) {
                Object.entries(this.config.headers).forEach(([key, value]) => {
                    if (!headers.has(key)) {
                        headers.set(key, value);
                    }
                });
            }

            let fetchUrl = url;
            // Handle relative URLs for mobile
            if (Platform.OS !== 'web' && !url.startsWith('http')) {
                fetchUrl = `${this.config.baseUrl}/${url.replace(/^\//, '')}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(fetchUrl, {
                ...options,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

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

        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            this.logError('Fetch failed', error);
            throw this.createError('Network request failed', error);
        }
    }

    async handleResponse<T>(response: Response): Promise<T> {
        try {
            const contentType = response.headers.get('content-type');
            const responseText = await response.text();

            if (!responseText) {
                throw new Error('Empty response received');
            }

            try {
                return JSON.parse(responseText) as T;
            } catch (error) {
                throw new Error(`Invalid JSON response: ${responseText}`);
            }
        } catch (error: unknown) {
            this.logError('Response handling failed', error);
            throw this.createError('Response processing failed', error);
        }
    }

    private async handleErrorResponse(response: Response): Promise<Error> {
        try {
            const contentType = response.headers.get('content-type');
            const responseText = await response.text();
            
            let errorMessage = `HTTP ${response.status}`;
            
            if (contentType?.includes('application/json')) {
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error?.briefSummary || 
                                 errorData.error?.message || 
                                 errorData.message ||
                                 `HTTP ${response.status}: ${response.statusText}`;
                } catch {
                    errorMessage = responseText || response.statusText;
                }
            } else {
                errorMessage = responseText || response.statusText;
            }

            const error = new Error(errorMessage) as ApiError;
            error.cause = { 
                status: response.status, 
                statusText: response.statusText,
                url: response.url 
            };
            return error;
        } catch (error: unknown) {
            return new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }

    createError(message: string, originalError?: unknown): Error {
        const error = new Error(message) as ApiError;
        if (originalError instanceof Error) {
            error.cause = {
                ...(originalError as ApiError).cause,
                statusText: originalError.message
            };
            error.message = `${message}: ${originalError.message}`;
            error.stack = originalError.stack;
        }
        return error;
    }

    private logOperation(operation: string, details?: Record<string, unknown>): void {
        if (__DEV__) {
            console.log(`[ApiUtils] ${operation}:`, this.sanitizeLogData(details || {}));
        }
    }

    private logError(operation: string, error: unknown): void {
        console.error(`[ApiUtils] Error in ${operation}:`, error);
        if (error instanceof Error && error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }

    private sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
        if (!data) return {};

        const sanitized = { ...data };
        const sensitiveFields = ['password', 'token', 'authorization', 'key', 'secret'];

        Object.keys(sanitized).forEach(key => {
            if (sensitiveFields.includes(key.toLowerCase())) {
                sanitized[key] = '***REDACTED***';
            }
        });

        return sanitized;
    }
}