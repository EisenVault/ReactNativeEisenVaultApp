// src/api/providers/alfresco/services/FolderService.ts

import { BaseService } from './BaseService';
import { Folder } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';
import { Logger } from '../../../../utils/Logger';

/**
 * Constants for API endpoints
 */
const ENDPOINTS = {
    NODES: 'api/-default-/public/alfresco/versions/1/nodes',
    CHILDREN: 'children',
} as const;

/**
 * Interface for Alfresco API pagination data
 */
interface AlfrescoPagination {
    count: number;
    hasMoreItems: boolean;
    totalItems: number;
    skipCount: number;
    maxItems: number;
}

/**
 * Interface for Alfresco API user data
 */
interface AlfrescoUser {
    id: string;
    displayName: string;
}

/**
 * Interface for Alfresco API path element
 */
interface AlfrescoPathElement {
    id: string;
    name: string;
}

/**
 * Interface for a single Alfresco node entry
 */
interface AlfrescoNode {
    id: string;
    name: string;
    nodeType: string;
    isFolder: boolean;
    isFile: boolean;
    modifiedAt?: string;
    createdAt?: string;
    createdByUser?: AlfrescoUser;
    modifiedByUser?: AlfrescoUser;
    parentId?: string;
    path?: {
        elements: AlfrescoPathElement[];
    };
    properties?: Record<string, unknown>;
    allowableOperations?: string[];
}

/**
 * Interface for Alfresco API node response
 */
interface AlfrescoNodeResponse {
    entry: AlfrescoNode;
}

/**
 * Interface for Alfresco API nodes list response
 */
interface AlfrescoNodesResponse {
    list: {
        entries: AlfrescoNodeResponse[];
        pagination: AlfrescoPagination;
    };
}

/**
 * Interface for folder creation request payload
 */
interface CreateFolderPayload {
    name: string;
    nodeType: string;
    properties?: {
        'cm:title'?: string;
        'cm:description'?: string;
    };
    relativePath?: string;
}
/**
 * Service class for handling folder operations with Alfresco API
 */
