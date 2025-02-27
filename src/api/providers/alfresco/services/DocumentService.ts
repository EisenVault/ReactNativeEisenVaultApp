// src/api/providers/alfresco/services/DocumentService.ts

import { BaseService } from './BaseService';
import { Document, Department } from '../../../types';
import { MapperUtils } from '../utils/MapperUtils';
import { ApiUtils } from '../utils/ApiUtils';
import { Logger } from '../../../../utils/Logger';

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
            Logger.info('Starting document fetch', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'getDocuments',
                data: { folderId }
            });

            const nodeId = folderId === 'root' ? '-root-' : folderId;
            Logger.debug('Using nodeId for fetch', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'getDocuments',
                data: { nodeId }
            });

            const queryParams = new URLSearchParams({
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const response = await this.makeRequest<{ list: { entries: any[] } }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${nodeId}/children?${queryParams}`
            );

            if (!response?.list?.entries) {
                throw new Error('Invalid response format');
            }

            const documents = response.list.entries.map(entry => MapperUtils.mapAlfrescoDocument(entry));
            Logger.info('Documents fetched successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'getDocuments',
                data: { count: documents.length }
            });

            return documents;
        } catch (error) {
            Logger.error('Failed to fetch documents', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'getDocuments',
                data: { folderId }
            }, error as Error);
            throw this.createError('Failed to get documents', error);
        }
    }
    async getDocument(documentId: string): Promise<Document> {
        try {
            Logger.info('Fetching single document', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'getDocument',
                data: { documentId }
            });

            const queryParams = new URLSearchParams({
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const data = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${documentId}?${queryParams}`
            );

            const document = MapperUtils.mapAlfrescoDocument(data.entry);
            Logger.info('Document fetched successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'getDocument',
                data: { id: document.id }
            });
            return document;
        } catch (error) {
            Logger.error('Failed to fetch document', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'getDocument',
                data: { documentId }
            }, error as Error);
            throw this.createError('Failed to get document', error);
        }
    }

    async uploadDocument(folderId: string, file: File): Promise<Document> {
        try {
            Logger.info('Starting document upload', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'uploadDocument',
                data: {
                    folderId,
                    fileName: file.name,
                    fileSize: file.size
                }
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
            Logger.info('Document uploaded successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'uploadDocument',
                data: { id: document.id }
            });
            return document;
        } catch (error) {
            Logger.error('Upload failed', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'uploadDocument',
                data: { folderId, fileName: file.name }
            }, error as Error);
            throw this.createError('Upload failed', error);
        }
    }

    async downloadDocument(documentId: string): Promise<Blob> {
        try {
            Logger.info('Starting document download', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'downloadDocument',
                data: { documentId }
            });

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
            Logger.info('Document downloaded successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'downloadDocument',
                data: { documentId, size: blob.size }
            });
            return blob;
        } catch (error) {
            Logger.error('Download failed', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'downloadDocument',
                data: { documentId }
            }, error as Error);
            throw this.createError('Download failed', error);
        }
    }

    async deleteDocument(documentId: string): Promise<void> {
        try {
            Logger.info('Deleting document', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'deleteDocument',
                data: { documentId }
            });

            await this.makeRequest(
                `/api/-default-/public/alfresco/versions/1/nodes/${documentId}`,
                {
                    method: 'DELETE'
                }
            );

            Logger.info('Document deleted successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'deleteDocument',
                data: { documentId }
            });
        } catch (error) {
            Logger.error('Delete failed', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'deleteDocument',
                data: { documentId }
            }, error as Error);
            throw this.createError('Delete failed', error);
        }
    }

    async updateDocument(documentId: string, properties: Partial<Document>): Promise<Document> {
        try {
            Logger.info('Updating document', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'updateDocument',
                data: { documentId, properties }
            });

            const data = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${documentId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(properties)
                }
            );

            const document = MapperUtils.mapAlfrescoDocument(data.entry);
            Logger.info('Document updated successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'updateDocument',
                data: { id: document.id }
            });
            return document;
        } catch (error) {
            Logger.error('Update failed', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'updateDocument',
                data: { documentId }
            }, error as Error);
            throw this.createError('Update failed', error);
        }
    }
    async getSites(): Promise<Department[]> {
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
    
            return MapperUtils.mapDepartments(response.list.entries);
        } catch (error) {
            this.logError('getSites', error);
            throw this.createError('Failed to get sites', error);
        }
    }
    
    


async searchDocuments(query: string): Promise<Document[]> {
        try {
            Logger.info('Starting document search', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'searchDocuments',
                data: { query }
            });
            
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

            const results = MapperUtils.mapAlfrescoDocuments(response.list.entries);
            Logger.info('Search completed successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'searchDocuments',
                data: { resultsCount: results.length }
            });

            return results;
        } catch (error) {
            Logger.error('Search failed', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'searchDocuments',
                data: { query }
            }, error as Error);
            throw this.createError('Search failed', error);
        }
    }

    async createFolder(parentId: string, name: string): Promise<Document> {
        try {
            Logger.info('Creating new folder', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'createFolder',
                data: { parentId, name }
            });

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

            const folder = MapperUtils.mapAlfrescoDocument(response.entry);
            Logger.info('Folder created successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'createFolder',
                data: { folderId: folder.id }
            });
            return folder;
        } catch (error) {
            Logger.error('Failed to create folder', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'createFolder',
                data: { parentId, name }
            }, error as Error);
            throw this.createError('Failed to create folder', error);
        }
    }

    async deleteFolder(folderId: string): Promise<void> {
        try {
            Logger.info('Deleting folder', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'deleteFolder',
                data: { folderId }
            });

            await this.makeRequest(
                `/api/-default-/public/alfresco/versions/1/nodes/${folderId}`,
                { method: 'DELETE' }
            );

            Logger.info('Folder deleted successfully', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'deleteFolder',
                data: { folderId }
            });
        } catch (error) {
            Logger.error('Failed to delete folder', {
                dms: 'Alfresco',
                service: 'DocumentService',
                method: 'deleteFolder',
                data: { folderId }
            }, error as Error);
            throw this.createError('Failed to delete folder', error);
        }
    }

async getDocumentContent(documentId: string): Promise<string> {
    try {
        const response = await fetch(
            this.buildUrl(`/api/-default-/public/alfresco/versions/1/nodes/${documentId}/content`),
            {
                headers: this.getHeaders(),
                method: 'GET'
            }
        );
        
        const blob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = () => {
                const base64 = reader.result?.toString().split(',')[1];
                resolve(base64 || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        this.logError('getDocumentContent failed', error);
        throw this.createError('Failed to get document content', error);
    }
}

private getHeaders(): HeadersInit {
    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `${this.apiUtils.getToken()}`
    };
}
}