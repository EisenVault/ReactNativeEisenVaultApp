// src/api/providers/angora/services/UserService.ts

import { BaseService } from './BaseService';
import { UserProfile } from '../../../types';

/**
 * Interface for user filters in list operations
 */
interface UserFilters {
    isActive?: boolean;
    isTwoFactorEnabled?: boolean;
    forcePasswordChange?: boolean;
}

/**
 * Interface for user update operations
 */
interface UserUpdateData {
    firstName?: string;
    lastName?: string;
    email?: string;
    jobTitle?: string;
    mobileDialCode?: string;
    mobile?: string;
    isActive?: boolean;
    avatar?: string;
    roles?: string[];
}

/**
 * Interface for user creation operations
 */
interface UserCreateData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    jobTitle?: string;
    twoFaEnabled?: boolean;
    forcePasswordChange?: boolean;
    quota?: string;
    roles?: string[];
}

/**
 * Response type for bulk operations
 */
interface BulkOperationResponse {
    successful: string[];
    failed: Array<{
        id: string;
        reason: string;
    }>;
}

/**
 * User preferences interface
 */
interface UserPreferences {
    locale: string;
    timezone: string;
    receiveAppNotifications: boolean;
    receiveTaskNotifications: boolean;
    receiveCommentNotifications: boolean;
    receiveDocumentNotifications: boolean;
}

/**
 * Service class for handling all user-related operations in Angora
 */
export class UserService extends BaseService {
    private readonly API_ENDPOINTS = {
        USERS: 'api/users',
        BULK_IMPORT: 'api/users/bulk-users-upload',
        IMPORT_LOGS: 'api/users/bulk-users-import-logs',
        PREFERENCES: 'api/users/preferences',
        PASSWORD: 'api/users/password'
    } as const;

    /**
     * Fetches user profile information
     * @param userId - ID of the user to fetch
     * @returns Promise resolving to UserProfile
     */
    async fetchUserProfile(userId: string): Promise<UserProfile> {
        try {
            this.logOperation('fetchUserProfile', { userId });

            const response = await this.makeCustomRequest<{ data: UserProfile }>(
                `${this.API_ENDPOINTS.USERS}/${userId}`
            );

            return response.data;
        } catch (error) {
            this.logError('fetchUserProfile', error);
            throw this.createError('Failed to fetch user profile', error);
        }
    }

