// src/api/types.ts

/**
 * Represents the complete user profile information.
 * Used for displaying user details and personalizing the interface.
 */
export interface UserProfile {
  id: string;           // Unique identifier for the user
  firstName: string;    // User's first name
  lastName: string;     // User's last name
  displayName: string;  // Full display name
  email: string;       // User's email address
  username: string;    // Login username
}

/**
 * Authentication response structure.
 * Contains both the authentication token and user information.
 * Returned after successful login operations.
 */
export interface AuthResponse {
  token: string;      // JWT or session token for subsequent requests
  user: UserProfile;  // User profile information
}

/**
 * Document metadata structure.
 * Represents a document in the Document Management System (DMS).
 * Contains all essential information about a stored document.
 */
export interface Document {
  id: string;                 // Unique identifier for the document
  name: string;              // File name with extension
  path: string;              // Full hierarchical path to the document in the DMS
  mimeType: string;          // MIME type (e.g., 'application/pdf', 'image/jpeg')
  size: number;              // File size in bytes
  lastModified: string;      // ISO 8601 timestamp of last modification
  createdBy: string;         // Username or ID of document creator
  modifiedBy: string;        // Username or ID of last modifier
  isOfflineAvailable: boolean; // Indicates if document is cached for offline access
}

/**
 * Folder structure.
 * Represents a folder/directory in the DMS hierarchy.
 * Used for organizing documents and managing the file structure.
 */
export interface Folder {
  id: string;         // Unique identifier for the folder
  name: string;       // Display name of the folder
  path: string;       // Full hierarchical path to the folder
  parentId: string | null;  // ID of the parent folder (null indicates root folder)
  createdBy: string;  // Username or ID of folder creator
  modifiedBy: string; // Username or ID of last modifier
}

/**
 * Search results structure.
 * Contains combined search results for both documents and folders.
 * Used when performing global or scoped searches in the DMS.
 */
export interface SearchResult {
  documents: Document[];  // Array of matching document metadata
  folders: Folder[];     // Array of matching folder metadata
  totalItems: number;    // Total count of all matches (for pagination)
}

/**
 * API Configuration interface.
 * Used to configure the DMS provider with necessary connection parameters.
 * Essential for initializing the DMS client.
 */
export interface ApiConfig {
  baseUrl: string;    // Root URL of the DMS API endpoint
  timeout: number;    // Request timeout duration in milliseconds
  /**
   * Optional additional headers to include in all requests
   * Example: { 'X-Custom-Header': 'value', 'Authorization': 'Bearer token' }
   */
  headers?: Record<string, string>;
}

/**
 * Main DMS Provider interface.
 * Defines the contract that any DMS provider implementation must fulfill.
 * Includes all core operations for document and folder management.
 */
export interface DMSProvider {
  // Authentication methods
  login(username: string, password: string): Promise<AuthResponse>;
  logout(): Promise<void>;
  
  // Document Operations
  getDocuments(folderId: string): Promise<Document[]>;
  getDocument(documentId: string): Promise<Document>;
  uploadDocument(folderId: string, file: File): Promise<Document>;
  deleteDocument(documentId: string): Promise<void>;
  downloadDocument(documentId: string): Promise<Blob>;
  
  // Folder Operations
  getFolders(parentFolderId: string): Promise<Folder[]>;
  createFolder(parentFolderId: string, name: string): Promise<Folder>;
  deleteFolder(folderId: string): Promise<void>;
  
  // Search Operations
  search(query: string): Promise<SearchResult>;
}

/**
 * Search parameters interface.
 * Defines the structure for advanced search operations.
 * Supports pagination, filtering, and faceted search.
 */
export interface SearchParams {
  maxItems: number;      // Maximum number of items to return per page
  skipCount: number;     // Number of items to skip (for pagination)
  include: string[];     // Array of fields to include in the response
  sort?: SearchSortItem[]; // Optional sorting criteria
  filters?: Record<string, string | string[]>; // Optional search filters
  facetFields?: string[]; // Fields to generate facets for
}

/**
 * Search sort configuration.
 * Defines how search results should be ordered.
 */
export interface SearchSortItem {
  field: string;     // Field name to sort by
  ascending: boolean; // Sort direction (true for ascending, false for descending)
}

/**
 * Folder listing response.
 * Wrapper for folder list operations that return multiple folders.
 */
export interface FolderListResponse {
  list: {
    entries: Array<{ entry: Folder }>; // Array of folder entries with metadata
  };
}

/**
 * Single folder response.
 * Wrapper for operations that return a single folder.
 */
export interface FolderResponse {
  entry: Folder; // Single folder entry with metadata
}

/**
 * Upload operation response.
 * Contains metadata about the newly uploaded file or folder.
 */
export interface UploadResponse {
  id: string;        // Unique identifier of the uploaded item
  name: string;      // Name of the uploaded item
  size?: number;     // Size of the uploaded file in bytes (if applicable)
  type: string;      // Type of the uploaded item ('file' or 'folder')
  createdAt: string; // ISO 8601 timestamp of creation
}