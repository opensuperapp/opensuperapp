/**
 * RBAC Configuration
 * 
 * Define which groups have access to the admin portal.
 * Users must belong to at least one of these groups to access the application.
 */

export const RBAC_CONFIG = {
  /**
   * List of groups allowed to access the admin portal
   * User's token must contain at least one of these groups in the 'groups' claim
   */
  allowedGroups: ['superapp-admin', 'admin'] as const,
} as const;

/**
 * Check if user has access based on their groups
 * @param userGroups - Array of groups from user's token
 * @returns true if user belongs to at least one allowed group
 */
export function hasAccess(userGroups?: string[]): boolean {
  if (!userGroups || userGroups.length === 0) {
    return false;
  }

  return RBAC_CONFIG.allowedGroups.some(allowedGroup => 
    userGroups.includes(allowedGroup)
  );
}