export class FolderService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    async getFolders(
        parentFolderId: string,
        filters?: { nodeType?: string }
    ): Promise<Folder[]> {
        try {
            Logger.info('Fetching folders', {
                dms: 'Alfresco',
                service: 'FolderService',
                method: 'getFolders',
                data: { parentFolderId, filters }
            });

            const queryParams = new URLSearchParams({
                include: 'path,properties,allowableOperations',
                where: '(isFolder=true)'
            });

            if (filters?.nodeType) {
                queryParams.set('where', `(nodeType='${filters.nodeType}')`);
            }

            const nodeId = parentFolderId === '-root-' ? '-root-' : parentFolderId;
            const endpoint = parentFolderId ? 
                `${ENDPOINTS.NODES}/${nodeId}/${ENDPOINTS.CHILDREN}` :
                ENDPOINTS.NODES;

            Logger.debug('Making folder request', {
                dms: 'Alfresco',
                service: 'FolderService',
                method: 'getFolders',
                data: { endpoint, queryParams: queryParams.toString() }
            });

            const response = await this.makeRequest<AlfrescoNodesResponse>(
                `${endpoint}?${queryParams}`
            );

            if (!response?.list?.entries) {
                throw new Error('Invalid response format');
            }

            const folders = response.list.entries
                .filter(entry => entry.entry.isFolder)
                .map(entry => this.mapAlfrescoNodeToFolder(entry.entry));

            Logger.info('Folders fetched successfully', {
                dms: 'Alfresco',
                service: 'FolderService',
                method: 'getFolders',
                data: { count: folders.length }
            });
            
            return folders;
        } catch (error) {
            Logger.error('Failed to fetch folders', {
                dms: 'Alfresco',
                service: 'FolderService',
                method: 'getFolders',
                data: { parentFolderId }
            }, error as Error);
            throw this.createError('Failed to get folders', error);
        }
    }

    /**
     * Retrieves details of a specific folder
     * @param folderId - ID of the folder to retrieve
     * @returns Promise resolving to a Folder object
     */
    async getFolder(folderId: string): Promise<Folder> {
        try {
            this.logOperation('getFolder', { folderId });

            const response = await this.makeRequest<AlfrescoNodeResponse>(
                `${ENDPOINTS.NODES}/${folderId}?include=path,properties,allowableOperations`
            );

            if (!response?.entry) {
                throw new Error('Invalid response format');
            }

            const folder = this.mapAlfrescoNodeToFolder(response.entry);
            this.logOperation('getFolder successful', { id: folder.id });
            return folder;

        } catch (error) {
            this.logError('getFolder failed', error);
            throw this.createError('Failed to get folder', error);
        }
    }

    /**
     * Creates a new folder
     * @param parentFolderId - ID of the parent folder
     * @param name - Name of the new folder
     * @param description - Optional description for the folder
     * @returns Promise resolving to the created Folder object
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
                nodeType: 'cm:folder',
                properties: description ? {
                    'cm:description': description
                } : undefined
            };

            const response = await this.makeRequest<AlfrescoNodeResponse>(
                `${ENDPOINTS.NODES}/${parentFolderId}/children`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            );

            if (!response?.entry) {
                throw new Error('Invalid response format');
            }

            const folder = this.mapAlfrescoNodeToFolder(response.entry);
            this.logOperation('createFolder successful', { id: folder.id });
            return folder;

        } catch (error) {
            this.logError('createFolder failed', error);
            throw this.createError('Failed to create folder', error);
        }
    }
    /**
     * Deletes one or more folders
     * @param folderIds - Single folder ID or array of folder IDs to delete
     * @returns Promise that resolves when deletion is complete
     */
    async deleteFolder(folderIds: string | string[]): Promise<void> {
        try {
            const ids = Array.isArray(folderIds) ? folderIds : [folderIds];
            this.logOperation('deleteFolder', { ids });

            await Promise.all(
                ids.map(id => 
                    this.makeRequest(`${ENDPOINTS.NODES}/${id}`, {
                        method: 'DELETE'
                    })
                )
            );

            this.logOperation('deleteFolder successful', { ids });
        } catch (error) {
            this.logError('deleteFolder failed', error);
            throw this.createError('Failed to delete folder(s)', error);
        }
    }

    /**
     * Retrieves the complete path to a folder
     * @param folderId - ID of the folder
     * @returns Promise resolving to array of Folder objects representing the path
     */
    async getFolderPath(folderId: string): Promise<Folder[]> {
        try {
            this.logOperation('getFolderPath', { folderId });

            const response = await this.makeRequest<AlfrescoNodeResponse>(
                `${ENDPOINTS.NODES}/${folderId}?include=path`
            );

            if (!response?.entry?.path?.elements) {
                throw new Error('Invalid response format');
            }

            const path = response.entry.path.elements.map(element => ({
                id: element.id,
                name: element.name,
                parentId: null, // Path elements don't include parent info
                createdAt: undefined,
                createdBy: undefined,
                modifiedAt: undefined,
                modifiedBy: undefined
            }));

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

    /**
     * Checks if a folder exists
     * @param folderId - ID of the folder to check
     * @returns Promise resolving to boolean indicating existence
     */
    async folderExists(folderId: string): Promise<boolean> {
        try {
            await this.getFolder(folderId);
            return true;
        } catch (error) {
            if (error instanceof Error && 
                error.message.includes('404')) {
                return false;
            }
            throw error;
        }
    }

    /**
     * Maps an Alfresco node to our internal Folder type
     * @param node - Alfresco node data
     * @returns Folder object
     */
    private mapAlfrescoNodeToFolder(node: AlfrescoNode): Folder {
        return {
            id: node.id,
            name: node.name,
            path: node.path?.elements.map(e => e.name).join('/'),
            parentId: node.parentId || null,
            createdAt: node.createdAt,
            createdBy: node.createdByUser?.displayName,
            modifiedAt: node.modifiedAt,
            modifiedBy: node.modifiedByUser?.displayName
        };
    }
}