    /**
     * Lists users with optional filtering
     * @param filters - Optional filters to apply
     * @param page - Page number for pagination
     * @param limit - Number of items per page
     * @returns Promise resolving to array of UserProfile objects
     */
    async listUsers(
        filters?: UserFilters,
        page: number = 1,
        limit: number = 20
    ): Promise<{ users: UserProfile[]; total: number }> {
        try {
            this.logOperation('listUsers', { filters, page, limit });

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });

            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined) {
                        queryParams.append(`filters.${key}`, value.toString());
                    }
                });
            }

            const response = await this.makeCustomRequest<{
                data: UserProfile[];
                meta: { total: number };
            }>(`${this.API_ENDPOINTS.USERS}?${queryParams}`);

            return {
                users: response.data,
                total: response.meta.total
            };
        } catch (error) {
            this.logError('listUsers', error);
            throw this.createError('Failed to list users', error);
        }
    }
    /**
     * Creates a new user
     * @param userData - Data for creating the user
     * @returns Promise resolving to created UserProfile
     */
    async createUser(userData: UserCreateData): Promise<UserProfile> {
        try {
            this.logOperation('createUser', { email: userData.email });

            const response = await this.makeCustomRequest<{ data: UserProfile }>(
                this.API_ENDPOINTS.USERS,
                {
                    method: 'POST',
                    body: JSON.stringify(userData)
                }
            );

            return response.data;
        } catch (error) {
            this.logError('createUser', error);
            throw this.createError('Failed to create user', error);
        }
    }

    /**
     * Updates user profile information
     * @param userId - ID of the user to update
     * @param updates - Profile fields to update
     * @returns Promise resolving to updated UserProfile
     */
    async updateUser(
        userId: string,
        updates: UserUpdateData
    ): Promise<UserProfile> {
        try {
            this.logOperation('updateUser', { userId });

            const response = await this.makeCustomRequest<{ data: UserProfile }>(
                `${this.API_ENDPOINTS.USERS}/${userId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                }
            );

            return response.data;
        } catch (error) {
            this.logError('updateUser', error);
            throw this.createError('Failed to update user', error);
        }
    }

    /**
     * Updates user preferences
     * @param userId - ID of the user
     * @param preferences - New preferences to set
     */
    async updatePreferences(
        userId: string,
        preferences: Partial<UserPreferences>
    ): Promise<void> {
        try {
            this.logOperation('updatePreferences', { userId });

            await this.makeCustomRequest(
                `${this.API_ENDPOINTS.USERS}/${userId}/${this.API_ENDPOINTS.PREFERENCES}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(preferences)
                }
            );
        } catch (error) {
            this.logError('updatePreferences', error);
            throw this.createError('Failed to update preferences', error);
        }
    }

    /**
     * Changes user password
     * @param userId - ID of the user
     * @param oldPassword - Current password
     * @param newPassword - New password
     */
    async changePassword(
        userId: string,
        oldPassword: string,
        newPassword: string
    ): Promise<void> {
        try {
            this.logOperation('changePassword', { userId });

            await this.makeCustomRequest(
                `${this.API_ENDPOINTS.USERS}/${userId}/${this.API_ENDPOINTS.PASSWORD}`,
                {
                    method: 'PUT',
                    body: JSON.stringify({
                        old_password: oldPassword,
                        password: newPassword,
                        password_confirmation: newPassword
                    })
                }
            );
        } catch (error) {
            this.logError('changePassword', error);
            throw this.createError('Failed to change password', error);
        }
    }

    /**
     * Bulk imports users from CSV
     * @param file - CSV file containing user data
     * @returns Promise resolving to bulk operation response
     */
    async bulkImport(file: File): Promise<BulkOperationResponse> {
        try {
            this.logOperation('bulkImport', { fileName: file.name });

            const formData = new FormData();
            formData.append('users', file);

            const response = await this.makeCustomRequest<{ data: BulkOperationResponse }>(
                this.API_ENDPOINTS.BULK_IMPORT,
                {
                    method: 'POST',
                    body: formData,
                    headers: {
                        // Let browser set the correct Content-Type for FormData
                    }
                }
            );

            return response.data;
        } catch (error) {
            this.logError('bulkImport', error);
            throw this.createError('Failed to import users', error);
        }
    }

    /**
     * Gets bulk import operation logs
     * @param importId - ID of the import operation
     * @returns Promise resolving to operation logs
     */
    async getBulkImportLogs(importId: string): Promise<any> {
        try {
            this.logOperation('getBulkImportLogs', { importId });

            const response = await this.makeCustomRequest<{ data: any }>(
                `${this.API_ENDPOINTS.IMPORT_LOGS}/${importId}`
            );

            return response.data;
        } catch (error) {
            this.logError('getBulkImportLogs', error);
            throw this.createError('Failed to get import logs', error);
        }
    }

    /**
     * Enables or disables two-factor authentication
     * @param userId - ID of the user
     * @param enable - Whether to enable or disable
     */
    async setTwoFactorAuth(userId: string, enable: boolean): Promise<void> {
        try {
            this.logOperation('setTwoFactorAuth', { userId, enable });

            await this.makeCustomRequest(
                `${this.API_ENDPOINTS.USERS}/${userId}/two-factor`,
                {
                    method: enable ? 'POST' : 'DELETE'
                }
            );
        } catch (error) {
            this.logError('setTwoFactorAuth', error);
            throw this.createError('Failed to update two-factor authentication', error);
        }
    }

    /**
     * Checks if a user exists by ID
     * @param userId - ID to check
     * @returns Promise resolving to boolean indicating existence
     */
    async userExists(userId: string): Promise<boolean> {
        try {
            await this.fetchUserProfile(userId);
            return true;
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return false;
            }
            throw error;
        }
    }
}

export default UserService;