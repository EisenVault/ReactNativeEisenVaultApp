// src/api/providers/angora/services/FolderService.ts

import { BaseService } from './BaseService';
import { Folder } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';
import { MapperUtils } from '../utils/MapperUtils';

const ENDPOINTS = {
    DEPARTMENTS: 'departments',
    FOLDERS: 'folders',
    CHILDREN: 'children',
    STATS: 'stats',
    PATH: 'path'
} as const;

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

interface AngoraFoldersResponse {
    data: Array<AngoraFolderResponse['data']>;
    pagination?: {
        total_items: number;
        page: number;
        page_size: number;
    };
}

interface CreateFolderPayload {
    name: string;
    parent_id: string;
    description?: string;
}

export class FolderService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

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

            const path = parentFolderId ? 
                `${ENDPOINTS.DEPARTMENTS}/${parentFolderId}/${ENDPOINTS.CHILDREN}` :
                ENDPOINTS.DEPARTMENTS;

            const response = await this.makeCustomRequest<AngoraFoldersResponse>(
                `${path}?${queryParams}`,
                {
                    serviceName: 'service-file'
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

    async getFolder(folderId: string): Promise<Folder> {
        try {
            this.logOperation('getFolder', { folderId });

            const response = await this.makeCustomRequest<AngoraFolderResponse>(
                `${ENDPOINTS.FOLDERS}/${folderId}`,
                {
                    serviceName: 'service-file'
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
                ENDPOINTS.FOLDERS,
                {
                    method: 'POST',
                    serviceName: 'service-file',
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

    async deleteFolder(folderIds: string | string[]): Promise<void> {
        try {
            const ids = Array.isArray(folderIds) ? folderIds : [folderIds];
            this.logOperation('deleteFolder', { ids });

            const queryParams = new URLSearchParams({
                ids: ids.join(',')
            });

            await this.makeCustomRequest(
                `${ENDPOINTS.FOLDERS}?${queryParams}`,
                {
                    method: 'DELETE',
                    serviceName: 'service-file'
                }
            );

            this.logOperation('deleteFolder successful', { ids });
        } catch (error) {
            this.logError('deleteFolder failed', error);
            throw this.createError('Failed to delete folder(s)', error);
        }
    }

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
                `${ENDPOINTS.FOLDERS}/${folderId}/${ENDPOINTS.STATS}`,
                {
                    serviceName: 'service-file'
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

    async getFolderPath(folderId: string): Promise<Folder[]> {
        try {
            this.logOperation('getFolderPath', { folderId });

            const response = await this.makeCustomRequest<{
                data: AngoraFolderResponse['data'][];
            }>(
                `${ENDPOINTS.FOLDERS}/${folderId}/${ENDPOINTS.PATH}`,
                {
                    serviceName: 'service-file'
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