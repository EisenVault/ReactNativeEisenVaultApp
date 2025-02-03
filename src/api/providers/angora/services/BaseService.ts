// src/api/providers/angora/services/BaseService.ts

import { Platform } from 'react-native';
import { ApiUtils } from '../utils/ApiUtils';

/**
 * Common headers configuration
 */
const COMMON_HEADERS = {
    ACCEPT: 'application/json',
    CONTENT_TYPE: 'application/json',
    LOCALE: 'en',
    PORTAL: 'web'
} as const;

interface RequestHeaders {
    'Accept': string;
    'Content-Type': string;
    'Accept-Language': string;
    'Authorization'?: string;
    'x-portal': string;
    'x-service-name'?: string;
}

/**
 * Base class for all Angora service implementations
 * Provides common functionality, error handling, and logging
 */
export abstract class BaseService {
    constructor(
        protected readonly baseUrl: string,
        protected readonly apiUtils: ApiUtils
    ) {
        if (!baseUrl) {
            throw new Error('BaseUrl is required for service initialization');
        }
        this.validateBaseUrl(baseUrl);
    }

    /**
     * Creates standard headers for API requests
     * @param serviceName - Optional service name for x-service-name header
     */
    protected createHeaders(serviceName?: string): RequestHeaders {
        const headers: RequestHeaders = {
            'Accept': COMMON_HEADERS.ACCEPT,
            'Content-Type': COMMON_HEADERS.CONTENT_TYPE,
            'Accept-Language': COMMON_HEADERS.LOCALE,
            'x-portal': COMMON_HEADERS.PORTAL,
        };

        // Add authorization if available
        const token = this.apiUtils.getToken();
        if (token) {
            headers['Authorization'] = token;
        }

        // Add service name if provided
        if (serviceName) {
            headers['x-service-name'] = serviceName;
        }

        return headers;
    }

    /**
     * Validates the base URL format
     */
    private validateBaseUrl(url: string): void {
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`Invalid base URL provided: ${url}`);
        }
    }

    /**
     * Builds a complete API URL
     */
    protected buildUrl(path: string): string {
        const baseUrl = this.baseUrl.endsWith('/') 
            ? this.baseUrl.slice(0, -1) 
            : this.baseUrl;
        
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/api/${cleanPath}`;
    }

    /**
     * Makes an authenticated request with proper error handling
     */
    protected async makeCustomRequest<T>(
        path: string,
        options: RequestInit & { serviceName?: string } = {}
    ): Promise<T> {
        try {
            // Create timeout with abort controller
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 30000);

            // Get headers with proper locale and service name
            const headers = {
                ...this.createHeaders(options.serviceName),
                ...options.headers
            };

            const response = await fetch(this.buildUrl(path), {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw await this.handleErrorResponse(response);
            }

            return this.handleSuccessResponse<T>(response);

        } catch (error) {
            this.logError('Request failed:', error);
            throw error;
        }
    }

    /**
     * Handles successful API response
     */
    private async handleSuccessResponse<T>(response: Response): Promise<T> {
        try {
            const data = await response.json();
            return data;
        } catch (error) {
            throw new Error('Failed to parse response JSON');
        }
    }

    /**
     * Handles error response from API
     */
    private async handleErrorResponse(response: Response): Promise<Error> {
        try {
            const errorData = await response.json();
            
            // Handle Angora specific error format
            if (errorData.errors?.length > 0) {
                const error = errorData.errors[0];
                return new Error(error.message || 'Unknown error occurred');
            }

            return new Error(`HTTP Error: ${response.status}`);
        } catch (error) {
            return new Error(`HTTP Error: ${response.status}`);
        }
    }

    /**
     * Logs operations with consistent format
     */
    protected logOperation(operation: string, details?: any): void {
        console.log(`[${this.constructor.name}] ${operation}`, details || '');
    }

    /**
     * Logs errors with consistent format
     */
    protected logError(message: string, error?: any): void {
        console.error(`[${this.constructor.name}] ${message}`, error || '');
        if (error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Creates a standardized error response
     */
    protected createError(message: string, originalError?: unknown): Error {
        return this.apiUtils.createError(message, originalError);
    }
}