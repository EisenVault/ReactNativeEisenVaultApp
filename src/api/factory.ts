// src/api/factory.ts

import { DMSProvider } from './types';
import { ApiConfig } from './config';
import { AlfrescoProvider } from './providers/alfresco';
import { AngoraProvider } from './providers/angora';

/**
 * Supported DMS provider types
 * Add new provider types here when extending the system
 */
export type ProviderType = 'alfresco' | 'angora';

/**
 * Factory class for creating DMS providers
 * Implements the Factory Pattern to create appropriate provider instances
 * based on the requested type
 */
export class DMSFactory {
  /**
   * Creates and returns an instance of the requested DMS provider
   * 
   * @param type - Type of DMS provider to create ('alfresco' or 'angora')
   * @param config - Configuration for the provider including baseUrl and timeout
   * @returns An instance of the requested provider implementing DMSProvider interface
   * 
   * @example
   * ```typescript
   * const config = {
   *   baseUrl: 'https://alfresco.company.com',
   *   timeout: 30000
   * };
   * const provider = DMSFactory.createProvider('alfresco', config);
   * ```
   * 
   * @throws Error if an unsupported provider type is requested
   */
  static createProvider(type: ProviderType, config: ApiConfig): DMSProvider {
    switch (type) {
      case 'alfresco':
        return new AlfrescoProvider(config);
      case 'angora':
        return new AngoraProvider(config);
      default:
        // TypeScript should prevent this case, but we handle it anyway
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}