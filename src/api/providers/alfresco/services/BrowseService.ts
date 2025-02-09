import { BaseService } from './BaseService';
import { ApiUtils } from '../utils/ApiUtils';
import { Logger } from '../../../../utils/Logger';
import { BrowseItem } from '../../../types';
import { MapperUtils } from '../utils/MapperUtils';
import { ENDPOINTS } from '../constants';
import { AlfrescoNodesResponse } from '../types';

export class BrowseService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    async getChildren(parent: BrowseItem): Promise<BrowseItem[]> {
        try {
            Logger.info('Fetching children', {
                dms: 'Alfresco',
                service: 'BrowseService',
                method: 'getChildren',
                data: { parent }
            });

            const nodeId = parent.id === 'root' ? '-root-' : parent.id;
            Logger.debug('Using nodeId for fetch', {
                dms: 'Alfresco',
                service: 'BrowseService',
                method: 'getChildren',
                data: { nodeId }
            });

            const queryParams = new URLSearchParams({
                include: ['path', 'properties', 'allowableOperations'].join(',')
            });

            const response = await this.makeRequest<{ list: { entries: any[] } }>(
                `/api/-default-/public/alfresco/versions/1/nodes/${nodeId}/children?${queryParams}`
            );

            if (!response?.list?.entries) {
                throw new Error('Invalid response format');
            }

            const items = response.list.entries.map(entry => MapperUtils.mapAlfrescoBrowseItem(entry.entry));
            Logger.info('Children fetched successfully', {
                dms: 'Alfresco',
                service: 'BrowseService',
                method: 'getChildren',
                data: { count: items.length }
            });

            return items;
        } catch (error) {
            Logger.error('Failed to fetch children', {
                dms: 'Alfresco',
                service: 'BrowseService',
                method: 'getChildren',
                data: { parent }
            }, error as Error);
            throw this.createError('Failed to get children', error);
        }
    }
}
