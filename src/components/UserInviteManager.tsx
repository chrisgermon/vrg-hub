import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { formatAUDate } from "@/lib/dateUtils";
import { UserPlus, Mail, Calendar, CheckCircle2, XCircle, Clock, Send, RefreshCw } from 'lucide-react';
import { USER_ROLE_KEYS, formatRoleLabel } from "@/lib/access-control";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  company_id: z.string().uuid("Please select a company"),
  role: z.enum(USER_ROLE_KEYS),
  days_valid: z.coerce.number().min(1).max(90).default(30),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface UserInvite {
  id: string;
  email: string;
  company_id: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  companies: {
    name: string;
  };
}

interface Company {
  id: string;
  name: string;
}

export function UserInviteManager() {
  const { user } = useAuth();
  const {
    isSuperAdmin,
    isTenantAdmin,
    tenantCompanyId,
    availableRoles,
    canManageRole,
    canAccessCompany,
    defaultTenantRole,
  } = useAccessControl();
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      role: defaultTenantRole,
      days_valid: 30,
      company_id: tenantCompanyId ?? "",
    },
  });

  const isAuthorised = isSuperAdmin || isTenantAdmin;

  useEffect(() => {
    if (!isAuthorised) return;
    fetchData();
  }, [isAuthorised]);

  useEffect(() => {
    if (isTenantAdmin && tenantCompanyId) {
      form.setValue("company_id", tenantCompanyId);
    }
  }, [form, isTenantAdmin, tenantCompanyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invites
      // User invites disabled for single-tenant mode
      setInvites([]);

      // Use static company list for single-tenant
      setCompanies([{ id: '1', name: 'Vision Radiology' }]);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: InviteFormValues) => {
    if (!user) return;

    if (!canManageRole(values.role)) {
      toast.error("You do not have permission to assign that role");
      return;
    }

    if (!canAccessCompany(values.company_id)) {
      toast.error("You can only invite users to your own company");
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + values.days_valid);

      // User invite functionality disabled for single-tenant
      toast.success('User invite functionality not available in single-tenant mode');

      form.reset();
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error creating invite:", error);
      toast.error(error.message || "Failed to create invite");
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      // Revoke functionality disabled for single-tenant
      toast.success("Invite functionality not available");
    } catch (error: any) {
      console.error("Error revoking invite:", error);
      toast.error("Failed to revoke invite");
    }
  };

  const resendInvite = async (inviteId: string) => {
    try {
      const emailResult = await supabase.functions.invoke('send-user-invite-email', {
        body: {
          inviteId: inviteId
        }
      });

      if (emailResult.error) {
        console.error('Failed to send invite email:', emailResult.error);
        toast.error('Failed to send invite email');
      } else {
        toast.success('Invite email resent successfully');
      }
    } catch (error: any) {
      console.error("Error resending invite:", error);
      toast.error("Failed to resend invite");
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    if (status === "accepted") {
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Accepted</Badge>;
    }
    if (status === "revoked") {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Revoked</Badge>;
    }
    if (new Date(expiresAt) < new Date()) {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Expired</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  };

  if (!isAuthorised) {
    return null;
  }

  if (loading) {
    return <Card><CardContent className="p-6">Loading invites...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              User Invites
            </CardTitle>
            <CardDescription>
              Invite users to join your organisation with pre-assigned roles
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User Invite</DialogTitle>
                <DialogDescription>
                  Send an invite to a new user. They must use an email within your company's domains.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="user@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a company" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role.key} value={role.key}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The role will be automatically assigned when they sign up
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="days_valid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid For (days)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={90} {...field} />
                        </FormControl>
                        <FormDescription>
                          How many days the invite will remain valid
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Send Invite</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No invites found. Create your first invite to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.email}</TableCell>
                    <TableCell>{invite.companies?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {formatRoleLabel(invite.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(invite.status, invite.expires_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatAUDate(invite.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatAUDate(invite.expires_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {invite.status === "pending" && new Date(invite.expires_at) > new Date() && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvite(invite.id)}
                              title="Resend invite email"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeInvite(invite.id)}
                              title="Revoke invite"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
