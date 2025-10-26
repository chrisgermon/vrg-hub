import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { PERMISSION_GROUPS } from "@/lib/access-control/constants";
import type { UserRoleKey } from "@/lib/access-control/types";
import { useCompanyFeatures } from "./useCompanyFeatures";
import { supabase } from "@/integrations/supabase/client";

interface UsePermissionsOptions {
  companyId?: string;
  userId?: string;
  withFeatureFlags?: boolean;
}

// Map roles to permission groups (sensible defaults for single-tenant)
const ROLE_GROUPS_MAP: Record<UserRoleKey, string[]> = {
  requester: ["basic-access", "create-requests", "documentation"],
  marketing: ["basic-access", "create-requests", "marketing", "documentation"],
  manager: ["basic-access", "create-requests", "approvals", "management", "documentation"],
  marketing_manager: ["basic-access", "create-requests", "marketing", "approvals", "documentation"],
  tenant_admin: [
    "basic-access",
    "create-requests",
    "approvals",
    "marketing",
    "management",
    "configuration",
    "documentation",
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
  ],
};

export function usePermissions(options: UsePermissionsOptions = {}) {
  const { user, userRole } = useAuth();
  const [overrideRole, setOverrideRole] = useState<UserRoleKey | null>(null);
  const [overrideLoading, setOverrideLoading] = useState(false);

  useEffect(() => {
    const targetUserId = options.userId;

    if (!targetUserId || targetUserId === user?.id) {
      setOverrideRole(null);
      setOverrideLoading(false);
      return;
    }

    let isCancelled = false;
    const fetchRole = async () => {
      setOverrideLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', targetUserId);

        if (error) {
          throw error;
        }

        const roles = (data?.map((item) => item.role) || []) as UserRoleKey[];
        const priority: Record<UserRoleKey, number> = {
          super_admin: 100,
          tenant_admin: 90,
          marketing_manager: 60,
          manager: 50,
          marketing: 40,
          requester: 10,
        };

        const highest = roles.sort((a, b) => (priority[b] ?? 0) - (priority[a] ?? 0))[0];
        if (!isCancelled) {
          setOverrideRole(highest ?? null);
        }
      } catch (error) {
        console.error('Error loading override permissions:', error);
        if (!isCancelled) {
          setOverrideRole(null);
        }
      } finally {
        if (!isCancelled) {
          setOverrideLoading(false);
        }
      }
    };

    fetchRole();

    return () => {
      isCancelled = true;
    };
  }, [options.userId, user?.id]);

  const { isFeatureEnabled, loading: featureLoading, refreshFeatures } = useCompanyFeatures({
    enabled: options.withFeatureFlags ?? false,
    companyId: options.companyId ?? null,
  });

  // Build the effective permission set for the current role
  const permissionSet = useMemo(() => {
    const roleKey = (overrideRole ?? userRole ?? "requester") as UserRoleKey;
    const groups = ROLE_GROUPS_MAP[roleKey] || [];
    const allowed = new Set<string>();
    for (const groupKey of groups) {
      const group = PERMISSION_GROUPS.find((g) => g.key === groupKey);
      if (group) {
        group.permissions.forEach((p) => allowed.add(p));
      }
    }
    return allowed;
  }, [overrideRole, userRole]);

  const hasPermission = (permission: string): boolean => {
    return permissionSet.has(permission) || ((overrideRole ?? userRole) === "super_admin");
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
    const effectiveRole = overrideRole ?? userRole;
    if (["tenant_admin", "super_admin"].includes(effectiveRole || "")) return true;

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
    isLoading: overrideLoading || (options.withFeatureFlags ? featureLoading : false),
    userPermissions: Array.from(permissionSet),
    rolePermissions: Array.from(permissionSet),
    platformPermissions: [],
    refreshFeatures,
  };
}
