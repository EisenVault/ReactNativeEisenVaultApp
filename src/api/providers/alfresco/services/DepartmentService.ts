import { BaseService } from './BaseService';
import { Department } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';
import { MapperUtils } from '../utils/MapperUtils';

export class DepartmentService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    async getDepartments(): Promise<Department[]> {
        try {
            this.logOperation('getDepartments');
            
            const queryParams = new URLSearchParams({
                skipCount: '0',
                maxItems: '100',
                fields: ['id', 'title', 'description', 'visibility', 'guid'].join(',')
            });

            const response = await this.makeRequest<{ list: { entries: any[] } }>(
                `/api/-default-/public/alfresco/versions/1/sites?${queryParams}`
            );
            this.logOperation('getDepartments - response received', { response });

            if (!response?.list?.entries) {
                throw new Error('Invalid departments response format');
            }

            return MapperUtils.mapDepartments(response.list.entries);
        } catch (error) {
            this.logError('getDepartments', error);
            throw this.createError('Failed to get departments', error);
        }
    }

    


async getDepartment(departmentId: string): Promise<Department> {
    try {
        this.logOperation('getDepartment of DepartmentService', { departmentId });
        
        const queryParams = new URLSearchParams({
            fields: ['id', 'title', 'description', 'visibility', 'guid'].join(',')
        });

        const response = await this.makeRequest<{ entry: any }>(
            `/api/-default-/public/alfresco/versions/1/sites/${departmentId}?${queryParams}`
        );

        if (!response?.entry) {
            throw new Error('Invalid department response format');
        }

        return MapperUtils.mapDepartment(response.entry);
    } catch (error) {
        this.logError('getDepartment', error);
        throw this.createError('Failed to get department', error);
    }
}


}
