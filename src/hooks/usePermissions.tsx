import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { PERMISSION_GROUPS } from "@/lib/access-control/constants";
import type { UserRoleKey } from "@/lib/access-control/types";
import { useCompanyFeatures } from "./useCompanyFeatures";

interface UsePermissionsOptions {
  companyId?: string;
  userId?: string;
}

// Map roles to permission groups (sensible defaults for single-tenant)
const ROLE_GROUPS_MAP: Record<UserRoleKey, string[]> = {
  requester: ["basic-access", "create-requests", "documentation"],
  marketing: ["basic-access", "create-requests", "marketing", "documentation"],
  manager: [
    "basic-access",
    "create-requests",
    "approvals",
    "management",
    "documentation",
    "ticket-management",
  ],
  marketing_manager: [
    "basic-access",
    "create-requests",
    "marketing",
    "approvals",
    "documentation",
    "ticket-management",
  ],
  tenant_admin: [
    "basic-access",
    "create-requests",
    "approvals",
    "marketing",
    "management",
    "configuration",
    "documentation",
    "ticket-management",
  ],
  super_admin: [
    "basic-access",
    "create-requests",
    "approvals",
    "marketing",
    "management",
    "configuration",
    "documentation",
    "system-admin",
    "ticket-management",
  ],
};

export function usePermissions(options: UsePermissionsOptions = {}) {
  const { userRole } = useAuth();
  const { isFeatureEnabled } = useCompanyFeatures();

  // Build the effective permission set for the current role
  const permissionSet = useMemo(() => {
    const roleKey = (userRole ?? "requester") as UserRoleKey;
    const groups = ROLE_GROUPS_MAP[roleKey] || [];
    const allowed = new Set<string>();
    for (const groupKey of groups) {
      const group = PERMISSION_GROUPS.find((g) => g.key === groupKey);
      if (group) {
        group.permissions.forEach((p) => allowed.add(p));
      }
    }
    return allowed;
  }, [userRole]);

  const hasPermission = (permission: string): boolean => {
    return permissionSet.has(permission) || (userRole === "super_admin");
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  const canViewMenuItem = (menuKey: string): boolean => {
    // Keep public menus visible to all users
    const publicMenus = ["home", "requests", "help", "settings"];
    if (publicMenus.includes(menuKey)) return true;

    // Simple rule: admins can see everything
    if (["tenant_admin", "super_admin"].includes(userRole || "")) return true;

    // Otherwise rely on permissions if provided as menu key
    return hasPermission(menuKey);
  };

  const hasFeature = (featureKey: string): boolean => {
    return isFeatureEnabled(featureKey as any);
  };

  const getUserFeatures = () => {
    // Not enumerating features here; rely on feature flags hook per check
    return [] as string[];
  };

  const getUserPermissions = () => Array.from(permissionSet);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canViewMenuItem,
    isFeatureEnabled: hasFeature,
    hasFeature,
    getUserFeatures,
    getUserPermissions,
    isLoading: false,
    userPermissions: Array.from(permissionSet),
    rolePermissions: Array.from(permissionSet),
    platformPermissions: [],
  };
}
