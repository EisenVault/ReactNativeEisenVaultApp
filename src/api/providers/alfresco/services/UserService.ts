// src/api/providers/alfresco/services/UserService.ts

import { BaseService } from './BaseService';
import { UserProfile } from '../../../types';
import { MapperUtils } from '../utils/MapperUtils';

/**
 * Handles all user-related operations with the Alfresco API
 */
export class UserService extends BaseService {
    /**
     * Fetches user profile information
     * @param userId - ID of the user to fetch
     * @returns Promise resolving to UserProfile
     */
    async fetchUserProfile(userId: string): Promise<UserProfile> {
        try {
            this.logOperation('fetchUserProfile', { userId });

            const params = new URLSearchParams({
                include: ['properties', 'capabilities'].join(',')
            });

            const data = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/people/${userId}?${params}`
            );

            const profile = MapperUtils.mapAlfrescoUser(data.entry);
            this.logOperation('fetchUserProfile successful', { userId: profile.id });
            return profile;

        } catch (error) {
            this.logError('fetchUserProfile', error);

            // For 404 errors, return a basic profile
            if (this.isNotFoundError(error)) {
                return this.createBasicProfile(userId);
            }

            throw this.createError('Failed to fetch user profile', error);
        }
    }

    /**
     * Updates user profile information
     * @param userId - ID of the user to update
     * @param updates - Profile fields to update
     * @returns Promise resolving to updated UserProfile
     */
    async updateUserProfile(
        userId: string,
        updates: Partial<UserProfile>
    ): Promise<UserProfile> {
        try {
            // Using logOperation which internally uses BaseService's sanitizeLogData
            this.logOperation('updateUserProfile', { userId, updates });

            const data = await this.makeRequest<{ entry: any }>(
                `/api/-default-/public/alfresco/versions/1/people/${userId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(this.prepareUpdateData(updates))
                }
            );

            const profile = MapperUtils.mapAlfrescoUser(data.entry);
            this.logOperation('updateUserProfile successful', { userId: profile.id });
            return profile;

        } catch (error) {
            this.logError('updateUserProfile', error);
            throw this.createError('Failed to update user profile', error);
        }
    }

    /**
     * Gets the current user's profile information
     * @returns Promise resolving to UserProfile
     */
    async getCurrentUserProfile(): Promise<UserProfile> {
        try {
            this.logOperation('getCurrentUserProfile');
            return await this.fetchUserProfile('-me-');
        } catch (error) {
            this.logError('getCurrentUserProfile', error);
            throw this.createError('Failed to fetch current user profile', error);
        }
    }

    /**
     * Checks if a user exists
     * @param userId - ID of the user to check
     * @returns Promise resolving to boolean indicating existence
     */
    async userExists(userId: string): Promise<boolean> {
        try {
            await this.fetchUserProfile(userId);
            return true;
        } catch (error) {
            if (this.isNotFoundError(error)) {
                return false;
            }
            throw this.createError('Failed to check user existence', error);
        }
    }

    /**
     * Prepares update data for the API request
     * @param updates - Raw update data
     * @returns Prepared update data
     * @private
     */
    private prepareUpdateData(updates: Partial<UserProfile>): Record<string, any> {
        const updateData: Record<string, any> = {};

        // Map UserProfile fields to Alfresco API fields
        if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
        if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.displayName !== undefined) updateData.displayName = updates.displayName;

        return updateData;
    }

    /**
     * Creates a basic user profile for cases where full profile can't be fetched
     * @param userId - User ID to create basic profile for
     * @returns Basic profile object
     * @private
     */
    private createBasicProfile(userId: string): UserProfile {
        return {
            id: userId,
            firstName: '',
            lastName: '',
            displayName: userId,
            email: '',
            username: userId
        };
    }

    /**
     * Checks if an error is a 404 Not Found error
     * @param error - Error to check
     * @returns Boolean indicating if error is 404
     * @private
     */
    private isNotFoundError(error: unknown): boolean {
        if (error instanceof Error) {
            return error.message.includes('404') || 
                   error.message.toLowerCase().includes('not found');
        }
        return false;
    }
}