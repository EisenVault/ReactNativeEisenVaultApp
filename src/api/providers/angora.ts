// src/api/providers/angora.ts

import { DMSProvider, AuthResponse, Document, Folder, SearchResult } from '../types';
import { ApiConfig } from '../ApiConfig';

/**
 * Implementation of the DMSProvider interface for Angora DMS
 * This provider implements the same interface as Alfresco but for Angora's API
 * Note: This is a template implementation - actual endpoints and data mapping
 * should be updated according to Angora's API specifications
 */
export class AngoraProvider implements DMSProvider {
  private baseUrl: string;
  private token: string | null = null;

  /**
   * Creates a new instance of the Angora provider
   * @param config - API configuration including baseUrl and timeout
   */
  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl;
  }

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
   * Helper method to construct headers for API requests
   * @returns Headers object with authentication and content type
   */
  private getHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    if (this.token) {
      // Note: Update authorization scheme according to Angora's requirements
      headers.append('Authorization', `Bearer ${this.token}`);
    }

    return headers;
  }

  /**
   * Authenticates with Angora using their authentication endpoint
   * TODO: Update endpoint and response handling according to Angora's auth API
   */
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();

      // Ensure we have a token
      if (!data.token) {
        throw new Error('No authentication token received from server');
      }

      this.token = data.token;

      return {
        token: data.token,
        user: {
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName,
          email: data.user.email,
        },
      };
    } catch (error: unknown) {
      this.token = null;
      throw new Error(this.formatErrorMessage(error, 'Authentication failed: '));
    }
  }

  /**
   * Logs out the current user and invalidates their token
   * TODO: Update endpoint according to Angora's logout API
   */
  async logout(): Promise<void> {
    if (!this.token) return;

    try {
      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Logout request failed');
      }

      this.token = null;
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Logout failed: '));
    }
  }

  /**
   * Retrieves all documents within a specified folder
   * TODO: Update endpoint and response mapping according to Angora's API
   */
  async getDocuments(folderId: string): Promise<Document[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/folders/${folderId}/documents`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch documents');
      }

      const data = await response.json();
      return this.mapAngoraDocuments(data.documents);
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Failed to get documents: '));
    }
  }

  /**
   * Retrieves metadata for a specific document
   * TODO: Update endpoint and response mapping according to Angora's API
   */
  async getDocument(documentId: string): Promise<Document> {
    try {
      const response = await fetch(
        `${this.baseUrl}/documents/${documentId}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch document');
      }

      const data = await response.json();
      return this.mapAngoraDocument(data);
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Failed to get document: '));
    }
  }

  /**
   * Uploads a new document to a specified folder
   * TODO: Update endpoint and file upload handling according to Angora's API
   */
  async uploadDocument(folderId: string, file: File): Promise<Document> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);

      const response = await fetch(`${this.baseUrl}/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      return this.mapAngoraDocument(data);
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Upload failed: '));
    }
  }

  /**
   * Deletes a document
   * TODO: Update endpoint according to Angora's API
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/documents/${documentId}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Delete failed');
      }
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Delete failed: '));
    }
  }

  /**
   * Downloads a document's content
   * TODO: Update endpoint according to Angora's API
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    try {
      const response = await fetch(
        `${this.baseUrl}/documents/${documentId}/download`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      return await response.blob();
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Download failed: '));
    }
  }

  /**
   * Retrieves all folders within a specified parent folder
   * TODO: Update endpoint and response mapping according to Angora's API
   */
  async getFolders(parentFolderId: string): Promise<Folder[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/folders/${parentFolderId}/subfolders`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch folders');
      }

      const data = await response.json();
      return this.mapAngoraFolders(data.folders);
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Failed to get folders: '));
    }
  }

  /**
   * Creates a new folder
   * TODO: Update endpoint and request body according to Angora's API
   */
  async createFolder(parentFolderId: string, name: string): Promise<Folder> {
    try {
      const response = await fetch(`${this.baseUrl}/folders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ parentId: parentFolderId, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create folder');
      }

      const data = await response.json();
      return this.mapAngoraFolder(data);
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Failed to create folder: '));
    }
  }

  /**
   * Deletes a folder and its contents
   * TODO: Update endpoint according to Angora's API
   */
  async deleteFolder(folderId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/folders/${folderId}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete folder');
      }
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Failed to delete folder: '));
    }
  }

  /**
   * Performs a search across the DMS
   * TODO: Update endpoint and search parameters according to Angora's API
   */
  async search(query: string): Promise<SearchResult> {
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Search failed');
      }

      const data = await response.json();
      
      return {
        documents: this.mapAngoraDocuments(data.documents),
        folders: this.mapAngoraFolders(data.folders),
        totalItems: data.totalItems,
      };
    } catch (error: unknown) {
      throw new Error(this.formatErrorMessage(error, 'Search failed: '));
    }
  }

  /**
   * Maps Angora's document response format to our Document interface
   * TODO: Update mapping according to Angora's response format
   */
  private mapAngoraDocument(data: any): Document {
    return {
      id: data.id,
      name: data.name,
      path: data.path,
      mimeType: data.mimeType,
      size: data.size,
      lastModified: data.modifiedAt,
      createdBy: data.createdBy,
      modifiedBy: data.modifiedBy,
      isOfflineAvailable: false,
    };
  }

  /**
   * Maps an array of Angora documents
   */
  private mapAngoraDocuments(documents: any[]): Document[] {
    return documents.map(doc => this.mapAngoraDocument(doc));
  }

  /**
   * Maps Angora's folder response format to our Folder interface
   * TODO: Update mapping according to Angora's response format
   */
  private mapAngoraFolder(data: any): Folder {
    return {
      id: data.id,
      name: data.name,
      path: data.path,
      parentId: data.parentId,
      createdBy: data.createdBy,
      modifiedBy: data.modifiedBy,
    };
  }

  /**
   * Maps an array of Angora folders
   */
  private mapAngoraFolders(folders: any[]): Folder[] {
    return folders.map(folder => this.mapAngoraFolder(folder));
  }
}