// src/api/types.ts

/**
 * Main interface that all DMS (Document Management System) providers must implement.
 * This ensures consistency across different DMS backends (Alfresco, Angora, etc.)
 */
export interface DMSProvider {
  /**
   * Authenticates a user with the DMS
   * @param username - The user's username/email
   * @param password - The user's password
   * @returns Promise containing auth token and user information
   */
  login(username: string, password: string): Promise<AuthResponse>;
  
  /**
   * Logs out the current user and invalidates their token
   */
  logout(): Promise<void>;
  
  // Document Operations
  /**
   * Retrieves all documents in a specified folder
   * @param folderId - ID of the folder to list documents from
   * @returns Array of Document objects
   */
  getDocuments(folderId: string): Promise<Document[]>;
  
  /**
   * Retrieves a single document's metadata
   * @param documentId - ID of the document to retrieve
   * @returns Document object with metadata
   */
  getDocument(documentId: string): Promise<Document>;
  
  /**
   * Uploads a new document to a specified folder
   * @param folderId - Destination folder ID
   * @param file - File object to upload
   * @returns Metadata of the uploaded document
   */
  uploadDocument(folderId: string, file: File): Promise<Document>;
  
  /**
   * Deletes a document from the DMS
   * @param documentId - ID of the document to delete
   */
  deleteDocument(documentId: string): Promise<void>;
  
  /**
   * Downloads a document's content
   * @param documentId - ID of the document to download
   * @returns Blob containing the document's content
   */
  downloadDocument(documentId: string): Promise<Blob>;
  
  // Folder Operations
  /**
   * Lists all folders within a parent folder
   * @param parentFolderId - ID of the parent folder
   * @returns Array of Folder objects
   */
  getFolders(parentFolderId: string): Promise<Folder[]>;
  
  /**
   * Creates a new folder
   * @param parentFolderId - ID of the parent folder
   * @param name - Name for the new folder
   * @returns Metadata of the created folder
   */
  createFolder(parentFolderId: string, name: string): Promise<Folder>;
  
  /**
   * Deletes a folder and its contents
   * @param folderId - ID of the folder to delete
   */
  deleteFolder(folderId: string): Promise<void>;
  
  /**
   * Searches across the DMS
   * @param query - Search query string
   * @returns Combined results of documents and folders
   */
  search(query: string): Promise<SearchResult>;
}

/**
 * Response structure for successful authentication
 */
export interface AuthResponse {
  token: string;      // Authentication token to be used in subsequent requests
  user: UserInfo;     // Information about the authenticated user
}

/**
 * Structure containing user information
 */
export interface UserInfo {
  id: string;         // Unique identifier for the user
  username: string;   // Username used for login
  displayName: string;// User's display name
  email: string;      // User's email address
}

/**
 * Structure representing a document in the DMS
 */
export interface Document {
  id: string;                 // Unique identifier for the document
  name: string;               // File name
  path: string;               // Full path to the document
  mimeType: string;           // MIME type (e.g., 'application/pdf')
  size: number;               // File size in bytes
  lastModified: string;       // Last modification date/time
  createdBy: string;          // User who created the document
  modifiedBy: string;         // User who last modified the document
  isOfflineAvailable: boolean;// Whether the document is cached for offline use
}

/**
 * Structure representing a folder in the DMS
 */
export interface Folder {
  id: string;         // Unique identifier for the folder
  name: string;       // Folder name
  path: string;       // Full path to the folder
  parentId: string | null;  // ID of the parent folder (null for root)
  createdBy: string;  // User who created the folder
  modifiedBy: string; // User who last modified the folder
}

/**
 * Structure for search results, combining both documents and folders
 */
export interface SearchResult {
  documents: Document[];  // Array of matching documents
  folders: Folder[];     // Array of matching folders
  totalItems: number;    // Total number of matches
}