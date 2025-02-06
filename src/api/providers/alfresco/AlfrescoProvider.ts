// src/api/providers/alfresco/AlfrescoProvider.ts

import { DMSProvider, ApiConfig } from '../../types';
import { ApiUtils } from './utils/ApiUtils';
import { AuthService } from './services/AuthService';
import { DocumentService } from './services/DocumentService';
import { DepartmentService } from './services/DepartmentService';
import { AuthResponse, Department, Document, Folder, SearchResult } from '../../types';
/**
 * AlfrescoProvider implements the DMSProvider interface for Alfresco Content Services.
 * Handles all DMS operations including authentication, document management,
 * folder operations, and search functionality.
 */

export class AlfrescoProvider implements DMSProvider {
    private authService: AuthService;
    private documentService: DocumentService;
    private departmentService: DepartmentService;

    constructor(config: ApiConfig) {
        const apiUtils = new ApiUtils(config);
        this.authService = new AuthService(config.baseUrl, apiUtils);
        this.documentService = new DocumentService(config.baseUrl, apiUtils);
        this.departmentService = new DepartmentService(config.baseUrl, apiUtils);
    }

    setToken(token: string): void {
        this.authService.setToken(token);
    }

    async login(username: string, password: string): Promise<AuthResponse> {
        const authResponse = await this.authService.login(username, password);
        return {
            token: authResponse.token,
            userProfile: authResponse.userProfile
        };
    }

    async getDepartments(): Promise<Department[]> {
        return this.departmentService.getDepartments();
    }

    async getDepartment(departmentId: string): Promise<Department> {
        return this.departmentService.getDepartment(departmentId);
    }

    async getFolders(departmentId: string): Promise<Folder[]> {
        const response = await this.documentService.getDocuments(departmentId);
        return response
            .filter(item => item.isFolder)
            .map(item => ({
                id: item.id,
                name: item.name,
                path: item.path,
                parentId: departmentId,
                createdAt: item.createdAt,
                createdBy: item.createdBy,
                modifiedAt: item.lastModified,
                modifiedBy: item.modifiedBy,
                isDepartment: false
            }));
    }
    
    async getDocuments(folderId: string): Promise<Document[]> {
        const response = await this.documentService.getDocuments(folderId);
        return response.filter(doc => !doc.isFolder).map(doc => ({
            id: doc.id,
            name: doc.name,
            path: doc.path,
            mimeType: doc.mimeType,
            size: doc.size,
            lastModified: doc.lastModified,
            createdAt: doc.createdAt,
            createdBy: doc.createdBy,
            modifiedBy: doc.modifiedBy,
            isFolder: false,
            modifiedAt: doc.modifiedAt,
            isOfflineAvailable: doc.isOfflineAvailable,
            isDepartment: false
        }));
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
        return {
            id: response.id,
            name: response.name,
            path: response.path,
            parentId: parentId,
            createdAt: response.createdAt,
            createdBy: response.createdBy,
            modifiedAt: response.lastModified,
            modifiedBy: response.modifiedBy,
            isDepartment: false
        };
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
        return {
            id: doc.id,
            name: doc.name,
            path: doc.path,
            parentId: doc.path.split('/').slice(-2, -1)[0],
            createdAt: doc.createdAt,
            createdBy: doc.createdBy,
            modifiedAt: doc.lastModified,
            modifiedBy: doc.modifiedBy,
            isDepartment: false
        };
    }
    
}