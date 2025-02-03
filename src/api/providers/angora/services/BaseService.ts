// src/api/providers/angora/services/BaseService.ts

import { ApiUtils } from '../utils/ApiUtils';

/**
 * Base class for all Angora service implementations
 */
export class BaseService {
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
     * Validates the base URL format and domain
     */
    private validateBaseUrl(url: string): void {
        try {
            const parsedUrl = new URL(url);
            
            // Validate the domain is from the allowed list
            const validDomains = [
                'angorastage.in',
                'eisenvault.localapp'
            ];
            
            const domain = parsedUrl.hostname.split('.').slice(-2).join('.');
            if (!validDomains.some(d => parsedUrl.hostname.endsWith(d))) {
                throw new Error(`Invalid domain. Must be one of: ${validDomains.join(', ')}`);
            }

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Invalid base URL: ${error.message}`);
            }
            throw new Error('Invalid base URL provided');
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
    protected async makeCustomRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
        try {
            const url = this.buildUrl(path);
            this.logOperation('Making request to:', { url, method: options.method });

            // Create timeout with abort controller
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 30000);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type');
            const isJson = contentType?.includes('application/json');
            
            // Always try to get the response text first
            const responseText = await response.text();
            
            // Parse error response
            if (!response.ok) {
                let errorMessage = `HTTP Error: ${response.status}`;
                if (responseText) {
                    try {
                        if (isJson) {
                            const errorData = JSON.parse(responseText);
                            errorMessage = errorData.message || 
                                         errorData.error || 
                                         errorData.error_description ||
                                         errorMessage;
                        } else {
                            errorMessage = responseText;
                        }
                    } catch {
                        errorMessage = responseText;
                    }
                }
                throw new Error(errorMessage);
            }

            // Parse successful response
            let data: T;
            if (isJson && responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch (error) {
                    throw new Error('Invalid JSON response from server');
                }
            } else {
                data = responseText as unknown as T;
            }

            return data;

        } catch (error) {
            this.logError('Request failed:', error);
            throw error;
        }
    }

    /**
     * Logs operations with consistent format
     */
    protected logOperation(operation: string, details?: any): void {
        const sanitizedDetails = this.sanitizeLogData(details || {});
        console.log(`[${this.constructor.name}] ${operation}`, sanitizedDetails);
    }

    /**
     * Logs errors with consistent format
     */
    protected logError(message: string, error?: any): void {
        console.error(`[${this.constructor.name}] ${message}`, error);
        if (error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Sanitizes sensitive data for logging
     */
    private sanitizeLogData(data: any): any {
        if (!data) return data;

        const sanitized = { ...data };
        const sensitiveFields = ['password', 'token', 'authorization', 'secret'];

        Object.keys(sanitized).forEach(key => {
            if (sensitiveFields.includes(key.toLowerCase())) {
                sanitized[key] = '***REDACTED***';
            } else if (typeof sanitized[key] === 'object') {
                sanitized[key] = this.sanitizeLogData(sanitized[key]);
            }
        });

        return sanitized;
    }

    /**
     * Creates a standardized error response
     */
    protected createError(message: string, originalError?: unknown): Error {
        return this.apiUtils.createError(message, originalError);
    }
}