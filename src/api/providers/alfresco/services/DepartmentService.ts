import { BaseService } from './BaseService';
import { Department } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';
import { MapperUtils } from '../utils/MapperUtils';
import { Logger } from '../../../../utils/Logger';

export class DepartmentService extends BaseService {
    async getDepartments(): Promise<Department[]> {
        try {
            Logger.info('Fetching departments', {
                dms: 'Alfresco',
                service: 'DepartmentService',
                method: 'getDepartments'
            });
            
            const queryParams = new URLSearchParams({
                skipCount: '0',
                maxItems: '100',
                fields: ['id', 'title', 'description', 'visibility'].join(',')
            });

            const response = await this.makeRequest<{ list: { entries: any[] } }>(
                `/api/-default-/public/alfresco/versions/1/sites?${queryParams}`
            );
            Logger.debug('Department response received', {
                dms: 'Alfresco',
                service: 'DepartmentService',
                method: 'getDepartments',
                data: { response }
            });

            if (!response?.list?.entries) {
                throw new Error('Invalid departments response format');
            }

            const departments = MapperUtils.mapDepartments(response.list.entries);
            Logger.info('Departments fetched successfully', {
                dms: 'Alfresco',
                service: 'DepartmentService',
                method: 'getDepartments',
                data: { count: departments.length }
            });

            return departments;
        } catch (error) {
            Logger.error('Failed to fetch departments', {
                dms: 'Alfresco',
                service: 'DepartmentService',
                method: 'getDepartments'
            }, error as Error);
            throw this.createError('Failed to get departments', error);
        }
    }

    async getDepartment(departmentId: string): Promise<Department> {
        try {
            Logger.info('Fetching single department', {
                dms: 'Alfresco',
                service: 'DepartmentService',
                method: 'getDepartment',
                data: { departmentId }
            });
            
            const queryParams = new URLSearchParams({
                fields: ['id', 'title', 'description', 'visibility'].join(',')
            });

            const response = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/sites/${departmentId}?${queryParams}`
            );

            if (!response?.entry) {
                throw new Error('Invalid department response format');
            }

            const department = MapperUtils.mapDepartment(response.entry);
            Logger.info('Department fetched successfully', {
                dms: 'Alfresco',
                service: 'DepartmentService',
                method: 'getDepartment',
                data: { id: department.id }
            });

            return department;
        } catch (error) {
            Logger.error('Failed to fetch department', {
                dms: 'Alfresco',
                service: 'DepartmentService',
                method: 'getDepartment',
                data: { departmentId }
            }, error as Error);
            throw this.createError('Failed to get department', error);
        }
    }
}