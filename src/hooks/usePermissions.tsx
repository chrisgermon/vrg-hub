import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UsePermissionsOptions {
  companyId?: string;
  userId?: string;
}

/**
 * Hook to check user permissions
 * 
 * This hook checks permissions in the following order:
 * 1. User-specific permission overrides (user_permissions table)
 * 2. Role-based permissions (role_permissions table)
 * 3. Default role permissions from has_permission function
 * 
 * @example
 * const { hasPermission, isLoading } = usePermissions();
 * if (hasPermission('create_hardware_request')) {
 *   // Show create button
 * }
 */
export function usePermissions(options: UsePermissionsOptions = {}) {
  const { user, company: authCompany, userRole } = useAuth();
  const companyId = options.companyId || authCompany?.id;
  const userId = options.userId || user?.id;

  // Fetch user-specific permission overrides
  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user-permissions", userId, companyId],
    queryFn: async () => {
      if (!userId || !companyId) return [];
      
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId)
        .eq("company_id", companyId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!companyId,
  });

  // Fetch platform-level permissions (for super_admin)
  const { data: platformPermissions = [] } = useQuery({
    queryKey: ["platform-permissions", userRole],
    queryFn: async () => {
      if (!userRole || userRole !== "super_admin") return [];
      
      const { data, error } = await supabase
        .from("platform_permissions")
        .select("*")
        .eq("role", userRole as any)
        .eq("enabled", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userRole && userRole === "super_admin",
  });

  // Fetch role-based permissions (company-scoped)
  const { data: rolePermissions = [], isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ["role-permissions", userRole, companyId],
    queryFn: async () => {
      if (!userRole || !companyId) return [];
      
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", userRole as any)
        .eq("company_id", companyId)
        .eq("enabled", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userRole && !!companyId,
  });

  // Fetch feature flags
  const { data: featureFlags = [] } = useQuery({
    queryKey: ["company-features", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("company_features")
        .select("*")
        .eq("company_id", companyId)
        .eq("enabled", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  /**
   * Check if user has a specific permission
   * @param permissionKey - The permission key to check
   * @returns boolean indicating if user has the permission
   */
  const hasPermission = (permissionKey: string): boolean => {
    if (!userId) return false;

    // Super admins: check platform permissions first, then fall back to role permissions
    if (userRole === "super_admin") {
      // Check platform-level permission first
      const platformPermission = platformPermissions.find(
        (p) => p.permission_key === permissionKey
      );
      if (platformPermission) {
        return platformPermission.enabled;
      }
      
      // Fall back to company-scoped permissions if not found in platform
      if (companyId) {
        const rolePermission = rolePermissions.find(
          (p) => p.permission_key === permissionKey
        );
        if (rolePermission) {
          return rolePermission.enabled;
        }
      }
      
      // Super admin has all permissions by default
      return true;
    }

    // For non-super-admins, require company context
    if (!companyId) return false;

    // Check user-specific override first
    const userOverride = userPermissions.find(
      (p) => p.permission === permissionKey
    );
    if (userOverride) {
      return userOverride.granted;
    }

    // Check company-scoped role-based permission
    const rolePermission = rolePermissions.find(
      (p) => p.permission_key === permissionKey
    );
    if (rolePermission) {
      return rolePermission.enabled;
    }

    // Default to false if not found
    return false;
  };

  /**
   * Check if a feature is enabled for the company
   * @param featureKey - The feature key to check
   * @returns boolean indicating if feature is enabled
   */
  const hasFeature = (featureKey: string): boolean => {
    if (!companyId) return false;
    
    // Super admins see all features
    if (userRole === "super_admin") return true;

    const feature = featureFlags.find((f) => f.feature_key === featureKey);
    return feature?.enabled || false;
  };

  /**
   * Check multiple permissions at once
   * @param permissionKeys - Array of permission keys to check
   * @param requireAll - If true, all permissions must be granted. If false, any permission is enough.
   * @returns boolean indicating if permission check passes
   */
  const hasAnyPermission = (permissionKeys: string[], requireAll = false): boolean => {
    if (!permissionKeys.length) return false;

    if (requireAll) {
      return permissionKeys.every((key) => hasPermission(key));
    }
    
    return permissionKeys.some((key) => hasPermission(key));
  };

  /**
   * Get all permissions the user currently has
   * @returns Array of permission keys the user has
   */
  const getAllPermissions = (): string[] => {
    if (userRole === "super_admin") {
      // Super admins have platform + company permissions
      return [...new Set([
        ...platformPermissions.map((p) => p.permission_key),
        ...rolePermissions.map((p) => p.permission_key),
        "manage_everything",
      ])];
    }

    const granted = new Set<string>();

    // Add company-scoped role permissions
    rolePermissions.forEach((p) => {
      if (p.enabled) granted.add(p.permission_key);
    });

    // Apply user overrides
    userPermissions.forEach((p) => {
      if (p.granted) {
        granted.add(p.permission);
      } else {
        granted.delete(p.permission);
      }
    });

    return Array.from(granted);
  };

  return {
    hasPermission,
    hasFeature,
    hasAnyPermission,
    getAllPermissions,
    isLoading: rolePermissionsLoading,
    permissions: getAllPermissions(),
    features: featureFlags.map((f) => f.feature_key),
  };
}

/**
 * Hook to check if a menu item should be visible
 * @param itemKey - The menu item key
 * @returns boolean indicating if menu item should be visible
 */
export function useMenuVisibility(itemKey: string) {
  const { userRole } = useAuth();

  const { data: menuConfig, isLoading } = useQuery({
    queryKey: ["menu-config", userRole, itemKey],
    queryFn: async () => {
      if (!userRole) return null;
      
      const { data, error } = await supabase
        .from("menu_configurations")
        .select("*")
        .eq("role", userRole as any)
        .eq("item_key", itemKey)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userRole,
  });

  // Super admins see everything
  if (userRole === "super_admin") return { isVisible: true, isLoading };

  return {
    isVisible: menuConfig?.is_visible ?? true, // Default to visible if not configured
    isLoading,
  };
}