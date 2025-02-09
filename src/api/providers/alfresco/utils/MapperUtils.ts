// src/api/providers/alfresco/utils/MapperUtils.ts

import { Department, Document, Folder, UserProfile, BrowseItem } from '../../../types';
import { AlfrescoNodesResponse } from '../types';

/**
 * Utility class for mapping Alfresco API responses to our application types
 * Provides consistent data transformation across the application
 */
 
import { Logger } from '../../../../utils/Logger';
export class MapperUtils {
    static mapAlfrescoBrowseItem(entry: AlfrescoNodesResponse['list']['entries'][0]['entry']): BrowseItem {
        Logger.debug('Starting to map Alfresco node', {
            dms: 'Alfresco',
            util: 'MapperUtils',
            method: 'mapAlfrescoBrowseItem',
            data: { nodeId: entry.id, nodeType: entry.nodeType, raw: entry }
        });

        const baseItem = {
            id: entry.id,
            name: entry.name,
            path: entry.path?.elements ? entry.path.elements.map(el => el.name).join('/') : '',
            isFolder: entry.isFolder,
            isDepartment: false,  // Added isDepartment property
            mimeType: entry.content?.mimeType || 'application/octet-stream',
            size: entry.content?.sizeInBytes || 0,
            lastModified: entry.modifiedAt,
            createdAt: entry.createdAt,
            createdBy: entry.createdByUser?.displayName || '',
            modifiedBy: entry.modifiedByUser?.displayName || '',
            allowableOperations: entry.allowableOperations || [],
            type: entry.isFolder ? 'folder' as const : 'file' as const
        };

        Logger.debug('Base item mapped', {
            dms: 'Alfresco',
            util: 'MapperUtils',
            method: 'mapAlfrescoBrowseItem',
            data: { baseItem }
        });

        const folderData: Folder = {
            id: entry.id,
            name: entry.name,
            path: baseItem.path,
            parentId: entry.properties?.['cm:parentId'] || '',
            createdBy: baseItem.createdBy,
            modifiedBy: baseItem.modifiedBy,
            createdAt: entry.createdAt,
            modifiedAt: entry.modifiedAt,
            isDepartment: false,
            isFolder: true,
            mimeType: 'application/vnd.folder',
            size: 0,
            lastModified: entry.modifiedAt,
            allowableOperations: entry.allowableOperations || [],
            type: 'folder' as const,
            data: null as any  // Will be set after creation
        };
        folderData.data = folderData;

        const fileData: Document = {
            id: entry.id,
            name: entry.name,
            path: baseItem.path,
            mimeType: baseItem.mimeType,
            size: baseItem.size,
            lastModified: entry.modifiedAt,
            createdBy: baseItem.createdBy,
            modifiedBy: baseItem.modifiedBy,
            isOfflineAvailable: false,
            isDepartment: false,
            isFolder: false,
            modifiedAt: entry.modifiedAt,
            createdAt: entry.createdAt,  // Added the missing property
            allowableOperations: entry.allowableOperations || [],
            type: 'file' as const,
            data: null as any
        };
        fileData.data = fileData;

        const result = { ...baseItem, data: entry.isFolder ? folderData : fileData };

        Logger.debug('Final mapped item', {
            dms: 'Alfresco',
            util: 'MapperUtils',
            method: 'mapAlfrescoBrowseItem',
            data: { result }
        });

        return result;
    }
    /**
     * Maps Alfresco document node to our Document interface
     * @param entry - Raw document data from Alfresco
     * @returns Mapped Document object
     */
    static mapAlfrescoDocument(entry: any): Document {
        try {
            if (!entry) {
                throw new Error('No entry provided for document mapping');
            }

            return {
                id: entry.id,
                name: entry.name,
                path: entry.path?.name || '',
                mimeType: entry.content?.mimeType || 'application/octet-stream',
                size: entry.content?.sizeInBytes || 0,
                lastModified: entry.modifiedAt,
                createdBy: this.getDisplayName(entry.createdByUser),
                modifiedBy: this.getDisplayName(entry.modifiedByUser),
                isOfflineAvailable: false,
                isDepartment: false,
                createdAt: entry.createdAt,
                modifiedAt: entry.modifiedAt,
                isFolder: false,
                allowableOperations: entry.allowableOperations || [],
                type: 'file' as const,
                data: entry
            };
        } catch (error: unknown) {  // Type the error as 'unknown'
            // Check if the error is an instance of Error before accessing its properties
            if (error instanceof Error) {
                console.error('Error mapping document:', error);
                throw new Error(`Failed to map document: ${error.message}`);
            } else {
                // If the error is not an instance of Error, handle it safely
                console.error('Error mapping document:', error);
                throw new Error('An unknown error occurred during document mapping');
            }
        }
    }
    

