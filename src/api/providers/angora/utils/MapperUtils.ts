// Import necessary types
import { Document, Folder, SearchResult, BrowseItem } from '../../../types';
import { AngoraNodesResponse } from '../types';
import { Logger } from '../../../../utils/Logger';

/**
 * MapperUtils class provides static methods to map API responses to application-specific types.
 */
export class MapperUtils {
    /**
     * Maps a single API response entry to a Document object.
     * @param entry - The API response entry.
     * @returns A Document object.
     */
    static mapAngoraDocument(entry: any): Document {
        const document: Document = {
            id: entry.id,
            name: entry.name,
            path: entry.path || '',
            mimeType: entry.mime_type || 'application/octet-stream',
            size: entry.size || 0,
            lastModified: entry.modified_at,
            createdBy: entry.created_by?.display_name || '',
            modifiedBy: entry.modified_by?.display_name || '',
            isOfflineAvailable: false,
            isDepartment: false,
            isFolder: false,
            modifiedAt: entry.modified_at,
            createdAt: entry.created_at || new Date().toISOString(),
            allowableOperations: entry.allowable_operations || [],
            type: 'file' as const,
            data: null as any
        };
        document.data = document;
        return document;
    }

    /**
     * Maps an array of API response entries to an array of Document objects.
     * @param entries - The API response entries.
     * @returns An array of Document objects.
     */
    static mapAngoraDocuments(entries: any[]): Document[] {
        return entries.map(entry => this.mapAngoraDocument(entry));
    }

    /**
     * Maps a single API response entry to a Folder object.
     * @param entry - The API response entry.
     * @returns A Folder object.
     */
    static mapAngoraFolder(entry: any): Folder {
        const folder: Folder = {
            id: entry.id,
            name: entry.name,
            path: entry.path || '',
            parentId: entry.parent_id,
            createdBy: entry.created_by?.display_name || '',
            modifiedBy: entry.modified_by?.display_name || '',
            createdAt: entry.created_at || new Date().toISOString(),
            modifiedAt: entry.modified_at || new Date().toISOString(),
            isDepartment: false,
            isFolder: true,
            mimeType: 'application/vnd.folder',
            size: 0,
            lastModified: entry.modified_at || new Date().toISOString(),
            allowableOperations: entry.allowable_operations || [],
            type: 'folder' as const,
            data: null as any
        };
        folder.data = folder;
        return folder;
    }

    /**
     * Maps an array of API response entries to an array of Folder objects.
     * @param entries - The API response entries.
     * @returns An array of Folder objects.
     */
    static mapAngoraFolders(entries: any[]): Folder[] {
        return entries.map(entry => this.mapAngoraFolder(entry));
    }

    /**
     * Maps API search results to documents and folders.
     * @param data - The API search response data.
     * @returns An object containing arrays of Document and Folder objects.
     */
    static mapAngoraSearchResults(data: any): { documents: Document[], folders: Folder[] } {
        const documents: Document[] = [];
        const folders: Folder[] = [];

        // Iterate through the search results and categorize them as documents or folders
        data.forEach((item: any) => {
            if (item.type === 'file') {
                documents.push(this.mapAngoraDocument(item));
            } else if (item.type === 'folder') {
                folders.push(this.mapAngoraFolder(item));
            }
        });
        return { documents, folders };
    }
    static mapAngoraBrowseItems(data: AngoraNodesResponse['data']): BrowseItem[] {
        Logger.debug('Mapping Angora nodes', {
            dms: 'Angora',
            util: 'MapperUtils',
            method: 'mapAngoraBrowseItems',
            data: { count: data.length }
        });

        return data.map(item => {
            const baseItem = {
                id: item.id,
                name: item.raw_file_name,
                path: item.materialize_path || '',
                isFolder: item.is_folder,
                isDepartment: false,  // Added isDepartment property
                mimeType: item.extension ? `application/${item.extension.slice(1)}` : 'application/octet-stream',
                size: item.size || 0,
                lastModified: item.updated_at,
                createdAt: item.created_at,
                createdBy: item.created_by || '',
                modifiedBy: item.edited_by || '',
                allowableOperations: [],
                type: item.is_folder ? 'folder' as const : 'file' as const
            };

            const folderData: Folder = {
                id: item.id,
                name: item.raw_file_name,
                path: baseItem.path,
                parentId: '',
                createdBy: baseItem.createdBy,
                modifiedBy: baseItem.modifiedBy,
                createdAt: item.created_at,
                modifiedAt: item.updated_at,
                isDepartment: false,
                isFolder: true,
                mimeType: 'application/vnd.folder',
                size: 0,
                lastModified: item.updated_at,
                allowableOperations: [],
                type: 'folder' as const,
                data: null as any
            };
            folderData.data = folderData;

            const fileData: Document = {
                id: item.id,
                name: item.raw_file_name,
                path: baseItem.path,
                mimeType: baseItem.mimeType,
                size: baseItem.size,
                lastModified: item.updated_at,
                createdBy: baseItem.createdBy,
                modifiedBy: baseItem.modifiedBy,
                isOfflineAvailable: false,
                isDepartment: false,
                isFolder: false,
                modifiedAt: item.updated_at,
                createdAt: item.created_at,
                allowableOperations: [],
                type: 'file' as const,
                data: null as any
            };
            fileData.data = fileData;

            return { ...baseItem, data: item.is_folder ? folderData : fileData };
        });
    }
}