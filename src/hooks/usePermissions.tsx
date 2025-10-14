import { useAuth } from "./useAuth";

interface UsePermissionsOptions {
  companyId?: string;
  userId?: string;
}

/**
 * Stub implementation for single-tenant mode
 * All permission checks return false since multi-tenant features are disabled
 */
export function usePermissions(options: UsePermissionsOptions = {}) {
  const { userRole } = useAuth();

  const hasPermission = (permission: string): boolean => {
    // Only super_admin has permissions in single-tenant mode
    return userRole === 'super_admin';
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return userRole === 'super_admin';
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return userRole === 'super_admin';
  };

  const canViewMenuItem = (menuKey: string): boolean => {
    // Basic menu items are visible to all users
    const publicMenus = ['home', 'requests', 'help', 'settings'];
    if (publicMenus.includes(menuKey)) return true;
    
    // Admin menus only for super_admin
    return userRole === 'super_admin';
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    // All features disabled in single-tenant mode
    return false;
  };

  const getUserFeatures = () => {
    return [];
  };

  const getUserPermissions = () => {
    return [];
  };

  const hasFeature = (featureKey: string): boolean => {
    // All features disabled in single-tenant mode
    return false;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canViewMenuItem,
    isFeatureEnabled,
    hasFeature,
    getUserFeatures,
    getUserPermissions,
    isLoading: false,
    userPermissions: [],
    rolePermissions: [],
    platformPermissions: [],
  };
}