    /**
     * Maps Alfresco folder node to our Folder interface
     * @param entry - Raw folder data from Alfresco
     * @returns Mapped Folder object
     */
    static mapAlfrescoFolder(entry: any): Folder {
        try {
            if (!entry) {
                throw new Error('No entry provided for folder mapping');
            }
            return {
                id: entry.entry.id,
                name: entry.entry.name,
                path: entry.path?.name || '',
                parentId: entry.entry.parentId,
                createdBy: entry.entry.createdByUser?.displayName || '',
                modifiedBy: entry.entry.modifiedByUser?.displayName || '',
                createdAt: entry.entry.createdAt,
                modifiedAt: entry.entry.modifiedAt,
                isDepartment: false,
                isFolder: true,
                mimeType: 'application/vnd.folder',
                size: 0,
                lastModified: entry.entry.modifiedAt,
                allowableOperations: entry.entry.allowableOperations || [],
                type: 'folder' as const,
                data: entry.entry

            };
        } catch (error: unknown) {  // Type the error as 'unknown'
            // Check if the error is an instance of Error before accessing its properties
            if (error instanceof Error) {
                console.error('Error mapping folder:', error);
                throw new Error(`Failed to map folder: ${error.message}`);
            } else {
                // If the error is not an instance of Error, handle it safely
                console.error('Error mapping folder:', error);
                throw new Error('An unknown error occurred during folder mapping');
            }
        }
    }
    

    /**
     * Maps Alfresco user data to our UserProfile interface
     * @param entry - Raw user data from Alfresco
     * @returns Mapped UserProfile object
     */
    static mapAlfrescoUser(entry: any): UserProfile {
        try {
            if (!entry) {
                throw new Error('No entry provided for user mapping');
            }
    
            return {
                id: entry.id,
                firstName: entry.firstName || '',
                lastName: entry.lastName || '',
                displayName: entry.displayName || `${entry.firstName} ${entry.lastName}`.trim(),
                email: entry.email || '',
                username: entry.id
            };
        } catch (error: unknown) {  // Type the error as 'unknown'
            // Check if the error is an instance of Error before accessing its properties
            if (error instanceof Error) {
                console.error('Error mapping user:', error);
                throw new Error(`Failed to map user: ${error.message}`);
            } else {
                // If the error is not an instance of Error, handle it safely
                console.error('Error mapping user:', error);
                throw new Error('An unknown error occurred during user mapping');
            }
        }
    }
    

    /**
     * Helper method to safely get display name from user object
     * @param user - User object from Alfresco
     * @returns Display name string
     */
    private static getDisplayName(user: any): string {
        if (!user) return '';
        return user.displayName || user.id || '';
    }

    private static mapCustomProperties(properties: any): Record<string, any> {
        if (!properties) return {};
    
        const customProps: Record<string, any> = {};
    
        Object.entries(properties).forEach(([key, value]) => {
            // Skip standard Alfresco properties
            if (key.startsWith('cm:')) return;
    
            // Handle different property types
            if (typeof value === 'object' && value !== null) {
                if ('value' in value) {
                    // Handle property with explicit value field
                    customProps[key] = (value as { value: any }).value; // Type assertion to object with 'value'
                } else if (Array.isArray(value)) {
                    // Handle multi-value properties
                    customProps[key] = value.map(item =>
                        'value' in item ? (item as { value: any }).value : item
                    );
                } else {
                    // Handle complex objects
                    customProps[key] = value;
                }
            } else {
                // Handle simple values
                customProps[key] = value;
            }
        });
    
        return customProps;
    }
    

    /**
     * Formats a date string according to application standards
     * @param dateString - ISO date string from Alfresco
     * @returns Formatted date string
     */
    static formatDate(dateString: string): string {
        try {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    /**
     * Formats file size in human-readable format
     * @param bytes - Size in bytes
     * @returns Formatted size string
     */
    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
 * Maps an array of Alfresco API entries to Document objects
 * @param entries - Array of raw Alfresco node entries from the API response
 * @returns Array of mapped Document objects with standardized properties
 * @example
 * const documents = MapperUtils.mapAlfrescoDocuments(response.list.entries);
 * // Returns: Document[] with mapped properties from Alfresco format
 */
static mapAlfrescoDocuments(entries: any[]): Document[] {
    return entries.map(entry => this.mapAlfrescoDocument(entry));
}

static mapDepartments(entries: any[]): Department[] {
    if (!entries) {
        return [];
    }

    return entries.map(entry => (this.mapDepartment(entry)));
}


static mapDepartment(entry: any): Department {
    const dept = {
        id: entry.entry.guid,
        name: entry.entry.title,
        path: `/sites/${entry.entry.id}`,
        isDepartment: true,
        createdBy: entry.entry.visibility,
        isFolder: true,
        mimeType: 'application/vnd.folder',
        size: 0,
        lastModified: entry.entry.modifiedAt || new Date().toISOString(),
        modifiedBy: entry.entry.visibility,
        createdAt: entry.entry.createdAt || new Date().toISOString(),
        modifiedAt: entry.entry.modifiedAt || new Date().toISOString(),
        allowableOperations: [],
        type: 'department' as const,
        data: null as any
    };
    dept.data = dept;
    return dept;
}
}




