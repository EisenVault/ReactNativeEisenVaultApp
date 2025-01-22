// src/api/providers/alfresco/services/DocumentService.ts

import { BaseService } from './BaseService';
import { Document } from '../../../types';
import { MapperUtils } from '../utils/MapperUtils';

/**
 * Handles all document-related operations with the Alfresco API
 * Includes uploading, downloading, and managing documents
 */
export class DocumentService extends BaseService {
    /**
     * Retrieves all documents within a specified folder
     * @param folderId - Node ID of the folder to list documents from
     * @returns Promise resolving to array of Document objects
     */
    async getDocuments(folderId: string): Promise<Document[]> {
        try {
            this.logOperation('getDocuments', { folderId });

            const queryParams = new URLSearchParams({
                where: '(isFile=true)',
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const data = await this.makeRequest<{ list: { entries: Array<{ entry: any }> } }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${folderId}/children?${queryParams.toString()}`
            );

            const documents = data.list.entries.map(entry => 
                MapperUtils.mapAlfrescoDocument(entry.entry)
            );

            this.logOperation('getDocuments successful', { count: documents.length });
            return documents;
        } catch (error) {
            this.logError('getDocuments', error);
            throw this.createError('Failed to get documents', error);
        }
    }

    /**
     * Gets a single document by its ID
     * @param documentId - Node ID of the document
     * @returns Promise resolving to Document object
     */
    async getDocument(documentId: string): Promise<Document> {
        try {
            this.logOperation('getDocument', { documentId });

            const queryParams = new URLSearchParams({
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const data = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${documentId}?${queryParams.toString()}`
            );

            const document = MapperUtils.mapAlfrescoDocument(data.entry);
            this.logOperation('getDocument successful', { id: document.id });
            return document;
        } catch (error) {
            this.logError('getDocument', error);
            throw this.createError('Failed to get document', error);
        }
    }

    /**
     * Uploads a new document to a specified folder
     * @param folderId - Destination folder Node ID
     * @param file - File object to upload
     * @returns Promise resolving to uploaded Document object
     */
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
                    body: formData,
                    headers: {
                        // Let browser set the correct Content-Type for FormData
                    }
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

    /**
     * Downloads a document's content
     * @param documentId - Node ID of the document to download
     * @returns Promise resolving to Blob containing the document data
     */
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

    /**
     * Deletes a document
     * @param documentId - Node ID of the document to delete
     */
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

    /**
     * Updates a document's metadata
     * @param documentId - Node ID of the document to update
     * @param properties - Object containing properties to update
     * @returns Promise resolving to updated Document object
     */
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
}