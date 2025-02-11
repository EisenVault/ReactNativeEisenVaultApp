// src/api/providers/alfresco/AlfrescoProvider.ts

import { DMSProvider, ApiConfig } from '../../types';
import { ApiUtils } from './utils/ApiUtils';
import { AuthService } from './services/AuthService';
import { DocumentService } from './services/DocumentService';
import { DepartmentService } from './services/DepartmentService';
import { BrowseService } from './services/BrowseService';
import { AuthResponse, Department, Document, Folder, SearchResult, BrowseItem } from '../../types';
/**
 * AlfrescoProvider implements the DMSProvider interface for Alfresco Content Services.
 * Handles all DMS operations including authentication, document management,
 * folder operations, and search functionality.
 */

export class AlfrescoProvider implements DMSProvider {
    private authService: AuthService;
    private documentService: DocumentService;
    private departmentService: DepartmentService;
    private browseService: BrowseService;
    
    constructor(config: ApiConfig) {
        const apiUtils = new ApiUtils(config);
        this.authService = new AuthService(config.baseUrl, apiUtils);
        this.documentService = new DocumentService(config.baseUrl, apiUtils);
        this.departmentService = new DepartmentService(config.baseUrl, apiUtils);
        this.browseService = new BrowseService(config.baseUrl, apiUtils);
    }

    get auth(): AuthService { return this.authService; }
    get documents(): DocumentService { return this.documentService; }
    get departments(): DepartmentService { return this.departmentService; }
    get browse(): BrowseService { return this.browseService; }

    setToken(token: string): void {
        this.authService.setToken(token);
    }

    async login(username: string, password: string): Promise<AuthResponse> {
        const authResponse = await this.authService.login(username, password);
        if (!authResponse.token) {
            throw new Error('Authentication failed');
        }
        return {
            token: authResponse.token,
            userProfile: authResponse.userProfile
        };
    }
    async getChildren(parent: BrowseItem): Promise<BrowseItem[]> {
        return this.browseService.getChildren(parent);
    }

    async getDepartments(): Promise<Department[]> {
        try {
            const departments = await this.departmentService.getDepartments();
            console.log('Departments fetched:', departments);
            return departments;
        } catch (error) {
            console.error('Failed to fetch departments:', error);
            throw error;
        }
    }

    async getDepartment(departmentId: string): Promise<Department> {
        return this.departmentService.getDepartment(departmentId);
    }

    async getFolders(departmentId: string): Promise<Folder[]> {
        const response = await this.documentService.getDocuments(departmentId);
        return response
            .filter(item => item.isFolder)
            .map(item => {
                const folder: Folder = {
                    id: item.id,
                    name: item.name,
                    path: item.path,
                    parentId: departmentId,
                    createdAt: item.createdAt || new Date().toISOString(),
                    modifiedAt: item.modifiedAt || new Date().toISOString(),
                    createdBy: item.createdBy,
                    modifiedBy: item.modifiedBy,
                    isDepartment: false,
                    isFolder: true,
                    mimeType: 'application/vnd.folder',
                    size: 0,
                    lastModified: item.modifiedAt || new Date().toISOString(),
                    allowableOperations: item.allowableOperations || [],
                    type: 'folder' as const,
                    data: null as any
                };
                folder.data = folder;
                return folder;
            });
    }
    
    async getDocuments(folderId: string): Promise<Document[]> {
        const response = await this.documentService.getDocuments(folderId);
        return response
            .filter(doc => !doc.isFolder)
            .map(doc => {
                const document: Document = {
                    id: doc.id,
                    name: doc.name,
                    path: doc.path,
                    mimeType: doc.mimeType || 'application/octet-stream',
                    size: doc.size || 0,
                    lastModified: doc.lastModified,
                    createdBy: doc.createdBy,
                    modifiedBy: doc.modifiedBy,
                    isOfflineAvailable: false,
                    isDepartment: false,
                    isFolder: false,
                    createdAt: doc.createdAt || new Date().toISOString(),
                    modifiedAt: doc.modifiedAt,
                    allowableOperations: doc.allowableOperations || [],
                    type: 'file' as const,
                    data: null as any
                };
                document.data = document;
                return document;
            });
    }
    

    async getDocument(documentId: string): Promise<Document> {
        return await this.documentService.getDocument(documentId);
    }

    async uploadDocument(folderId: string, file: File): Promise<Document> {
        return this.documentService.uploadDocument(folderId, file);
    }

    async downloadDocument(documentId: string): Promise<Blob> {
        return this.documentService.downloadDocument(documentId);
    }

    async deleteDocument(documentId: string): Promise<void> {
        await this.documentService.deleteDocument(documentId);
    }

    async updateDocument(documentId: string, properties: Partial<Document>): Promise<Document> {
        return this.documentService.updateDocument(documentId, properties);
    }

    async searchDocuments(query: string): Promise<Document[]> {
        return this.documentService.searchDocuments(query);
    }
    async getDocumentContent(documentId: string): Promise<string> {
        return this.documentService.getDocumentContent(documentId);
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

    async logout(): Promise<void> {
        await this.authService.logout();
    }
    async createFolder(parentId: string, name: string): Promise<Folder> {
        const response = await this.documentService.createFolder(parentId, name);
        const folder: Folder = {
            id: response.id,
            name: response.name,
            path: response.path,
            parentId: parentId,
            createdAt: response.createdAt || new Date().toISOString(),
            modifiedAt: response.modifiedAt || new Date().toISOString(),
            createdBy: response.createdBy,
            modifiedBy: response.modifiedBy,
            isDepartment: false,
            isFolder: true,
            mimeType: 'application/vnd.folder',
            size: 0,
            lastModified: response.modifiedAt || new Date().toISOString(),
            allowableOperations: response.allowableOperations || [],
            type: 'folder' as const,
            data: null as any
        };
        folder.data = folder;
        return folder;
    }
    async deleteFolder(folderId: string): Promise<void> {
        await this.documentService.deleteFolder(folderId);
    }
    async search(query: string): Promise<SearchResult> {
        const results = await this.documentService.searchDocuments(query);
        return {
            documents: results.filter(item => !item.isFolder),
            folders: results.filter(item => item.isFolder).map(this.mapToFolder),
            totalItems: results.length
        };
    }
    
    private mapToFolder(doc: Document): Folder {
        const folder: Folder = {
            id: doc.id,
            name: doc.name,
            path: doc.path,
            parentId: doc.path.split('/').slice(-2, -1)[0] || '',
            createdAt: doc.createdAt,
            modifiedAt: doc.modifiedAt,
            createdBy: doc.createdBy,
            modifiedBy: doc.modifiedBy,
            isDepartment: false,
            isFolder: true,
            mimeType: 'application/vnd.folder',
            size: 0,
            lastModified: doc.modifiedAt,
            allowableOperations: doc.allowableOperations,
            type: 'folder' as const,
            data: null as any
        };
        folder.data = folder;
        return folder;
    }
    
}

