// src/api/config.ts

/**
 * Configuration options for DMS providers
 */
export interface ApiConfig {
    /**
     * Base URL of the DMS server
     * Example: 'https://alfresco.company.com'
     */
    baseUrl: string;
  
    /**
     * Request timeout in milliseconds
     * Default is usually 30000 (30 seconds)
     */
    timeout: number;
  
    /**
     * Optional additional headers to include in all requests
     * Example: { 'X-Custom-Header': 'value' }
     */
    headers?: Record<string, string>;
  }