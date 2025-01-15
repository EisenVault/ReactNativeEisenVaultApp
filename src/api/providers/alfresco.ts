// src/api/providers/alfresco.ts

import { DMSProvider, AuthResponse, Document, Folder, SearchResult } from '../types';
import { ApiConfig } from '../config';

/**
* Implementation of the DMSProvider interface for Alfresco 5.2
* Handles all communication with the Alfresco Content Services REST API
*/
export class AlfrescoProvider implements DMSProvider {
 private baseUrl: string;
 private token: string | null = null;

 /**
  * Creates a new instance of the Alfresco provider
  * @param config - API configuration including baseUrl and timeout
  */
 constructor(config: ApiConfig) {
   this.baseUrl = config.baseUrl;
 }

 /**
  * Authenticates with Alfresco using the ticket API
  * Reference: https://api-explorer.alfresco.com/api-explorer/#/login/createTicket
  */
 async login(username: string, password: string): Promise<AuthResponse> {
   try {
     console.log('Making login request to:', `${this.baseUrl}/api/-default-/public/authentication/versions/1/tickets`);
     
     // Attempt login request
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/authentication/versions/1/tickets`,
       {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Accept': 'application/json',
         },
         body: JSON.stringify({ userId: username, password }),
       }
     );

     // Log response details for debugging
     console.log('Response status:', response.status);
     console.log('Response headers:', response.headers);

     const contentType = response.headers.get('content-type');
     console.log('Content type:', contentType);

     // Get raw response text first
     const responseText = await response.text();
     console.log('Raw response:', responseText);

     // Try to parse the response as JSON
     let data;
     try {
       data = JSON.parse(responseText);
       console.log('Parsed response:', data);
     } catch (parseError) {
       console.error('JSON parse error:', parseError);
       throw new Error(`Failed to parse response: ${responseText.substring(0, 100)}...`);
     }

     // Check if we got an error response
     if (!response.ok) {
       const errorMessage = data.error?.briefSummary || 'Authentication failed';
       console.error('Authentication error:', errorMessage);
       throw new Error(errorMessage);
     }

     // Validate token in response
     if (!data.entry?.id) {
       console.error('No token in response');
       throw new Error('No authentication token received from server');
     }

     // Store token for future requests
     this.token = data.entry.id;
     console.log('Authentication successful');

     // Return auth response
     return {
       token: data.entry.id,
       user: {
         id: data.entry.userId,
         username: data.entry.userId,
         displayName: data.entry.userId,
         email: '', // Would need separate people API call to get email
       },
     };

   } catch (error) {
     // Reset token and re-throw error
     console.error('Login error in provider:', error);
     this.token = null;
     throw error;
   }
 }

 /**
  * Logs out the current user and invalidates their token
  */
 async logout(): Promise<void> {
   if (!this.token) return;

   try {
     console.log('Attempting logout...');
     
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/authentication/versions/1/tickets/-me-`,
       {
         method: 'DELETE',
         headers: this.getHeaders(),
       }
     );

     console.log('Logout response status:', response.status);

     if (!response.ok) {
       throw new Error('Logout request failed');
     }

     this.token = null;
     console.log('Logout successful');
   } catch (error) {
     console.error('Logout error:', error);
     throw new Error(this.formatErrorMessage(error, 'Logout failed: '));
   }
 }

 /**
  * Retrieves all documents within a specified folder
  */
 async getDocuments(folderId: string): Promise<Document[]> {
   try {
     console.log(`Fetching documents for folder: ${folderId}`);
     
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/alfresco/versions/1/nodes/${folderId}/children?where=(isFile=true)`,
       {
         headers: this.getHeaders(),
       }
     );

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.briefSummary || 'Failed to fetch documents');
     }

     const data = await response.json();
     const documents = data.list.entries.map((entry: any) => this.mapAlfrescoDocument(entry.entry));
     console.log(`Retrieved ${documents.length} documents`);
     
     return documents;
   } catch (error) {
     console.error('Error getting documents:', error);
     throw new Error(this.formatErrorMessage(error, 'Failed to get documents: '));
   }
 }

 /**
  * Retrieves metadata for a specific document
  */
 async getDocument(documentId: string): Promise<Document> {
   try {
     console.log(`Fetching document: ${documentId}`);
     
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/alfresco/versions/1/nodes/${documentId}`,
       {
         headers: this.getHeaders(),
       }
     );

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.briefSummary || 'Failed to fetch document');
     }

     const data = await response.json();
     return this.mapAlfrescoDocument(data.entry);
   } catch (error) {
     console.error('Error getting document:', error);
     throw new Error(this.formatErrorMessage(error, 'Failed to get document: '));
   }
 }
/**
   * Deletes a document from the repository
   * @param documentId - Node ID of the document to delete
   */
