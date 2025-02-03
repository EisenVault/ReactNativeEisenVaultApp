// src/api/providers/angora/services/SearchService.ts

import { BaseService } from './BaseService';
import { SearchResult, Document, Folder } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';
import { MapperUtils } from '../utils/MapperUtils';

/**
 * Interface for Angora search result item with strict null typing
 */
interface AngoraSearchItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    mime_type: string | null;
    size: number | null;
    modified_at: string;
    created_by: {
        display_name: string | null;
    } | null;
    modified_by: {
        display_name: string | null;
    } | null;
    path: string | null;
    parent_id: string | null;
}

/**
 * Interface for Angora search response
 */
interface AngoraSearchResponse {
    data: AngoraSearchItem[];
    pagination: {
        total_items: number;
        page: number;
        page_size: number;
    } | null;
}

/**
 * Interface for search parameters with strict typing
 */
interface SearchParams {
    name?: string;
    content?: string;
    modified_after?: string;
    modified_before?: string;
    created_by?: string;
    mime_type?: string;
    page?: number;
    limit?: number;
}

/**
 * SearchService handles all search-related operations for the Angora DMS
 * Includes methods for searching documents and folders with various filters
 */
export class SearchService extends BaseService {
    // Constants for service configuration
    private static readonly SERVICE_HEADERS = {
        PORTAL: 'web',
        SERVICE_NAME: 'service-search'
    } as const;

    private static readonly DEFAULT_PAGE_SIZE = 50;
    private static readonly MAX_PAGE_SIZE = 100;

    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    /**
     * Perform a search across the DMS
     * @param query - Search query string
     * @param params - Optional search parameters
     * @returns Promise resolving to SearchResult
     * @throws Error if the search fails or returns invalid data
     */
    async search(query: string, params?: Partial<SearchParams>): Promise<SearchResult> {
        try {
            this.logOperation('search', { query, params });

            const queryParams = this.buildSearchParams(query, params);
            
            const response = await this.makeCustomRequest<AngoraSearchResponse>(
                `api/search?${queryParams}`,
                {
                    headers: {
                        'x-portal': SearchService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': SearchService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid search response format');
            }

            const results = this.processSearchResults(response.data);
            
            this.logOperation('search successful', {
                query,
                documentsFound: results.documents.length,
                foldersFound: results.folders.length
            });

            return {
                ...results,
                totalItems: response.pagination?.total_items ?? (results.documents.length + results.folders.length)
            };
        } catch (error) {
            this.logError('search failed', error);
            throw this.createError('Search failed', error);
        }
    }

    /**
     * Search for documents only
     * @param query - Search query string
     * @param params - Optional search parameters
     * @returns Promise resolving to array of Documents
     */
    async searchDocuments(query: string, params?: Partial<SearchParams>): Promise<Document[]> {
        try {
            const searchResult = await this.search(query, {
                ...params,
                mime_type: 'file'
            });
            return searchResult.documents;
        } catch (error) {
            this.logError('searchDocuments failed', error);
            throw this.createError('Document search failed', error);
        }
    }

    /**
     * Search for folders only
     * @param query - Search query string
     * @param params - Optional search parameters
     * @returns Promise resolving to array of Folders
     */
    async searchFolders(query: string, params?: Partial<SearchParams>): Promise<Folder[]> {
        try {
            const searchResult = await this.search(query, {
                ...params,
                mime_type: 'folder'
            });
            return searchResult.folders;
        } catch (error) {
            this.logError('searchFolders failed', error);
            throw this.createError('Folder search failed', error);
        }
    }

    /**
     * Build search parameters string with type safety
     * @private
     */
    private buildSearchParams(query: string, params?: Partial<SearchParams>): URLSearchParams {
        const searchParams = new URLSearchParams();

        // Add required query parameter
        searchParams.append('name', query);

        // Add optional parameters if provided
        if (params?.content) {
            searchParams.append('content', params.content);
        }
        if (params?.modified_after) {
            searchParams.append('modified_after', params.modified_after);
        }
        if (params?.modified_before) {
            searchParams.append('modified_before', params.modified_before);
        }
        if (params?.created_by) {
            searchParams.append('created_by', params.created_by);
        }
        if (params?.mime_type) {
            searchParams.append('mime_type', params.mime_type);
        }

        // Handle pagination with limits
        const page = params?.page ?? 1;
        const limit = Math.min(
            params?.limit ?? SearchService.DEFAULT_PAGE_SIZE,
            SearchService.MAX_PAGE_SIZE
        );
        
        searchParams.append('page', page.toString());
        searchParams.append('limit', limit.toString());

        return searchParams;
    }

    /**
     * Process search results into documents and folders with proper null handling
     * @private
     */
    private processSearchResults(items: AngoraSearchItem[]): {
        documents: Document[];
        folders: Folder[];
    } {
        const documents: Document[] = [];
        const folders: Folder[] = [];

        for (const item of items) {
            if (item.type === 'file') {
                documents.push(this.mapSearchItemToDocument(item));
            } else if (item.type === 'folder') {
                folders.push(this.mapSearchItemToFolder(item));
            }
        }

        return { documents, folders };
    }

    /**
     * Map search item to Document interface with null handling
     * @private
     */
    private mapSearchItemToDocument(item: AngoraSearchItem): Document {
        return {
            id: item.id,
            name: item.name,
            path: item.path ?? '',
            mimeType: item.mime_type ?? 'application/octet-stream',
            size: item.size ?? 0,
            lastModified: item.modified_at,
            createdBy: item.created_by?.display_name ?? '',
            modifiedBy: item.modified_by?.display_name ?? '',
            isOfflineAvailable: false
        };
    }

    /**
     * Map search item to Folder interface with null handling
     * @private
     */
    private mapSearchItemToFolder(item: AngoraSearchItem): Folder {
        return {
            id: item.id,
            name: item.name,
            path: item.path ?? '',
            parentId: item.parent_id, // Already properly typed as string | null
            createdBy: item.created_by?.display_name ?? '',
            modifiedBy: item.modified_by?.display_name ?? ''
        };
    }

    /**
     * Get suggested search terms based on partial input
     * @param partial - Partial search term
     * @returns Promise resolving to array of suggestions
     */
    async getSearchSuggestions(partial: string): Promise<string[]> {
        try {
            this.logOperation('getSearchSuggestions', { partial });

            const response = await this.makeCustomRequest<{ data: string[] }>(
                `api/search/suggestions?term=${encodeURIComponent(partial)}`,
                {
                    headers: {
                        'x-portal': SearchService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': SearchService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                return [];
            }

            return response.data;
        } catch (error) {
            this.logError('getSearchSuggestions failed', error);
            throw this.createError('Failed to get search suggestions', error);
        }
    }

    /**
     * Clear recent searches for the current user
     */
    async clearRecentSearches(): Promise<void> {
        try {
            this.logOperation('clearRecentSearches');

            await this.makeCustomRequest(
                'api/search/recent',
                {
                    method: 'DELETE',
                    headers: {
                        'x-portal': SearchService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': SearchService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            this.logOperation('clearRecentSearches successful');
        } catch (error) {
            this.logError('clearRecentSearches failed', error);
            throw this.createError('Failed to clear recent searches', error);
        }
    }
}