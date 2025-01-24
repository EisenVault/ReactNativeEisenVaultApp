import {
    UserProfile,
    AuthResponse,
    Document,
    Folder,
    SearchResult,
    ApiConfig,
    DMSProvider
} from '../../types';

import { ApiUtils } from './utils/ApiUtils';
import { 
    AuthService,
    DocumentService,
    FolderService,
    SearchService 
} from './services';

/**
 * AlfrescoProvider implements the DMSProvider interface for Alfresco Content Services.
 * Handles all DMS operations including authentication, document management,
 * folder operations, and search functionality.
 */
export class AlfrescoProvider implements DMSProvider {
    private authService: AuthService;
    private documentService: DocumentService;
    private folderService: FolderService;
    private searchService: SearchService;
    private apiUtils: ApiUtils;

    /**
     * Initializes a new instance of AlfrescoProvider
     * @param config - API configuration including baseUrl and other settings
     */
    constructor(config: ApiConfig) {
        this.apiUtils = new ApiUtils(config);
        this.authService = new AuthService(config.baseUrl, this.apiUtils);
        this.documentService = new DocumentService(config.baseUrl, this.apiUtils);
        this.folderService = new FolderService(config.baseUrl, this.apiUtils);
        this.searchService = new SearchService(config.baseUrl, this.apiUtils);
    }
    setToken(token: string | null): void {
        this.apiUtils.setToken(token);
    }
    /**
     * Authenticates user with Alfresco
     * @param username - User's username
     * @param password - User's password
     * @returns Promise resolving to AuthResponse containing token and user profile
     */
    async login(username: string, password: string): Promise<AuthResponse> {
        return await this.authService.login(username, password);
    }

    /**
     * Logs out the current user
     * @returns Promise that resolves when logout is complete
     */
    async logout(): Promise<void> {
        return await this.authService.logout();
    }

    /**
     * Retrieves all documents in a specified folder
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
     * Deletes a document by ID
     * @param documentId - ID of the document to delete
     * @returns Promise that resolves when deletion is complete
     */
    async deleteDocument(documentId: string): Promise<void> {
        return await this.documentService.deleteDocument(documentId);
    }

    /**
     * Downloads a document by ID
     * @param documentId - ID of the document to download
     * @returns Promise resolving to Blob containing the document data
     */
    async downloadDocument(documentId: string): Promise<Blob> {
        return await this.documentService.downloadDocument(documentId);
    }

    /**
     * Retrieves all folders within a parent folder
     * @param parentFolderId - ID of the parent folder
     * @returns Promise resolving to array of Folder objects
     */
    async getFolders(parentFolderId: string): Promise<Folder[]> {
        return await this.folderService.getFolders(parentFolderId);
    }

    /**
     * Creates a new folder within a parent folder
     * @param parentFolderId - ID of the parent folder
     * @param name - Name for the new folder
     * @returns Promise resolving to the created Folder
     */
    async createFolder(parentFolderId: string, name: string): Promise<Folder> {
        return await this.folderService.createFolder(parentFolderId, name);
    }

    /**
     * Deletes a folder by ID
     * @param folderId - ID of the folder to delete
     * @returns Promise that resolves when deletion is complete
     */
    async deleteFolder(folderId: string): Promise<void> {
        return await this.folderService.deleteFolder(folderId);
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
     * Helper method to check if a document exists
     * @param documentId - ID of the document to check
     * @returns Promise resolving to boolean indicating existence
     */
    private async documentExists(documentId: string): Promise<boolean> {
        try {
            await this.getDocument(documentId);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Helper method to check if a folder exists
     * @param folderId - ID of the folder to check
     * @returns Promise resolving to boolean indicating existence
     */
    private async folderExists(folderId: string): Promise<boolean> {
        try {
            await this.getFolders(folderId);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Helper method to validate file before upload
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
        // Add additional validation as needed (file size limits, allowed types, etc.)
    }
}