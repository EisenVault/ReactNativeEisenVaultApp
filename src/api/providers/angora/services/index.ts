// src/api/providers/angora/services/index.ts

import { ApiConfig } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';
import { AuthService } from './AuthService';
import { DocumentService } from './DocumentService';
import { FolderService } from './FolderService';
import { SearchService } from './SearchService';
import { UserService } from './UserService';

// Export all services for direct access when needed
export * from './AuthService';
export * from './DocumentService';
export * from './FolderService';
export * from './SearchService';
export * from './UserService';
export * from './BaseService';

/**
 * Interface defining the shape of our service registry
 */
export interface ServiceRegistry {
    auth: AuthService;
    documents: DocumentService;
    folders: FolderService;
    search: SearchService;
    users: UserService;
}

/**
 * Type guard to check if a provided config is valid
 */
function isValidConfig(config: ApiConfig): boolean {
    if (!config.baseUrl) {
        throw new Error('Base URL is required in API configuration');
    }

    try {
        new URL(config.baseUrl);
    } catch {
        throw new Error(`Invalid base URL: ${config.baseUrl}`);
    }

    if (config.timeout !== undefined && 
        (!Number.isInteger(config.timeout) || config.timeout <= 0)) {
        throw new Error('Timeout must be a positive integer');
    }

    return true;
}

/**
 * Creates and configures service instances with shared dependencies
 * @param config - Configuration for the API and services
 * @returns ServiceRegistry containing all initialized services
 */
export function createServices(config: ApiConfig): ServiceRegistry {
    // Validate configuration
    if (!isValidConfig(config)) {
        throw new Error('Invalid service configuration');
    }
    
    try {
        // Create a single shared instance of ApiUtils
        const apiUtils = new ApiUtils(config);

        // Initialize and return all services with shared dependencies
        return {
            auth: new AuthService(config.baseUrl, apiUtils),
            documents: new DocumentService(config.baseUrl, apiUtils),
            folders: new FolderService(config.baseUrl, apiUtils),
            search: new SearchService(config.baseUrl, apiUtils),
            users: new UserService(config.baseUrl, apiUtils)
        };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to initialize services: ${error.message}`);
        } else {
            throw new Error('Failed to initialize services: Unknown error');
        }
    }
}

/**
 * Factory function to create a single service instance
 * Useful when only one service is needed
 * @param config - API configuration
 * @param serviceType - Type of service to create
 * @returns Instance of requested service
 */
export function createService<T extends keyof ServiceRegistry>(
    config: ApiConfig,
    serviceType: T
): ServiceRegistry[T] {
    if (!isValidConfig(config)) {
        throw new Error('Invalid service configuration');
    }

    const apiUtils = new ApiUtils(config);

    switch (serviceType) {
        case 'auth':
            return new AuthService(config.baseUrl, apiUtils) as ServiceRegistry[T];
        case 'documents':
            return new DocumentService(config.baseUrl, apiUtils) as ServiceRegistry[T];
        case 'folders':
            return new FolderService(config.baseUrl, apiUtils) as ServiceRegistry[T];
        case 'search':
            return new SearchService(config.baseUrl, apiUtils) as ServiceRegistry[T];
        case 'users':
            return new UserService(config.baseUrl, apiUtils) as ServiceRegistry[T];
        default:
            throw new Error(`Unknown service type: ${serviceType}`);
    }
}

// Default export for the service factory
export default {
    createServices,
    createService
};