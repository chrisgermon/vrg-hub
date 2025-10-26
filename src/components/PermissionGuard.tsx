import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

interface PermissionGuardProps {
  /** Permission key(s) required to view content */
  permission?: string | string[];
  /** Feature key required to view content */
  feature?: string;
  /** If true, requires ALL permissions. If false, requires ANY permission */
  requireAll?: boolean;
  /** Content to show when user has permission */
  children: ReactNode;
  /** Custom fallback to show when user doesn't have permission */
  fallback?: ReactNode;
  /** If true, shows nothing instead of fallback when permission denied */
  hideOnDenied?: boolean;
}

/**
 * Component that guards content based on permissions and features
 * 
 * @example
 * // Check single permission
 * <PermissionGuard permission="create_hardware_request">
 *   <Button>Create Request</Button>
 * </PermissionGuard>
 * 
 * @example
 * // Check multiple permissions (any)
 * <PermissionGuard permission={['approve_hardware_requests', 'approve_marketing_requests']}>
 *   <ApprovalButton />
 * </PermissionGuard>
 * 
 * @example
 * // Check feature flag
 * <PermissionGuard feature="hardware_requests">
 *   <HardwareRequestsSection />
 * </PermissionGuard>
 * 
 * @example
 * // Hide completely when denied
 * <PermissionGuard permission="manage_users" hideOnDenied>
 *   <AdminPanel />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  feature,
  requireAll = false,
  children,
  fallback,
  hideOnDenied = false,
}: PermissionGuardProps) {
  const { hasPermission, hasFeature, hasAnyPermission, isLoading } = usePermissions({
    withFeatureFlags: Boolean(feature),
  });

  // Still loading permissions
  if (isLoading) {
    return null;
  }

  // Check feature flag if specified
  if (feature && !hasFeature(feature)) {
    if (hideOnDenied) return null;
    return fallback || (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          This feature is not enabled for your company.
        </AlertDescription>
      </Alert>
    );
  }

  // Check permissions
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasAccess = requireAll 
      ? permissions.every(p => hasPermission(p))
      : permissions.some(p => hasPermission(p));

    if (!hasAccess) {
      if (hideOnDenied) return null;
      return fallback || (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this.
          </AlertDescription>
        </Alert>
      );
    }
  }

  return <>{children}</>;
}

/**
 * HOC version of PermissionGuard for wrapping entire page components
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string | string[],
  options?: { requireAll?: boolean; feature?: string }
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard 
        permission={permission} 
        feature={options?.feature}
        requireAll={options?.requireAll}
      >
        <Component {...props} />
      </PermissionGuard>
    );
  };
}