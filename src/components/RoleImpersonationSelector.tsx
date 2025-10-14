import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_ROLES = [
  { value: 'requester', label: 'Requester' },
  { value: 'manager', label: 'Manager' },
  { value: 'marketing_manager', label: 'Marketing Manager' },
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'marketing', label: 'Marketing' },
] as const;

export function RoleImpersonationSelector() {
  const { 
    impersonatedRole, 
    impersonateRole, 
    clearImpersonation, 
    isImpersonating 
  } = useRoleImpersonation();

  return (
    <div className="flex items-center gap-2">
      {isImpersonating && (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
          Viewing as: {AVAILABLE_ROLES.find(r => r.value === impersonatedRole)?.label}
        </Badge>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isImpersonating ? "default" : "outline"} 
            size="sm"
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            View System As
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Impersonate Role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {AVAILABLE_ROLES.map((role) => (
            <DropdownMenuItem
              key={role.value}
              onClick={() => impersonateRole(role.value as any)}
              className={impersonatedRole === role.value ? 'bg-accent' : ''}
            >
              {role.label}
              {impersonatedRole === role.value && (
                <span className="ml-auto text-xs text-muted-foreground">Active</span>
              )}
            </DropdownMenuItem>
          ))}
          
          {isImpersonating && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={clearImpersonation}
                className="text-destructive focus:text-destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Impersonation
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
