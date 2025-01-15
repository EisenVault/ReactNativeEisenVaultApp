// src/examples/dms-usage.ts

import { DMSFactory, ApiConfig, Document, ProviderType } from '../api';

/**
 * Class that manages document operations and handles DMS interactions
 * Provides a high-level interface for document management operations
 */
export class DocumentManager {
  private provider;
  private isAuthenticated = false;

  /**
   * Helper method to format error messages consistently
   * @param error - The caught error
   * @param prefix - Prefix for the error message
   * @returns Formatted error message
   */
  private formatErrorMessage(error: unknown, prefix: string): string {
    let errorMessage = prefix;
    
    if (error instanceof Error) {
      errorMessage += error.message;
    } else if (typeof error === 'string') {
      errorMessage += error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage += error.message;
    } else {
      errorMessage += 'An unknown error occurred';
    }
    
    return errorMessage;
  }

  /**
   * Creates a new DocumentManager instance
   * @param providerType - Type of DMS to use ('alfresco' or 'angora')
   * @param baseUrl - Base URL of the DMS server
   */
  constructor(providerType: ProviderType, baseUrl: string) {
    const config: ApiConfig = {
      baseUrl,
      timeout: 30000,
    };
    this.provider = DMSFactory.createProvider(providerType, config);
  }

  /**
   * Authenticates with the DMS
   * @param username - User's username
   * @param password - User's password
   * @throws Error if authentication fails
   */
  async authenticate(username: string, password: string): Promise<void> {
    try {
      await this.provider.login(username, password);
      this.isAuthenticated = true;
    } catch (error: unknown) {
      this.isAuthenticated = false;
      throw new Error(this.formatErrorMessage(error, 'Authentication failed: '));
    }
  }

  /**
   * Fetches documents from a specific folder
   * @param folderId - ID of the folder to list documents from
   * @returns Object containing documents array and optional error message
   */
  async listFolderContents(folderId: string): Promise<{
    documents: Document[];
    error?: string;
  }> {
    if (!this.isAuthenticated) {
      return { 
        documents: [], 
        error: 'Not authenticated. Please login first.' 
      };
    }

    try {
      const documents = await this.provider.getDocuments(folderId);
      return { documents };
    } catch (error: unknown) {
      return { 
        documents: [], 
        error: this.formatErrorMessage(error, 'Error fetching documents: ')
      };
    }
  }

  /**
   * Uploads a new document
   * @param folderId - Destination folder ID
   * @param file - File to upload
   * @returns Object containing upload status, document metadata, and optional error
   */
  async uploadDocument(folderId: string, file: File): Promise<{
    success: boolean;
    document?: Document;
    error?: string;
  }> {
    if (!this.isAuthenticated) {
      return { 
        success: false, 
        error: 'Not authenticated. Please login first.' 
      };
    }

    try {
      const document = await this.provider.uploadDocument(folderId, file);
      return { 
        success: true, 
        document 
      };
    } catch (error: unknown) {
      return { 
        success: false, 
        error: this.formatErrorMessage(error, 'Upload failed: ')
      };
    }
  }

  /**
   * Downloads a document
   * @param documentId - ID of the document to download
   * @returns Object containing download status, blob data, and optional error
   */
  async downloadDocument(documentId: string): Promise<{
    success: boolean;
    data?: Blob;
    error?: string;
  }> {
    if (!this.isAuthenticated) {
      return { 
        success: false, 
        error: 'Not authenticated. Please login first.' 
      };
    }

    try {
      const blob = await this.provider.downloadDocument(documentId);
      return { 
        success: true, 
        data: blob 
      };
    } catch (error: unknown) {
      return { 
        success: false, 
        error: this.formatErrorMessage(error, 'Download failed: ')
      };
    }
  }

  /**
   * Searches for documents and folders
   * @param query - Search query string
   * @returns Object containing search results and optional error
   */
  async search(query: string): Promise<{
    success: boolean;
    results?: {
      documents: Document[];
      totalItems: number;
    };
    error?: string;
  }> {
    if (!this.isAuthenticated) {
      return { 
        success: false, 
        error: 'Not authenticated. Please login first.' 
      };
    }

    try {
      const searchResults = await this.provider.search(query);
      return { 
        success: true, 
        results: {
          documents: searchResults.documents,
          totalItems: searchResults.totalItems
        }
      };
    } catch (error: unknown) {
      return { 
        success: false, 
        error: this.formatErrorMessage(error, 'Search failed: ')
      };
    }
  }

  /**
   * Cleans up resources and logs out
   * Should be called when done using the DocumentManager
   */
  async dispose(): Promise<void> {
    if (this.isAuthenticated) {
      try {
        await this.provider.logout();
      } catch (error: unknown) {
        console.error(this.formatErrorMessage(error, 'Logout failed: '));
      } finally {
        this.isAuthenticated = false;
      }
    }
  }
}

// Example usage with proper error handling
async function example(): Promise<void> {
  const docManager = new DocumentManager(
    'alfresco', 
    'https://your-alfresco-server.com'
  );

  try {
    // Authenticate
    await docManager.authenticate('username', 'password');

    // List documents
    const { documents, error: listError } = await docManager.listFolderContents('some-folder-id');
    if (listError) {
      console.error('Error listing documents:', listError);
    } else {
      console.log('Documents:', documents);
    }

    // Upload a document
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const uploadResult = await docManager.uploadDocument('some-folder-id', file);
    if (uploadResult.success) {
      console.log('Upload successful:', uploadResult.document);
    } else {
      console.error('Upload failed:', uploadResult.error);
    }

    // Search for documents
    const searchResult = await docManager.search('query');
    if (searchResult.success) {
      console.log('Search results:', searchResult.results);
    } else {
      console.error('Search failed:', searchResult.error);
    }

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Operation failed:', error.message);
    } else {
      console.error('An unknown error occurred');
    }
  } finally {
    // Always clean up
    await docManager.dispose();
  }
}