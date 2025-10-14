export const USER_ROLE_KEYS = [
  "requester",
  "marketing",
  "manager",
  "marketing_manager",
  "tenant_admin",
  "super_admin",
] as const;

export type UserRoleKey = (typeof USER_ROLE_KEYS)[number];

export type AccessScope = "tenant" | "platform";

export interface RoleDefinition {
  key: UserRoleKey;
  label: string;
  description: string;
  scope: AccessScope;
  /** Roles that are allowed to assign this role to others */
  assignableBy: UserRoleKey[];
  /** Tailwind classes for consistent badge styling */
  badgeClassName: string;
  /** Marks the default role for a newly invited tenant user */
  isDefault?: boolean;
}

export interface PermissionGroup {
  key: string;
  name: string;
  description?: string;
  scope: AccessScope | "shared";
  permissions: string[];
}
