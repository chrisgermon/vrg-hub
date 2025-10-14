import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Shield, Activity, Settings, Database, Mail, MessageSquare, Users2, FileText } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { TestEmailButton } from '@/components/TestEmailButton';
import { SuperAdminStats } from '@/components/SuperAdminStats';
import { AuditLogViewer } from '@/components/AuditLogViewer';
import { SystemEmailLogs } from '@/components/SystemEmailLogs';

export default function PlatformAdmin() {
  const { userRole, user } = useAuth();
  const queryClient = useQueryClient();

  // Only super admins can access platform administration
  if (userRole !== 'super_admin') {
    return <Navigate to="/home" replace />;
  }

  // Fetch all companies for management
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['platform-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_domains(domain, active),
          company_memberships(count)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch beta feedback
  const { data: feedbackList } = useQuery({
    queryKey: ['platform-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beta_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-8 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-lg p-8 shadow-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-700 rounded-lg">
                <Shield className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Platform Administration
                </h1>
                <p className="text-slate-300 mt-1">
                  System-wide management and configuration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TestEmailButton />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['platform-companies'] });
                  queryClient.invalidateQueries({ queryKey: ['platform-feedback'] });
                }}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Overview */}
        <SuperAdminStats />

        {/* Main Content Tabs */}
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              System Users
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="email-logs" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Logs
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Beta Feedback
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Company Management
                    </CardTitle>
                    <CardDescription>
                      Manage all companies in the platform
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <Link to="/admin/companies">View All Companies</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {companiesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {companies?.slice(0, 10).map(company => (
                      <div key={company.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {company.logo_url && (
                            <img src={company.logo_url} alt={company.name} className="h-8 w-8 object-contain" />
                          )}
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {company.company_domains?.length || 0} domains • 
                              {company.active ? ' Active' : ' Inactive'}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/companies/${company.id}`}>Manage</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Users Tab */}
          <TabsContent value="users">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users2 className="h-5 w-5" />
                  System Users
                </CardTitle>
                <CardDescription>
                  Manage platform administrators (currently only crowdit@system.local)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">System Administrator</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Note: Only the crowdit@system.local account has platform admin access.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Audit Logs
                </CardTitle>
                <CardDescription>
                  Track all system-wide changes and activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogViewer />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Logs Tab */}
          <TabsContent value="email-logs">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  System Email Logs
                </CardTitle>
                <CardDescription>
                  Monitor all emails sent from the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SystemEmailLogs />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Beta Feedback Tab */}
          <TabsContent value="feedback">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Beta Feedback
                </CardTitle>
                <CardDescription>
                  Review user feedback and bug reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackList && feedbackList.length > 0 ? (
                  <div className="space-y-3">
                    {feedbackList.map(feedback => (
                      <div key={feedback.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{feedback.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {feedback.user_email} • {new Date(feedback.created_at).toLocaleString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            feedback.feedback_type === 'bug' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : feedback.feedback_type === 'feature'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          }`}>
                            {feedback.feedback_type}
                          </span>
                        </div>
                        <p className="text-sm">{feedback.message}</p>
                        {feedback.page_url && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Page: {feedback.page_url}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No feedback submitted yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Platform Settings
                </CardTitle>
                <CardDescription>
                  Configure platform-wide settings and integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database Management
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Manage database connections and perform maintenance
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://supabase.com/dashboard/project/znpjdrmvjfmneotdhwdo" target="_blank" rel="noopener noreferrer">
                        Open Supabase Dashboard
                      </a>
                    </Button>
                  </div>
                  
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      System Documentation
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Access system documentation and guides
                    </p>
                    <Button variant="outline" size="sm" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
