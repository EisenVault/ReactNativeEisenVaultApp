// src/api/providers/alfresco/services/index.ts

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
 * ServiceRegistry interface defines the shape of our service container
 */
export interface ServiceRegistry {
    auth: AuthService;
    documents: DocumentService;
    folders: FolderService;
    search: SearchService;
    users: UserService;
}

/**
 * Creates and configures service instances with shared dependencies
 * @param config - Configuration for the API and services
 * @returns ServiceRegistry containing all initialized services
 */
export function createServices(config: ApiConfig): ServiceRegistry {
    validateConfig(config);
    
    try {
        // Create a single shared instance of ApiUtils
        const apiUtils = new ApiUtils(config);

        // Return initialized services
        return {
            auth: new AuthService(config.baseUrl, apiUtils),
            documents: new DocumentService(config.baseUrl, apiUtils),
            folders: new FolderService(config.baseUrl, apiUtils),
            search: new SearchService(config.baseUrl, apiUtils),
            users: new UserService(config.baseUrl, apiUtils)
        };
    } catch (error) {
        throw new Error(`Failed to initialize services: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Validates the provided configuration
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateConfig(config: ApiConfig): void {
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
}