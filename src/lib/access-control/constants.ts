import {
  PermissionGroup,
  RoleDefinition,
  UserRoleKey,
} from "./types";

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: "requester",
    label: "Requester",
    description: "Create and track requests for their own needs.",
    scope: "tenant",
    assignableBy: ["super_admin", "tenant_admin"],
    badgeClassName: "bg-blue-100 text-blue-800",
    isDefault: true,
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Submit and collaborate on marketing requests.",
    scope: "tenant",
    assignableBy: ["super_admin", "tenant_admin"],
    badgeClassName: "bg-blue-100 text-blue-800",
  },
  {
    key: "manager",
    label: "Manager",
    description: "Approve and oversee requests across their team.",
    scope: "tenant",
    assignableBy: ["super_admin", "tenant_admin"],
    badgeClassName: "bg-green-100 text-green-800",
  },
  {
    key: "marketing_manager",
    label: "Marketing Manager",
    description: "Coordinate company-wide marketing initiatives.",
    scope: "tenant",
    assignableBy: ["super_admin", "tenant_admin"],
    badgeClassName: "bg-green-100 text-green-800",
  },
  {
    key: "tenant_admin",
    label: "Tenant Admin",
    description: "Manage users, permissions, and settings for their company.",
    scope: "tenant",
    assignableBy: ["super_admin", "tenant_admin"],
    badgeClassName: "bg-purple-100 text-purple-800",
  },
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Platform-wide administrator with access to every company.",
    scope: "platform",
    assignableBy: ["super_admin"],
    badgeClassName: "bg-red-100 text-red-800",
  },
];

export const ROLE_DEFINITION_MAP = new Map(
  ROLE_DEFINITIONS.map((role) => [role.key, role])
);

export const TENANT_ROLE_DEFINITIONS = ROLE_DEFINITIONS.filter(
  (role) => role.scope === "tenant"
);

export const PLATFORM_ROLE_DEFINITIONS = ROLE_DEFINITIONS.filter(
  (role) => role.scope === "platform"
);

export const DEFAULT_TENANT_ROLE: UserRoleKey =
  ROLE_DEFINITIONS.find((role) => role.scope === "tenant" && role.isDefault)?.key || "requester";

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "basic-access",
    name: "Basic Access",
    description: "Permissions that every active company user typically needs.",
    scope: "tenant",
    permissions: [
      "view_dashboard",
      "view_own_requests",
      "edit_own_drafts",
    ],
  },
  {
    key: "create-requests",
    name: "Create Requests",
    description: "Grant users the ability to submit new requests.",
    scope: "tenant",
    permissions: [
      "create_hardware_request",
      "create_toner_request",
      "create_marketing_request",
      "create_user_account_request",
      "create_user_offboarding_request",
      "create_ticket_request",
      "create_facility_services_request",
      "create_office_services_request",
      "create_accounts_payable_request",
      "create_finance_request",
      "create_technology_training_request",
      "create_it_service_desk_request",
      "create_hr_request",
      "create_department_request",
    ],
  },
  {
    key: "approvals",
    name: "Approvals",
    description: "Approval capabilities for leadership roles.",
    scope: "tenant",
    permissions: [
      "approve_hardware_requests",
      "approve_user_account_requests",
    ],
  },
  {
    key: "marketing",
    name: "Marketing",
    description: "Marketing campaigns and promotional tools.",
    scope: "tenant",
    permissions: [
      "approve_marketing_requests",
      "approve_newsletter_submissions",
      "view_fax_campaigns",
    ],
  },
  {
    key: "management",
    name: "Management",
    description: "Manage people and operational workflows within a company.",
    scope: "tenant",
    permissions: [
      "manage_company_users",
      "manage_newsletter_cycle",
      "view_all_company_requests",
      "view_request_metrics",
    ],
  },
  {
    key: "configuration",
    name: "Configuration",
    description: "Company-specific configuration and integrations.",
    scope: "tenant",
    permissions: [
      "configure_company_settings",
      "manage_company_features",
      "manage_office365_integration",
      "configure_sharepoint",
    ],
  },
  {
    key: "documentation",
    name: "Documentation",
    description: "Surface company resources and share updates.",
    scope: "tenant",
    permissions: [
      "view_modality_details",
      "view_sharepoint_documents",
      "submit_newsletter",
      "view_news",
      "create_news",
      "edit_news",
      "delete_news",
      "manage_knowledge_base",
      "edit_knowledge_base",
      "delete_knowledge_base",
    ],
  },
  {
    key: "ticket-management",
    name: "Ticket Management",
    description: "Assign, track, and resolve support tickets.",
    scope: "tenant",
    permissions: [
      "view_ticket_queue",
      "view_ticket_audit_log",
      "assign_ticket_requests",
      "start_ticket_requests",
      "resolve_ticket_requests",
      "manage_ticket_watchers",
    ],
  },
  {
    key: "system-admin",
    name: "System Administration",
    description: "Platform-wide capabilities reserved for Crowd IT.",
    scope: "platform",
    permissions: [
      "manage_all_companies",
      "manage_system_users",
      "view_audit_logs",
      "manage_file_storage",
      "manage_user_invites",
      "manage_role_permissions",
      "view_system_metrics",
    ],
  },
];

export const formatRoleLabel = (roleKey: string): string => {
  const definition = ROLE_DEFINITION_MAP.get(roleKey as UserRoleKey);
  if (definition) return definition.label;
  return roleKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const getRoleDefinition = (
  roleKey: string | null | undefined
): RoleDefinition | undefined => {
  if (!roleKey) return undefined;
  return ROLE_DEFINITION_MAP.get(roleKey as UserRoleKey);
};

export const getAssignableRoles = (
  actingRole: UserRoleKey | null | undefined
): RoleDefinition[] => {
  if (!actingRole) return [];
  return ROLE_DEFINITIONS.filter((role) =>
    role.assignableBy.includes(actingRole)
  );
};
