import { BaseService } from './BaseService';
import { Department } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';

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
                fields: ['id', 'title', 'description', 'visibility'].join(',')
            });

            const response = await this.makeRequest<{ list: { entries: any[] } }>(
                `/api/-default-/public/alfresco/versions/1/sites?${queryParams}`
            );

            if (!response?.list?.entries) {
                throw new Error('Invalid departments response format');
            }

            return this.mapDepartments(response.list.entries);
        } catch (error) {
            this.logError('getDepartments', error);
            throw this.createError('Failed to get departments', error);
        }
    }

    private mapDepartments(entries: any[]): Department[] {
        return entries.map(entry => ({
            id: entry.entry.id,
            name: entry.entry.title,
            description: entry.entry.description,
            isDepartment: true,
            parentPath: `/sites/${entry.entry.id}`,
            materializePath: `/sites/${entry.entry.id}`,
            createdBy: entry.entry.visibility
        }));
    }


async getDepartment(departmentId: string): Promise<Department> {
    try {
        this.logOperation('getDepartment', { departmentId });
        
        const queryParams = new URLSearchParams({
            fields: ['id', 'title', 'description', 'visibility'].join(',')
        });

        const response = await this.makeRequest<{ entry: any }>(
            `/api/-default-/public/alfresco/versions/1/sites/${departmentId}?${queryParams}`
        );

        if (!response?.entry) {
            throw new Error('Invalid department response format');
        }

        return this.mapDepartment(response.entry);
    } catch (error) {
        this.logError('getDepartment', error);
        throw this.createError('Failed to get department', error);
    }
}
private mapDepartment(entry: any): Department {
    return {
        id: entry.id,
        name: entry.title,
        description: entry.description,
        isDepartment: true,
        parentPath: `/sites/${entry.id}`,
        materializePath: `/sites/${entry.id}`,
        createdBy: entry.visibility
    };
}

}
