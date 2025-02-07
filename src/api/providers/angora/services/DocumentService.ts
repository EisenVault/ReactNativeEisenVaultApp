// src/api/providers/angora/services/DocumentService.ts

import { BaseService } from './BaseService';
import { Document } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';
import { MapperUtils } from '../utils/MapperUtils';
import { Logger } from '../../../../utils/Logger';


/**
 * Interface for Angora API document response
 */
interface AngoraDocumentResponse {
    data: {
        id: string;
        name: string;
        path?: string;
        mime_type?: string;
        size?: number;
        modified_at: string;
        created_by?: {
            display_name?: string;
        };
        modified_by?: {
            display_name?: string;
        };
    };
}

/**
 * Interface for Angora API documents list response
 */
interface AngoraDocumentsResponse {
    data: Array<AngoraDocumentResponse['data']>;
}

/**
 * Interface for upload response
 */
interface AngoraUploadResponse {
    data: {
        id: string;
        name: string;
        path?: string;
        size: number;
        mime_type: string;
        modified_at: string;
        created_by: {
            display_name: string;
        };
        modified_by: {
            display_name: string;
        };
    };
}

/**
 * DocumentService handles all document-related operations for the Angora DMS
 * Includes methods for retrieving, uploading, downloading, and deleting documents
 */
