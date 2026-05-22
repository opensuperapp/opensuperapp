/**
 * Users Service
 * Handles all user-related API operations
 */

import { apiService } from "./api.service";

export interface User {
  workEmail: string;
  firstName: string;
  lastName: string;
  userThumbnail?: string;
  location?: string;
}

export type BulkCreateResult = {
  success: Array<{ workEmail: string }>;
  failed: Array<{ workEmail: string; reason: string }>;
};

class UsersService {
  private readonly BASE_PATH = "/users";

  /**
   * Get all users
   */
  async getAll(): Promise<User[]> {
    return apiService.get<User[]>(this.BASE_PATH);
  }

  /**
   * Create or update a single user
   */
  async createUser(user: User): Promise<void> {
    return apiService.post(this.BASE_PATH, user);
  }

  /**
   * Create or update multiple users in bulk
   */
  async createBulkUsers(users: User[]): Promise<BulkCreateResult | undefined> {
    return apiService.post(this.BASE_PATH, users);
  }

  /**
   * Delete a user
   */
  async deleteUser(email: string): Promise<void> {
    return apiService.delete(`${this.BASE_PATH}/${encodeURIComponent(email)}`);
  }
}

export const usersService = new UsersService();
