// src/api/providers/angora/AngoraProvider.ts

import {
    UserProfile,
    AuthResponse,
    Document,
    Folder,
    SearchResult,
    ApiConfig,
    DMSProvider,
    Department // Add this import
} from '../../types';

import { ApiUtils } from './utils/ApiUtils';
import { 
    AuthService,
    DocumentService,
    FolderService,
    SearchService,
    DepartmentService // Ensure this matches the actual file name and path
} from './services';
 /**
 * Implementation of the DMSProvider interface for Angora DMS
 * Handles all operations including authentication, document/folder management,
 * and search functionality for the Angora backend
 */
export class AngoraProvider implements DMSProvider {
    private authService: AuthService;
    private documentService: DocumentService;
    private folderService: FolderService;
    private searchService: SearchService;
    private departmentService: DepartmentService;
    private apiUtils: ApiUtils;

    constructor(config: ApiConfig) {
        // Initialize utility class and validate config
        if (!config.baseUrl) {
            throw new Error('Base URL is required for AngoraProvider initialization');
        }

        this.apiUtils = new ApiUtils(config);

        // Initialize services with shared dependencies
        this.authService = new AuthService(config.baseUrl, this.apiUtils);
        this.documentService = new DocumentService(config.baseUrl, this.apiUtils);
        this.folderService = new FolderService(config.baseUrl, this.apiUtils);
        this.searchService = new SearchService(config.baseUrl, this.apiUtils);
        this.departmentService = new DepartmentService(config.baseUrl, this.apiUtils);
    }

    /**
     * Sets the authentication token for API requests
     * @param token - JWT token or null to clear authentication
     */
    setToken(token: string | null): void {
        this.apiUtils.setToken(token);
    }

    /**
     * Authenticates user with Angora backend
     * @param username - User's username
     * @param password - User's password
     * @returns Promise resolving to AuthResponse containing token and user profile
     * @throws Error if authentication fails
     */
    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            const response = await this.authService.login(username, password);
            this.setToken(response.token);
            return response;
        } catch (error) {
            this.setToken(null);
            throw error;
        }
    }

    /**
     * Logs out the current user
     * Clears token and performs any necessary cleanup
     */
    async logout(): Promise<void> {
        try {
            await this.authService.logout();
        } finally {
            this.setToken(null);
        }
    }

    /**
     * Retrieves documents in a specified folder
     * @param folderId - ID of the folder to get documents from
     * @returns Promise resolving to array of Document objects
     */
    async getDocuments(folderId: string): Promise<Document[]> {
        return await this.documentService.getDocuments(folderId);
    }

    /**
     * Retrieves a specific document by ID
     * @param documentId - ID of the document to retrieve
     * @returns Promise resolving to Document object
     */
    async getDocument(documentId: string): Promise<Document> {
        return await this.documentService.getDocument(documentId);
    }

    /**
     * Uploads a new document to a specified folder
     * @param folderId - ID of the folder to upload to
     * @param file - File object to upload
     * @returns Promise resolving to the created Document
     */
    async uploadDocument(folderId: string, file: File): Promise<Document> {
        return await this.documentService.uploadDocument(folderId, file);
    }
    /**
     * Deletes a document
     * @param documentId - ID of the document to delete
     */
    async deleteDocument(documentId: string): Promise<void> {
        await this.documentService.deleteDocument(documentId);
    }

    /**
     * Downloads a document's content
     * @param documentId - ID of the document to download
     * @returns Promise resolving to Blob containing the document data
     */
    async downloadDocument(documentId: string): Promise<Blob> {
        return await this.documentService.downloadDocument(documentId);
    }

    /**
     * Retrieves all folders within a parent folder
     * @param parentFolderId - ID of the parent folder
     * @param filters - Optional filters for the query
     * @returns Promise resolving to array of Folder objects
     */
    async getFolders(
        parentFolderId: string,
        filters?: { nodeType?: string }
    ): Promise<Folder[]> {
        return await this.folderService.getFolders(parentFolderId, filters);
    }

    /**
     * Creates a new folder
     * @param parentFolderId - ID of the parent folder
     * @param name - Name for the new folder
     * @returns Promise resolving to the created Folder
     */
    async createFolder(parentFolderId: string, name: string): Promise<Folder> {
        return await this.folderService.createFolder(parentFolderId, name);
    }

    /**
     * Deletes a folder
     * @param folderId - ID of the folder to delete
     */
    async deleteFolder(folderId: string): Promise<void> {
        await this.folderService.deleteFolder(folderId);
    }

    /**
     * Performs a search across the DMS
     * @param query - Search query string
     * @returns Promise resolving to SearchResult containing matched documents and folders
     */
    async search(query: string): Promise<SearchResult> {
        return await this.searchService.search(query);
    }

    /**
     * Retrieves all departments
     * @returns Promise resolving to array of Department objects
     */
    async getDepartments(): Promise<Department[]> {
        return await this.departmentService.getDepartments();
    }

    /**
     * Retrieves a specific department by ID
     * @param departmentId - ID of the department to retrieve
     * @returns Promise resolving to Department object
     */
    async getDepartment(departmentId: string): Promise<Department> {
        return await this.departmentService.getDepartment(departmentId);
    }

    /**
     * Checks if a document exists
     * @param documentId - ID of the document to check
     * @returns Promise resolving to boolean indicating existence
     */
    private async documentExists(documentId: string): Promise<boolean> {
        try {
            await this.getDocument(documentId);
            return true;
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Checks if a folder exists
     * @param folderId - ID of the folder to check
     * @returns Promise resolving to boolean indicating existence
     */
    private async folderExists(folderId: string): Promise<boolean> {
        try {
            await this.getFolders(folderId);
            return true;
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Validates a file before upload
     * @param file - File to validate
     * @throws Error if file is invalid
     */
    private validateFile(file: File): void {
        if (!file) {
            throw new Error('No file provided');
        }
        
        if (file.size === 0) {
            throw new Error('File is empty');
        }

        // Add additional validation as needed
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            throw new Error('File size exceeds maximum allowed size (100MB)');
        }

        // Validate file name
        if (!file.name || file.name.length > 255) {
            throw new Error('Invalid file name');
        }

        // Could add mime type validation here if needed
        // const allowedTypes = ['application/pdf', 'image/jpeg', ...];
        // if (!allowedTypes.includes(file.type)) {
        //     throw new Error('File type not supported');
        // }
    }
}

export default AngoraProvider;