// src/api/providers/angora/services/FolderService.ts

import { BaseService } from './BaseService';
import { Folder } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';
import { MapperUtils } from '../utils/MapperUtils';

/**
 * Interface for Angora API folder response
 */
interface AngoraFolderResponse {
    data: {
        id: string;
        name: string;
        path?: string;
        parent_id?: string;
        created_by?: {
            display_name?: string;
        };
        modified_by?: {
            display_name?: string;
        };
    };
}

/**
 * Interface for Angora API folders list response
 */
interface AngoraFoldersResponse {
    data: Array<AngoraFolderResponse['data']>;
    pagination?: {
        total_items: number;
        page: number;
        page_size: number;
    };
}

/**
 * Interface for folder creation payload
 */
interface CreateFolderPayload {
    name: string;
    parent_id: string;
    description?: string;
}

/**
 * FolderService handles all folder-related operations for the Angora DMS
 * Includes methods for retrieving, creating, and managing folders
 */
export class FolderService extends BaseService {
    // Constants for service configuration
    private static readonly SERVICE_HEADERS = {
        PORTAL: 'web',
        SERVICE_NAME: 'service-file'
    } as const;

    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    /**
     * Retrieve all folders within a specified parent folder
     * @param parentFolderId - ID of the parent folder
     * @param filters - Optional filters for the query
     * @returns Promise resolving to array of Folder objects
     */
    async getFolders(
        parentFolderId: string, 
        filters?: { nodeType?: string }
    ): Promise<Folder[]> {
        try {
            this.logOperation('getFolders', { parentFolderId, filters });

            const queryParams = new URLSearchParams({
                only_folders: 'true'
            });

            if (filters?.nodeType) {
                queryParams.append('nodeType', filters.nodeType);
            }

            const response = await this.makeCustomRequest<AngoraFoldersResponse>(
                `api/departments/${parentFolderId}/children?${queryParams}`,
                {
                    headers: {
                        'x-portal': FolderService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': FolderService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            const folders = MapperUtils.mapAngoraFolders(response.data);
            this.logOperation('getFolders successful', { count: folders.length });
            
            return folders;
        } catch (error) {
            this.logError('getFolders failed', error);
            throw this.createError('Failed to get folders', error);
        }
    }

    /**
     * Get a specific folder by ID
     * @param folderId - ID of the folder to retrieve
     * @returns Promise resolving to Folder object
     */
    async getFolder(folderId: string): Promise<Folder> {
        try {
            this.logOperation('getFolder', { folderId });

            const response = await this.makeCustomRequest<AngoraFolderResponse>(
                `api/folders/${folderId}`,
                {
                    headers: {
                        'x-portal': FolderService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': FolderService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            const folder = MapperUtils.mapAngoraFolder(response.data);
            this.logOperation('getFolder successful', { id: folder.id });
            
            return folder;
        } catch (error) {
            this.logError('getFolder failed', error);
            throw this.createError('Failed to get folder', error);
        }
    }

    /**
     * Create a new folder
     * @param parentFolderId - ID of the parent folder
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

            const payload: CreateFolderPayload = {
                name,
                parent_id: parentFolderId,
                ...(description && { description })
            };

            const response = await this.makeCustomRequest<AngoraFolderResponse>(
                'api/folders',
                {
                    method: 'POST',
                    headers: {
                        'x-portal': FolderService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': FolderService.SERVICE_HEADERS.SERVICE_NAME,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            const folder = MapperUtils.mapAngoraFolder(response.data);
            this.logOperation('createFolder successful', { id: folder.id });
            
            return folder;
        } catch (error) {
            this.logError('createFolder failed', error);
            throw this.createError('Failed to create folder', error);
        }
    }

    /**
     * Delete one or more folders
     * @param folderIds - Single folder ID or array of folder IDs to delete
     */
    async deleteFolder(folderIds: string | string[]): Promise<void> {
        try {
            const ids = Array.isArray(folderIds) ? folderIds : [folderIds];
            this.logOperation('deleteFolder', { ids });

            const queryParams = new URLSearchParams({
                ids: ids.join(',')
            });

            await this.makeCustomRequest(
                `api/folders?${queryParams}`,
                {
                    method: 'DELETE',
                    headers: {
                        'x-portal': FolderService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': FolderService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            this.logOperation('deleteFolder successful', { ids });
        } catch (error) {
            this.logError('deleteFolder failed', error);
            throw this.createError('Failed to delete folder(s)', error);
        }
    }

    /**
     * Get folder statistics
     * @param folderId - ID of the folder
     * @returns Promise resolving to folder stats
     */
    async getFolderStats(folderId: string): Promise<{
        totalItems: number;
        totalSize: number;
    }> {
        try {
            this.logOperation('getFolderStats', { folderId });

            const response = await this.makeCustomRequest<{
                data: {
                    total_items: number;
                    total_size: number;
                };
            }>(
                `api/folders/${folderId}/stats`,
                {
                    headers: {
                        'x-portal': FolderService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': FolderService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            return {
                totalItems: response.data.total_items,
                totalSize: response.data.total_size
            };
        } catch (error) {
            this.logError('getFolderStats failed', error);
            throw this.createError('Failed to get folder statistics', error);
        }
    }

    /**
     * Check if a folder exists
     * @param folderId - ID of the folder to check
     * @returns Promise resolving to boolean indicating existence
     */
    async folderExists(folderId: string): Promise<boolean> {
        try {
            await this.getFolder(folderId);
            return true;
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Get the full path to a folder
     * @param folderId - ID of the folder
     * @returns Promise resolving to array of parent folders
     */
    async getFolderPath(folderId: string): Promise<Folder[]> {
        try {
            this.logOperation('getFolderPath', { folderId });

            const response = await this.makeCustomRequest<{
                data: AngoraFolderResponse['data'][];
            }>(
                `api/folders/${folderId}/path`,
                {
                    headers: {
                        'x-portal': FolderService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': FolderService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            const path = response.data.map(folder => MapperUtils.mapAngoraFolder(folder));
            this.logOperation('getFolderPath successful', { 
                folderId,
                pathLength: path.length 
            });
            
            return path;
        } catch (error) {
            this.logError('getFolderPath failed', error);
            throw this.createError('Failed to get folder path', error);
        }
    }
}