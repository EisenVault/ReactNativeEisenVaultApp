import { BaseService } from './BaseService';
import { ApiUtils } from '../utils/ApiUtils';
import { Logger } from '../../../../utils/Logger';
import { BrowseItem } from '../../../types';
import { MapperUtils } from '../utils/MapperUtils';
import { AngoraNodesResponse } from '../types';

export class BrowseService extends BaseService {
    private static readonly SERVICE_HEADERS = {
        PORTAL: 'web',
        SERVICE_NAME: 'service-file'
    } as const;

    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    async getChildren(parent:BrowseItem): Promise<BrowseItem[]> {
        try {
            Logger.info('Fetching children', {
                dms: 'Angora',
                service: 'BrowseService',
                method: 'getChildren',
                data: { parent }
            });

            const params = new URLSearchParams({
                action: 'default'
            });

        // Use different endpoints based on whether we're fetching department or folder contents
              const path = parent.isDepartment
            ? `departments/${parent.id}/children`
            : `folders/${parent.id}/children`;

                Logger.info('Path for Fetching children', {
                    dms: 'Angora',
                    service: 'BrowseService',
                    method: 'getChildren',
                    data: path
                });

            const response = await this.makeCustomRequest<AngoraNodesResponse>(
                `${path}?${params}`,
                {
                    headers: {
                        'x-portal': BrowseService.SERVICE_HEADERS.PORTAL,
                        'x-service-name': BrowseService.SERVICE_HEADERS.SERVICE_NAME
                    }
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            const items = MapperUtils.mapAngoraBrowseItems(response.data);
            Logger.info('Children fetched successfully', {
                dms: 'Angora',
                service: 'BrowseService',
                method: 'getChildren',
                data: { count: items.length }
            });

            return items;
        } catch (error) {
            Logger.error('Failed to fetch children', {
                dms: 'Angora',
                service: 'BrowseService',
                method: 'getChildren',
                data: { parent }
            }, error instanceof Error ? error : undefined);
            throw this.createError('Failed to get children', error);
        }
    }
}
