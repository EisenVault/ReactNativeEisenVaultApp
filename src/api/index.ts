// src/api/index.ts

/**
 * Main API module for the Document Management System
 * This file serves as the entry point for the DMS API layer
 * 
 * @module api
 */

/**
 * Re-export all types and interfaces
 */
export * from './types';


/**
 * Re-export the factory for creating providers
 */
export * from './factory';

/**
 * Re-export individual providers
 * Note: Usually, you should use the factory instead of instantiating these directly
 */
export * from './providers/alfresco/AlfrescoProvider';
export * from './providers/angora';

/**
 * Example usage of the DMS API:
 * 
 * @example
 * ```typescript
 * import { DMSFactory, ApiConfig } from './api';
 * 
 * // Create configuration
 * const config: ApiConfig = {
 *   baseUrl: 'https://your-dms-server.com',
 *   timeout: 30000,
 * };
 * 
 * // Create provider instance
 * const provider = DMSFactory.createProvider('alfresco', config);
 * 
 * // Use the provider
 * async function fetchDocuments(folderId: string) {
 *   try {
 *     // Login first
 *     await provider.login('username', 'password');
 *     
 *     // Then fetch documents
 *     const documents = await provider.getDocuments(folderId);
 *     console.log('Documents:', documents);
 *     
 *     // Don't forget to logout when done
 *     await provider.logout();
 *   } catch (error) {
 *     console.error('Error:', error);
 *   }
 * }
 * ```
 */