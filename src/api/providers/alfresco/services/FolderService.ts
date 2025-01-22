// src/api/providers/alfresco/services/FolderService.ts

import { BaseService } from './BaseService';
import { Folder, FolderListResponse, FolderResponse } from '../../../types';
import { MapperUtils } from '../utils/MapperUtils';

/**
 * Handles all folder-related operations with the Alfresco API
 * Includes creating, deleting, and managing folders
 */
export class FolderService extends BaseService {
    /**
     * Retrieves all folders within a specified parent folder
     * @param parentFolderId - Node ID of the parent folder
     * @returns Promise resolving to array of Folder objects
     */
    async getFolders(parentFolderId: string): Promise<Folder[]> {
        try {
            this.logOperation('getFolders', { parentFolderId });

            const params = new URLSearchParams({
                where: '(isFolder=true)',
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const data = await this.makeRequest<FolderListResponse>(
                `/api/-default-/public/alfresco/versions/1/nodes/${parentFolderId}/children?${params}`
            );

            const folders = data.list.entries.map(entry => 
                MapperUtils.mapAlfrescoFolder(entry.entry)
            );

            this.logOperation('getFolders successful', { count: folders.length });
            return folders;
        } catch (error) {
            this.logError('getFolders', error);
            throw this.createError('Failed to get folders', error);
        }
    }

    /**
     * Retrieves a single folder by its ID
     * @param folderId - Node ID of the folder
     * @returns Promise resolving to Folder object
     */
    async getFolder(folderId: string): Promise<Folder> {
        try {
            this.logOperation('getFolder', { folderId });

            const params = new URLSearchParams({
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const data = await this.makeRequest<FolderResponse>(
                `/api/-default-/public/alfresco/versions/1/nodes/${folderId}?${params}`
            );

            const folder = MapperUtils.mapAlfrescoFolder(data.entry);
            this.logOperation('getFolder successful', { id: folder.id });
            return folder;
        } catch (error) {
            this.logError('getFolder', error);
            throw this.createError('Failed to get folder', error);
        }
    }

    /**
     * Creates a new folder
     * @param parentFolderId - Parent folder Node ID
     * @param name - Name for the new folder
     * @param description - Optional description for the folder
     * @returns Promise resolving to created Folder object
     */
    async createFolder(
        parentFolderId: string,
        name: string,
        description?: string
    ): Promise<Folder> {
        try {
            this.logOperation('createFolder', { parentFolderId, name });

            const body = {
                name,
                nodeType: 'cm:folder',
                relativePath: '',
                properties: description ? {
                    'cm:description': description
                } : undefined
            };

            const data = await this.makeRequest<FolderResponse>(
                `/api/-default-/public/alfresco/versions/1/nodes/${parentFolderId}/children`,
                {
                    method: 'POST',
                    body: JSON.stringify(body)
                }
            );

            const folder = MapperUtils.mapAlfrescoFolder(data.entry);
            this.logOperation('createFolder successful', { id: folder.id });
            return folder;
        } catch (error) {
            this.logError('createFolder', error);
            throw this.createError('Failed to create folder', error);
        }
    }

    /**
     * Updates a folder's metadata
     * @param folderId - Node ID of the folder to update
     * @param properties - Object containing properties to update
     * @returns Promise resolving to updated Folder object
     */
    async updateFolder(
        folderId: string,
        properties: { name?: string; description?: string }
    ): Promise<Folder> {
        try {
            this.logOperation('updateFolder', { folderId, properties });

            const updateData: Record<string, any> = {
                ...(properties.name && { name: properties.name }),
                ...(properties.description !== undefined && {
                    properties: {
                        'cm:description': properties.description
                    }
                })
            };

            const data = await this.makeRequest<FolderResponse>(
                `/api/-default-/public/alfresco/versions/1/nodes/${folderId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                }
            );

            const folder = MapperUtils.mapAlfrescoFolder(data.entry);
            this.logOperation('updateFolder successful', { id: folder.id });
            return folder;
        } catch (error) {
            this.logError('updateFolder', error);
            throw this.createError('Failed to update folder', error);
        }
    }

    /**
     * Deletes a folder and its contents
     * @param folderId - Node ID of the folder to delete
     */
    async deleteFolder(folderId: string): Promise<void> {
        try {
            this.logOperation('deleteFolder', { folderId });

            await this.makeRequest(
                `/api/-default-/public/alfresco/versions/1/nodes/${folderId}`,
                {
                    method: 'DELETE'
                }
            );

            this.logOperation('deleteFolder successful', { folderId });
        } catch (error) {
            this.logError('deleteFolder', error);
            throw this.createError('Failed to delete folder', error);
        }
    }

    /**
     * Moves a folder to a new parent folder
     * @param folderId - Node ID of the folder to move
     * @param targetParentId - Node ID of the destination parent folder
     * @returns Promise resolving to moved Folder object
     */
    async moveFolder(folderId: string, targetParentId: string): Promise<Folder> {
        try {
            this.logOperation('moveFolder', { folderId, targetParentId });

            const data = await this.makeRequest<FolderResponse>(
                `/api/-default-/public/alfresco/versions/1/nodes/${folderId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({ targetParentId })
                }
            );

            const folder = MapperUtils.mapAlfrescoFolder(data.entry);
            this.logOperation('moveFolder successful', { id: folder.id });
            return folder;
        } catch (error) {
            this.logError('moveFolder', error);
            throw this.createError('Failed to move folder', error);
        }
    }

    /**
     * Copies a folder to a new parent folder
     * @param folderId - Node ID of the folder to copy
     * @param targetParentId - Node ID of the destination parent folder
     * @returns Promise resolving to copied Folder object
     */
    async copyFolder(folderId: string, targetParentId: string): Promise<Folder> {
        try {
            this.logOperation('copyFolder', { folderId, targetParentId });

            const data = await this.makeRequest<FolderResponse>(
                `/api/-default-/public/alfresco/versions/1/nodes/${folderId}/copy`,
                {
                    method: 'POST',
                    body: JSON.stringify({ targetParentId })
                }
            );

            const folder = MapperUtils.mapAlfrescoFolder(data.entry);
            this.logOperation('copyFolder successful', { id: folder.id });
            return folder;
        } catch (error) {
            this.logError('copyFolder', error);
            throw this.createError('Failed to copy folder', error);
        }
    }
}