async deleteDocument(documentId: string): Promise<void> {
    try {
      console.log(`Deleting document: ${documentId}`);
      
      const response = await fetch(
        `${this.baseUrl}/api/-default-/public/alfresco/versions/1/nodes/${documentId}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.briefSummary || 'Delete failed');
      }
      
      console.log('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(this.formatErrorMessage(error, 'Delete failed: '));
    }
  }
 /**
  * Uploads a new document to a specified folder
  */
 async uploadDocument(folderId: string, file: File): Promise<Document> {
   try {
     console.log(`Uploading file to folder: ${folderId}`);
     
     const formData = new FormData();
     formData.append('filedata', file);
     formData.append('relativePath', file.name);

     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/alfresco/versions/1/nodes/${folderId}/children`,
       {
         method: 'POST',
         headers: {
           Authorization: `Basic ${this.token}`,
         },
         body: formData,
       }
     );

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.briefSummary || 'Upload failed');
     }

     const data = await response.json();
     return this.mapAlfrescoDocument(data.entry);
   } catch (error) {
     console.error('Error uploading document:', error);
     throw new Error(this.formatErrorMessage(error, 'Upload failed: '));
   }
 }

 /**
  * Downloads a document's content
  */
 async downloadDocument(documentId: string): Promise<Blob> {
   try {
     console.log(`Downloading document: ${documentId}`);
     
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/alfresco/versions/1/nodes/${documentId}/content`,
       {
         headers: this.getHeaders(),
       }
     );

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.briefSummary || 'Download failed');
     }

     return await response.blob();
   } catch (error) {
     console.error('Error downloading document:', error);
     throw new Error(this.formatErrorMessage(error, 'Download failed: '));
   }
 }

 /**
  * Retrieves all folders within a specified parent folder
  */
 async getFolders(parentFolderId: string): Promise<Folder[]> {
   try {
     console.log(`Fetching folders for parent: ${parentFolderId}`);
     
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/alfresco/versions/1/nodes/${parentFolderId}/children?where=(isFolder=true)`,
       {
         headers: this.getHeaders(),
       }
     );

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.briefSummary || 'Failed to fetch folders');
     }

     const data = await response.json();
     const folders = data.list.entries.map((entry: any) => this.mapAlfrescoFolder(entry.entry));
     console.log(`Retrieved ${folders.length} folders`);
     
     return folders;
   } catch (error) {
     console.error('Error getting folders:', error);
     throw new Error(this.formatErrorMessage(error, 'Failed to get folders: '));
   }
 }

 /**
  * Creates a new folder
  */
 async createFolder(parentFolderId: string, name: string): Promise<Folder> {
   try {
     console.log(`Creating folder "${name}" in parent: ${parentFolderId}`);
     
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/alfresco/versions/1/nodes/${parentFolderId}/children`,
       {
         method: 'POST',
         headers: this.getHeaders(),
         body: JSON.stringify({
           name,
           nodeType: 'cm:folder',
         }),
       }
     );

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.briefSummary || 'Failed to create folder');
     }

     const data = await response.json();
     return this.mapAlfrescoFolder(data.entry);
   } catch (error) {
     console.error('Error creating folder:', error);
     throw new Error(this.formatErrorMessage(error, 'Failed to create folder: '));
   }
 }

 /**
  * Deletes a folder and its contents
  */
 async deleteFolder(folderId: string): Promise<void> {
   try {
     console.log(`Deleting folder: ${folderId}`);
     
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/alfresco/versions/1/nodes/${folderId}`,
       {
         method: 'DELETE',
         headers: this.getHeaders(),
       }
     );

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.briefSummary || 'Failed to delete folder');
     }
   } catch (error) {
     console.error('Error deleting folder:', error);
     throw new Error(this.formatErrorMessage(error, 'Failed to delete folder: '));
   }
 }

 /**
  * Performs a search across the repository
  */
 async search(query: string): Promise<SearchResult> {
   try {
     console.log(`Performing search with query: ${query}`);
     
     const response = await fetch(
       `${this.baseUrl}/api/-default-/public/search/versions/1/search`,
       {
         method: 'POST',
         headers: this.getHeaders(),
         body: JSON.stringify({
           query: {
             query,
             language: 'afts',
           },
         }),
       }
     );

     if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.error?.briefSummary || 'Search failed');
     }

     const data = await response.json();
     
     const results = {
       documents: data.list.entries
         .filter((entry: any) => entry.entry.isFile)
         .map((entry: any) => this.mapAlfrescoDocument(entry.entry)),
       folders: data.list.entries
         .filter((entry: any) => entry.entry.isFolder)
         .map((entry: any) => this.mapAlfrescoFolder(entry.entry)),
       totalItems: data.list.pagination.totalItems,
     };

     console.log(`Search returned ${results.documents.length} documents and ${results.folders.length} folders`);
     
     return results;
   } catch (error) {
     console.error('Error performing search:', error);
     throw new Error(this.formatErrorMessage(error, 'Search failed: '));
   }
 }

 /**
  * Helper method to construct headers for API requests
  */
 private getHeaders(): Headers {
   const headers = new Headers({
     'Content-Type': 'application/json',
     'Accept': 'application/json',
   });

   if (this.token) {
     headers.append('Authorization', `Basic ${this.token}`);
   }

   return headers;
 }

 /**
  * Helper method to format error messages consistently
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
  * Maps Alfresco's document response format to our Document interface
  */
 private mapAlfrescoDocument(entry: any): Document {
   return {
     id: entry.id,
     name: entry.name,
     path: entry.path.name,
     mimeType: entry.content.mimeType,
     size: entry.content.sizeInBytes,
     lastModified: entry.modifiedAt,
     createdBy: entry.createdByUser.displayName,
     modifiedBy: entry.modifiedByUser.displayName,
     isOfflineAvailable: false,
   };
 }

 /**
  * Maps Alfresco's folder response format to our Folder interface
  */
 private mapAlfrescoFolder(entry: any): Folder {
   return {
     id: entry.id,
     name: entry.name,
     path: entry.path.name,
     parentId: entry.parentId,
     createdBy: entry.createdByUser.displayName,
     modifiedBy: entry.modifiedByUser.displayName,
   };
 }
}