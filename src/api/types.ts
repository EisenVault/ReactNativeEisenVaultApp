// src/api/types.ts



/**
 * Department response from Angora API
 */
export interface DepartmentResponse {
  status: number;
  meta: {
    current_page: number;
    items_per_page: number;
    total_pages: number;
    total_records: number;
    has_more: boolean;
  };
  data: Array<{
    id: string;
    description: string;
    raw_file_name: string;
    parent_path: string;
    materialize_path: string;
    is_department: boolean;
    created_by: string;
    edited_by: string;
  }>;
  notifications: any[];
  errors: any[];
  _: {
    service: string;
    app_version: string;
    submodule_version: string;
  };
}

/**
 * Represents the complete user profile information.
 */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  username: string;
}

/**
 * Authentication response structure.
 */
export interface AuthResponse {
  token: string;
  userProfile: UserProfile;
}



/**
 * Search results structure.
 */
export interface SearchResult {
  documents: Document[];
  folders: Folder[];
  departments?: Department[];
  totalItems: number;
}

/**
 * API Configuration interface.
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
}

/**
 * Main DMS Provider interface.
 */
export interface DMSProvider {
  // Authentication methods
  login(username: string, password: string): Promise<AuthResponse>;
  logout(): Promise<void>;
  setToken(token: string | null): void;
  
  // Department Operations (Angora specific)
  getDepartments(): Promise<Department[]>;
  getDepartment(departmentId: string): Promise<Department>;
  
  // Document Operations
  getDocuments(folderId: string): Promise<Document[]>;
  getDocument(documentId: string): Promise<Document>;
  uploadDocument(folderId: string, file: File): Promise<Document>;
  deleteDocument(documentId: string): Promise<void>;
  downloadDocument(documentId: string): Promise<Blob>;
  getDocumentContent(documentId: string): Promise<string>;
  
  // Folder Operations
  getFolders(parentId: string, filters?: { nodeType?: string }): Promise<Folder[]>;
  createFolder(parentId: string, name: string): Promise<Folder>;
  deleteFolder(folderId: string): Promise<void>;
  getChildren(parent: BrowseItem): Promise<BrowseItem[]>;
  
  // Search Operations
  search(query: string): Promise<SearchResult>;

  
}

export interface AlfrescoDocumentsResponse {
    list: {
        entries: Array<{
            entry: {
                id: string;
                name: string;
                nodeType: string;
                isFolder: boolean;
                isFile: boolean;
                modifiedAt: string;
                modifiedByUser: {
                    displayName: string;
                };
                createdAt: string;
                createdByUser: {
                    displayName: string;
                };
                content: {
                    mimeType: string;
                    sizeInBytes: number;
                };
            };
        }>;
        pagination: {
            count: number;
            hasMoreItems: boolean;
            totalItems: number;
            skipCount: number;
            maxItems: number;
        };
    };
}

export interface BrowseItem {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  isDepartment: boolean;
  mimeType: string;
  size: number;
  lastModified: string;
  createdAt: string;
  createdBy: string;
  modifiedBy: string;
  allowableOperations: string[];
  type: 'folder' | 'file' | 'department';
  data: Document | Folder | Department;
}



export interface Document extends BrowseItem {
  mimeType: string;
  size: number;
  lastModified: string;
  isOfflineAvailable: boolean;
  isDepartment: boolean;
  isFolder: boolean;
  modifiedAt: string;
}

export interface Folder extends BrowseItem {
  parentId: string;
  createdAt: string;
  modifiedAt: string;
}

/**
 * Department interface specific to Angora DMS
 * Represents a top-level organizational unit
 */
export interface Department extends BrowseItem {
  description?: string;
  parentPath?: string;
  materializePath?: string;
  editedBy?: string;
  rawFileName?: string;
  
}

export type RootStackParamList = {
    Login: undefined;
    Browse: undefined;
    DocumentViewer: {
        documentId: string;
        name: string;
        mimeType: string;
    };
};
export interface PDFViewerProps {
  uri: string;
}