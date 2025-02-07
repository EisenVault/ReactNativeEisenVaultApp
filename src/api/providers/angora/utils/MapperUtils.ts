// Import necessary types
import { Document, Folder, SearchResult } from '../../../types';

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
        console.log('Mapping Angora document:', entry);
        console.log('Entry ID:', entry.id);
        return {
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
            modifiedAt: entry.modified_at
        };
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
        return {
            id: entry.id,
            name: entry.name,
            path: entry.path || '',
            parentId: entry.parent_id,
            createdBy: entry.created_by?.display_name || '',
            modifiedBy: entry.modified_by?.display_name || ''
        };
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
}