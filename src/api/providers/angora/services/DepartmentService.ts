// src/api/providers/angora/services/DepartmentService.ts

import { BaseService } from './BaseService';
import { Department, DepartmentResponse } from '../../../types';
import { ApiUtils } from '../utils/ApiUtils';

const ENDPOINTS = {
    DEPARTMENTS: 'departments',
    CHILDREN: 'children'
} as const;

export class DepartmentService extends BaseService {
    constructor(baseUrl: string, apiUtils: ApiUtils) {
        super(baseUrl, apiUtils);
    }

    /**
     * Get all departments the user has access to
     */
    async getDepartments(): Promise<Department[]> {
        try {
            this.logOperation('getDepartments');

            const queryParams = new URLSearchParams({
                slim: 'true'
            });

            const response = await this.makeCustomRequest<DepartmentResponse>(
                `${ENDPOINTS.DEPARTMENTS}?${queryParams}`,
                {
                    method: 'GET',
                    serviceName: 'service-file'
                }
            );

            if (!response?.data) {
                throw new Error('Invalid response format');
            }

            const departments = response.data.map(dept => this.mapDepartment(dept));
            this.logOperation('getDepartments successful', { count: departments.length });
            
            return departments;
        } catch (error) {
            this.logError('getDepartments failed', error);
            throw this.createError('Failed to get departments', error);
        }
    }

    /**
     * Get a specific department by ID
     */
    async getDepartment(departmentId: string): Promise<Department> {
        try {
            this.logOperation('getDepartment', { departmentId });

            const response = await this.makeCustomRequest<DepartmentResponse>(
                `${ENDPOINTS.DEPARTMENTS}/${departmentId}`,
                {
                    method: 'GET',
                    serviceName: 'service-file'
                }
            );

            if (!response?.data?.[0]) {
                throw new Error('Invalid response format or department not found');
            }

            const department = this.mapDepartment(response.data[0]);
            this.logOperation('getDepartment successful', { id: department.id });
            
            return department;
        } catch (error) {
            this.logError('getDepartment failed', error);
            throw this.createError('Failed to get department', error);
        }
    }

    /**
     * Maps Angora API department response to Department interface
     */
    private mapDepartment(data: DepartmentResponse['data'][0]): Department {
        return {
            id: data.id,
            name: data.raw_file_name,
            description: data.description,
            parentPath: data.parent_path,
            materializePath: data.materialize_path,
            isDepartment: data.is_department,
            createdBy: data.created_by,
            editedBy: data.edited_by,
            rawFileName: data.raw_file_name
        };
    }
}