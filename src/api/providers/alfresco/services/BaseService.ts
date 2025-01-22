// src/api/providers/alfresco/services/BaseService.ts

import { ApiUtils } from '../utils/ApiUtils';

/**
 * Base class for all Alfresco service implementations.
 * Provides common functionality, error handling, and logging for all services.
 * All other services (Auth, Document, Folder, etc.) should extend this class.
 */
export abstract class BaseService {
    /**
     * Creates a new service instance
     * @param baseUrl - Base URL for the Alfresco API
     * @param apiUtils - Utility instance for API operations
     * @throws Error if baseUrl is not provided
     */
    public constructor(
        protected readonly baseUrl: string,
        protected readonly apiUtils: ApiUtils
    ) {
        if (!baseUrl) {
            throw new Error('BaseUrl is required for service initialization');
        }
        this.validateBaseUrl(baseUrl);
    }

    /**
     * Validates the base URL format
     * @param url - URL to validate
     * @throws Error if URL is invalid
     */
    private validateBaseUrl(url: string): void {
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`Invalid base URL provided: ${url}`);
        }
    }

    /**
     * Builds a complete API URL by combining the base URL with the provided path
     * Handles proper URL formatting and prevents double slashes
     * @param path - The API endpoint path
     * @returns Complete API URL
     */
    protected buildUrl(path: string): string {
        const baseUrl = this.baseUrl.endsWith('/')
            ? this.baseUrl.slice(0, -1)
            : this.baseUrl;

        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    /**
     * Creates query parameters string from an object
     * @param params - Object containing query parameters
     * @returns Formatted query string
     */
    protected buildQueryString(params: Record<string, any>): string {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(v => searchParams.append(key, v.toString()));
                } else {
                    searchParams.append(key, value.toString());
                }
            }
        });

        const queryString = searchParams.toString();
        return queryString ? `?${queryString}` : '';
    }

    /**
     * Makes an authenticated API request
     * Uses the centralized token management from ApiUtils
     * @param path - API endpoint path
     * @param options - Fetch options
     * @returns Promise resolving to Response
     */
    protected async makeRequest<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = this.buildUrl(path);
        const response = await this.apiUtils.fetch(url, options);
        return this.apiUtils.handleResponse<T>(response);
    }

    /**
     * Logs service operations with consistent format
     * Includes service name and timestamp in logs
     * @param operation - Name of the operation being performed
     * @param details - Optional details to log
     */
    protected logOperation(operation: string, details?: any): void {
        const timestamp = new Date().toISOString();
        const serviceName = this.constructor.name;

        if (details) {
            console.log(`[${timestamp}] [${serviceName}] ${operation}:`, 
                this.sanitizeLogData(details)
            );
        } else {
            console.log(`[${timestamp}] [${serviceName}] ${operation}`);
        }
    }

    /**
     * Logs errors with consistent format and additional context
     * @param operation - Name of the operation that failed
     * @param error - The error that occurred
     * @param context - Optional additional context
     */
    protected logError(operation: string, error: unknown, context?: any): void {
        const timestamp = new Date().toISOString();
        const serviceName = this.constructor.name;

        console.error(`[${timestamp}] [${serviceName}] Error in ${operation}:`, error);

        if (error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }

        if (context) {
            console.error('Additional context:', this.sanitizeLogData(context));
        }
    }

    /**
     * Removes sensitive information from log data
     * @param data - Data to be sanitized
     * @returns Sanitized data safe for logging
     */
    private sanitizeLogData(data: any): any {
        if (!data) return data;

        const sanitized = JSON.parse(JSON.stringify(data));
        const sensitiveFields = ['password', 'token', 'authorization', 'key', 'secret'];

        const processObject = (obj: any): void => {
            Object.keys(obj).forEach(key => {
                if (sensitiveFields.includes(key.toLowerCase())) {
                    obj[key] = '***REDACTED***';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    processObject(obj[key]);
                }
            });
        };

        processObject(sanitized);
        return sanitized;
    }

    /**
     * Creates a standardized error response
     * @param message - Error message
     * @param originalError - Original error object
     * @returns Formatted error object
     */
    protected createError(message: string, originalError?: unknown): Error {
        return this.apiUtils.createError(message, originalError);
    }

    /**
     * Handles API response with type checking and error handling
     * @param response - API response to handle
     * @returns Parsed response data
     */
    protected async handleResponse<T>(response: Response): Promise<T> {
        try {
            return await this.apiUtils.handleResponse<T>(response);
        } catch (error) {
            this.logError('Response handling', error, { 
                status: response.status,
                url: response.url 
            });
            throw this.createError('Failed to handle response', error);
        }
    }
}