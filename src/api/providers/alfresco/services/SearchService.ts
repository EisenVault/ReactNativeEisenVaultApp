// src/api/providers/alfresco/services/SearchService.ts

import { BaseService } from './BaseService';
import { SearchResult, SearchParams, SearchSortItem } from '../../../types';
import { MapperUtils } from '../utils/MapperUtils';

/**
 * Handles all search-related operations with the Alfresco API
 * Provides advanced search capabilities across documents and folders
 */
export class SearchService extends BaseService {
    /**
     * Default search parameters
     * @private
     */
    private readonly DEFAULT_PARAMS: Partial<SearchParams> = {
        maxItems: 50,
        skipCount: 0,
        include: ['path', 'properties', 'allowableOperations']
    };

    /**
     * Performs a search across the repository
     * @param query - Search query string
     * @param params - Optional search parameters
     * @returns Promise resolving to SearchResult
     */
    async search(query: string, params?: Partial<SearchParams>): Promise<SearchResult> {
        try {
            this.logOperation('search', { query, params });

            const searchBody = this.buildSearchBody(query, params);
            
            const data = await this.makeRequest<{
                list: {
                    entries: Array<{
                        entry: {
                            isFile: boolean;
                            isFolder: boolean;
                        };
                    }>;
                    pagination: {
                        totalItems: number;
                        hasMoreItems: boolean;
                        skipCount: number;
                        maxItems: number;
                    };
                };
            }>(
                '/api/-default-/public/search/versions/1/search',
                {
                    method: 'POST',
                    body: JSON.stringify(searchBody)
                }
            );

            const results = this.mapSearchResults(data);
            
            this.logOperation('search successful', { 
                documentCount: results.documents.length,
                folderCount: results.folders.length,
                totalItems: results.totalItems
            });

            return results;
        } catch (error) {
            this.logError('search', error);
            throw this.createError('Search failed', error);
        }
    }

    /**
     * Performs a faceted search with additional filtering options
     * @param query - Search query string
     * @param facetFields - Array of fields to facet by
     * @param params - Optional search parameters
     * @returns Promise resolving to SearchResult
     */
    async facetedSearch(
        query: string,
        facetFields: string[],
        params?: Partial<SearchParams>
    ): Promise<SearchResult> {
        try {
            this.logOperation('facetedSearch', { query, facetFields, params });

            const searchBody = this.buildSearchBody(query, {
                ...params,
                facetFields
            });

            const data = await this.makeRequest<{
                list: {
                    entries: Array<{
                        entry: {
                            isFile: boolean;
                            isFolder: boolean;
                        };
                    }>;
                    pagination: {
                        totalItems: number;
                    };
                };
                listContext: {
                    facets: Record<string, any>;
                };
            }>(
                '/api/-default-/public/search/versions/1/search',
                {
                    method: 'POST',
                    body: JSON.stringify(searchBody)
                }
            );

            const results = this.mapSearchResults(data);
            
            this.logOperation('facetedSearch successful', {
                documentCount: results.documents.length,
                folderCount: results.folders.length,
                totalItems: results.totalItems,
                facetFields
            });

            return results;
        } catch (error) {
            this.logError('facetedSearch', error);
            throw this.createError('Faceted search failed', error);
        }
    }

    /**
     * Builds the search request body with all parameters
     * @param query - Search query string
     * @param params - Optional search parameters
     * @private
     */
    private buildSearchBody(query: string, params?: Partial<SearchParams>): any {
        const searchParams = {
            ...this.DEFAULT_PARAMS,
            ...params
        };

        return {
            query: {
                query: this.formatSearchQuery(query),
                language: 'afts'
            },
            include: searchParams.include,
            sort: this.buildSortCriteria(searchParams.sort),
            paging: {
                maxItems: searchParams.maxItems,
                skipCount: searchParams.skipCount
            },
            facetFields: searchParams.facetFields ? {
                facets: searchParams.facetFields.map(field => ({ field }))
            } : undefined,
            filterQueries: searchParams.filters ? 
                this.buildFilterQueries(searchParams.filters) : 
                undefined
        };
    }

    /**
     * Formats the search query string with wildcards and special characters
     * @param query - Raw search query
     * @private
     */
    private formatSearchQuery(query: string): string {
        if (!query.endsWith('*') && !query.includes(':')) {
            query = `${query}*`;
        }
        return query;
    }

    /**
     * Builds sort criteria for the search
     * @param sortItems - Array of sort specifications
     * @private
     */
    private buildSortCriteria(sortItems?: SearchSortItem[]): any[] {
        if (!sortItems || sortItems.length === 0) {
            return [{
                type: 'FIELD',
                field: 'score',
                ascending: false
            }];
        }

        return sortItems.map(item => ({
            type: 'FIELD',
            field: item.field,
            ascending: item.ascending
        }));
    }

    /**
     * Builds filter queries from filter parameters
     * @param filters - Object containing filter criteria
     * @private
     */
    private buildFilterQueries(filters: Record<string, string | string[]>): any[] {
        return Object.entries(filters).map(([field, value]) => ({
            query: Array.isArray(value)
                ? `${field}:(${value.join(' OR ')})`
                : `${field}:${value}`
        }));
    }

    /**
     * Maps the raw search response to our SearchResult type
     * @param data - Raw response data from Alfresco
     * @private
     */
    private mapSearchResults(data: any): SearchResult {
        return {
            documents: data.list.entries
                .filter((entry: any) => entry.entry.isFile)
                .map((entry: any) => MapperUtils.mapAlfrescoDocument(entry.entry)),
            folders: data.list.entries
                .filter((entry: any) => entry.entry.isFolder)
                .map((entry: any) => MapperUtils.mapAlfrescoFolder(entry.entry)),
            totalItems: data.list.pagination.totalItems
        };
    }
}