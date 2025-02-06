// src/api/providers/alfresco/services/DocumentService.ts

import { BaseService } from './BaseService';
import { Document } from '../../../types';
import { MapperUtils } from '../utils/MapperUtils';
import { ApiUtils } from '../utils/ApiUtils';

/**
 * Handles all document-related operations with the Alfresco API
 * Includes uploading, downloading, and managing documents
 */
export class DocumentService extends BaseService {
    private static readonly SERVICE_HEADERS = {
        PORTAL: 'web',
        SERVICE_NAME: 'service-file'
    } as const;

    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    async getDocuments(folderId: string): Promise<Document[]> {
        try {
            const nodeId = folderId === 'root' ? '-root-' : folderId;
            const queryParams = new URLSearchParams({
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const response = await this.makeRequest<{ list: { entries: any[] } }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${nodeId}/children?${queryParams}`
            );

            if (!response?.list?.entries) {
                throw new Error('Invalid response format');
            }

            return MapperUtils.mapAlfrescoDocuments(response.list.entries);
        } catch (error) {
            this.logError('getDocuments', error);
            throw this.createError('Failed to get documents', error);
        }
    }

    async getDocument(documentId: string): Promise<Document> {
        try {
            this.logOperation('getDocument', { documentId });

            const queryParams = new URLSearchParams({
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const data = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${documentId}?${queryParams}`
            );

            const document = MapperUtils.mapAlfrescoDocument(data.entry);
            this.logOperation('getDocument successful', { id: document.id });
            return document;
        } catch (error) {
            this.logError('getDocument', error);
            throw this.createError('Failed to get document', error);
        }
    }

    async uploadDocument(folderId: string, file: File): Promise<Document> {
        try {
            this.logOperation('uploadDocument', {
                folderId,
                fileName: file.name,
                fileSize: file.size
            });

            const formData = new FormData();
            formData.append('filedata', file);
            formData.append('relativePath', file.name);

            const data = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${folderId}/children`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            const document = MapperUtils.mapAlfrescoDocument(data.entry);
            this.logOperation('uploadDocument successful', { id: document.id });
            return document;
        } catch (error) {
            this.logError('uploadDocument', error);
            throw this.createError('Upload failed', error);
        }
    }

    async downloadDocument(documentId: string): Promise<Blob> {
        try {
            this.logOperation('downloadDocument', { documentId });

            const response = await this.apiUtils.fetch(
                this.buildUrl(`/api/-default-/public/alfresco/versions/1/nodes/${documentId}/content`),
                {
                    headers: {
                        'Accept': '*/*'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Download failed with status: ${response.status}`);
            }

            const blob = await response.blob();
            this.logOperation('downloadDocument successful', {
                documentId,
                size: blob.size
            });
            return blob;
        } catch (error) {
            this.logError('downloadDocument', error);
            throw this.createError('Download failed', error);
        }
    }

    async deleteDocument(documentId: string): Promise<void> {
        try {
            this.logOperation('deleteDocument', { documentId });

            await this.makeRequest(
                `/api/-default-/public/alfresco/versions/1/nodes/${documentId}`,
                {
                    method: 'DELETE'
                }
            );

            this.logOperation('deleteDocument successful', { documentId });
        } catch (error) {
            this.logError('deleteDocument', error);
            throw this.createError('Delete failed', error);
        }
    }

    async updateDocument(
        documentId: string,
        properties: Partial<Document>
    ): Promise<Document> {
        try {
            this.logOperation('updateDocument', { documentId, properties });

            const data = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${documentId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(properties)
                }
            );

            const document = MapperUtils.mapAlfrescoDocument(data.entry);
            this.logOperation('updateDocument successful', { id: document.id });
            return document;
        } catch (error) {
            this.logError('updateDocument', error);
            throw this.createError('Update failed', error);
        }
    }

    async getSites(): Promise<Document[]> {
        try {
            this.logOperation('getSites');
            
            const queryParams = new URLSearchParams({
                skipCount: '0',
                maxItems: '100',
                fields: ['id', 'title', 'description', 'visibility'].join(',')
            });
    
            const response = await this.makeRequest<{ list: { entries: any[] } }>(
                `/api/-default-/public/alfresco/versions/1/sites?${queryParams}`
            );
    
            if (!response?.list?.entries) {
                throw new Error('Invalid sites response format');
            }
    
            return MapperUtils.mapAlfrescoSites(response.list.entries);
        } catch (error) {
            this.logError('getSites', error);
            throw this.createError('Failed to get sites', error);
        }
    }
    
    


async searchDocuments(query: string): Promise<Document[]> {
    try {
        this.logOperation('searchDocuments', { query });
        
        const queryParams = new URLSearchParams({
            term: query,
            maxItems: '100',
            nodeType: 'cm:content'
        });

        const response = await this.makeRequest<{ list: { entries: any[] } }>(
            `/api/-default-/public/search/versions/1/search?${queryParams}`
        );

        if (!response?.list?.entries) {
            throw new Error('Invalid search response format');
        }

        return MapperUtils.mapAlfrescoDocuments(response.list.entries);
    } catch (error) {
        this.logError('searchDocuments', error);
        throw this.createError('Search failed', error);
    }
}


async createFolder(parentId: string, name: string): Promise<Document> {
    try {
        const response = await this.makeRequest<{ entry: any }>(
            `/api/-default-/public/alfresco/versions/1/nodes/${parentId}/children`,
            {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    nodeType: 'cm:folder'
                })
            }
        );
        return MapperUtils.mapAlfrescoDocument(response.entry);
    } catch (error) {
        throw this.createError('Failed to create folder', error);
    }
}

async deleteFolder(folderId: string): Promise<void> {
    await this.makeRequest(
        `/api/-default-/public/alfresco/versions/1/nodes/${folderId}`,
        { method: 'DELETE' }
    );
}
}