export class DocumentService extends BaseService {
    // Constants for service configuration
    private static readonly SERVICE_HEADERS = {
        PORTAL: 'web',
        SERVICE_NAME: 'service-file'
    } as const;

    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    /**
     * Retrieve all documents in a specified folder
     * @param folderId - ID of the folder to get documents from
     * @returns Promise resolving to array of Document objects
     */
    async getDocuments(folderId: string): Promise<Document[]> {
        try {
            Logger.info('Fetching documents', {
                dms: 'Angora',
                service: 'DocumentService',
                method: 'getDocuments',
                data: { folderId }
            });

            const params = new URLSearchParams({
                action: 'default'
            });

            const response = await this.makeCustomRequest<AngoraDocumentsResponse>(
                `api/nodes/${folderId}/children?${params}`,
                {
                    headers: {
                        'x-portal': DocumentService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': DocumentService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            const documents = MapperUtils.mapAngoraDocuments(response.data);
            Logger.info('Documents fetched successfully', {
                dms: 'Angora',
                service: 'DocumentService',
                method: 'getDocuments',
                data: { count: documents.length }
            });

            return documents;
        } catch (error) {
            Logger.error('Failed to fetch documents', {
                dms: 'Angora',
                service: 'DocumentService',
                method: 'getDocuments',
                data: { folderId }
            }, error instanceof Error ? error : undefined);
            throw this.createError('Failed to get documents', error);
        }
    }

    /**
     * Retrieve a specific document by ID
     * @param documentId - ID of the document to retrieve
     * @returns Promise resolving to Document object
     */
    async getDocument(documentId: string): Promise<Document> {
        try {
            Logger.info('Fetching document', {
                dms: 'Angora',
                service: 'DocumentService',
                method: 'getDocument',
                data: { documentId }
            });

            const response = await this.makeCustomRequest<AngoraDocumentResponse>(
                `api/nodes/${documentId}`,
                {
                    headers: {
                        'x-portal': DocumentService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': DocumentService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            const document = MapperUtils.mapAngoraDocument(response.data);
            Logger.info('Document fetched successfully', {
                dms: 'Angora',
                service: 'DocumentService',
                method: 'getDocument',
                data: { id: document.id }
            });
            
            return document;
        } catch (error) {
            Logger.error('Failed to fetch document', {
                dms: 'Angora',
                service: 'DocumentService',
                method: 'getDocument',
                data: { documentId }
            }, error instanceof Error ? error : undefined);
            throw this.createError('Failed to get document', error);
        }
    }

    /**
     * Upload a new document to a specified folder
     * Supports resumable uploads for large files
     * @param folderId - ID of the folder to upload to
     * @param file - File object to upload
     * @returns Promise resolving to the created Document
     */
    async uploadDocument(folderId: string, file: File): Promise<Document> {
        try {
            this.logOperation('uploadDocument', {
                folderId,
                fileName: file.name,
                fileSize: file.size
            });

            const formData = new FormData();
            formData.append('file', file);

            // Create unique file ID for resumable uploads
            const fileId = `${folderId}_${file.name}_${file.size}_${Date.now()}`;

            const response = await this.makeCustomRequest<AngoraUploadResponse>(
                'api/uploads',
                {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'x-portal': DocumentService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': DocumentService.SERVICE_HEADERS.SERVICE_NAME,
                        'x-start-byte': '0',
                        'x-file-size': file.size.toString(),
                        'x-file-id': fileId,
                        'x-parent-id': folderId,
                        'x-resumable': 'true',
                        'x-file-name': file.name
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid upload response');
            }

            const document = MapperUtils.mapAngoraDocument(response.data);
            this.logOperation('uploadDocument successful', { id: document.id });
            
            return document;
        } catch (error) {
            this.logError('uploadDocument failed', error);
            throw this.createError('Failed to upload document', error);
        }
    }

    /**
     * Download a document's contents
     * @param documentId - ID of the document to download
     * @returns Promise resolving to Blob containing the document data
     */
    async downloadDocument(documentId: string): Promise<Blob> {
        try {
            this.logOperation('downloadDocument', { documentId });

            // First get document details to verify existence
            await this.getDocument(documentId);

            // Use the inherited buildUrl method from BaseService
            const url = this.buildUrl(`api/files/${documentId}/download`);

            // Make request and get response
            const response = await fetch(url, {
                headers: {
                    ...this.getHeaders(),
                    'x-portal': DocumentService.SERVICE_HEADERS.PORTAL,
                    'x-service-name': DocumentService.SERVICE_HEADERS.SERVICE_NAME,
                    'Accept': '*/*'
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed with status: ${response.status}`);
            }

            const blob = await response.blob();
            this.logOperation('downloadDocument successful', { 
                documentId,
                size: blob.size,
                type: blob.type 
            });

            return blob;
        } catch (error) {
            this.logError('downloadDocument failed', error);
            throw this.createError('Failed to download document', error);
        }
    }

    /**
     * Delete a document by ID
     * @param documentId - ID of the document to delete
     */
    async deleteDocument(documentId: string): Promise<void> {
        try {
            this.logOperation('deleteDocument', { documentId });

            await this.makeCustomRequest(
                `api/files/${documentId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'x-portal': DocumentService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': DocumentService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            this.logOperation('deleteDocument successful', { documentId });
        } catch (error) {
            this.logError('deleteDocument failed', error);
            throw this.createError('Failed to delete document', error);
        }
    }

    /**
     * Check if a document exists
     * @param documentId - ID of the document to check
     * @returns Promise resolving to boolean indicating existence
     */
    async documentExists(documentId: string): Promise<boolean> {
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
     * Get document metadata
     * @param documentId - ID of the document
     * @returns Promise resolving to metadata object
     */
    async getDocumentMetadata(documentId: string): Promise<Record<string, any>> {
        try {
            this.logOperation('getDocumentMetadata', { documentId });

            const response = await this.makeCustomRequest<{ data: Record<string, any> }>(
                `api/files/${documentId}/metadata`,
                {
                    headers: {
                        'x-portal': DocumentService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': DocumentService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid metadata response');
            }

            return response.data;
        } catch (error) {
            this.logError('getDocumentMetadata failed', error);
            throw this.createError('Failed to get document metadata', error);
        }
    }

    /**
     * Get headers for requests
     * @protected
     */
    protected getHeaders(): HeadersInit {
        return {
            'Content-Type': 'application/json',
            'Authorization': this.apiUtils.getToken() || '',
        };
    }
}