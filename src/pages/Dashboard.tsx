import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Clock, CheckCircle, AlertCircle, Activity, Users, FileText } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { hasPermission } = usePermissions();
  const isManager = hasPermission("view_request_metrics");

  // Fetch user's request statistics
  const { data: userStats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      const [hardware, marketing, department] = await Promise.all([
        supabase.from("hardware_requests").select("*", { count: "exact", head: false }).eq("user_id", user?.id),
        supabase.from("marketing_requests").select("*", { count: "exact", head: false }).eq("user_id", user?.id),
        supabase.from("department_requests").select("*", { count: "exact", head: false }).eq("user_id", user?.id),
      ]);

      const allRequests = [
        ...(hardware.data || []),
        ...(marketing.data || []),
        ...(department.data || []),
      ];

      return {
        total: allRequests.length,
        pending: allRequests.filter(r => r.status === "submitted" || r.status === "pending").length,
        approved: allRequests.filter(r => r.status === "approved" || r.status === "completed").length,
        declined: allRequests.filter(r => r.status === "declined" || r.status === "rejected").length,
        byType: {
          hardware: hardware.data?.length || 0,
          marketing: marketing.data?.length || 0,
          department: department.data?.length || 0,
        },
        byStatus: allRequests.reduce((acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    },
    enabled: !!user?.id,
  });

  // Fetch company-wide statistics for managers
  const { data: companyStats } = useQuery({
    queryKey: ["company-stats", profile?.company_id],
    queryFn: async () => {
      const [hardware, marketing, department, users] = await Promise.all([
        supabase.from("hardware_requests").select("*", { count: "exact" }).eq("company_id", profile?.company_id),
        supabase.from("marketing_requests").select("*", { count: "exact" }).eq("company_id", profile?.company_id),
        supabase.from("department_requests").select("*", { count: "exact" }).eq("company_id", profile?.company_id),
        supabase.from("profiles").select("*", { count: "exact" }).eq("company_id", profile?.company_id),
      ]);

      return {
        totalRequests: (hardware.count || 0) + (marketing.count || 0) + (department.count || 0),
        totalUsers: users.count || 0,
        pendingApprovals: [
          ...(hardware.data || []),
          ...(marketing.data || []),
          ...(department.data || []),
        ].filter(r => r.status === "pending" || r.status === "submitted").length,
      };
    },
    enabled: isManager && !!profile?.company_id,
  });

  // Fetch activity feed
  const { data: activities } = useQuery({
    queryKey: ["activity-feed", profile?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select(`
          *,
          profiles:user_id (name, email)
        `)
        .eq("company_id", profile?.company_id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!profile?.company_id,
  });

  const statusData = userStats ? Object.entries(userStats.byStatus).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  })) : [];

  const typeData = userStats ? [
    { name: "Hardware", value: userStats.byType.hardware },
    { name: "Marketing", value: userStats.byType.marketing },
    { name: "Department", value: userStats.byType.department },
  ] : [];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  return (
    <div className="container mx-auto py-3 md:py-8 px-3 md:px-4 max-w-7xl">
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground mt-1">
            Your productivity insights and analytics
          </p>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex">
            <TabsTrigger value="personal" className="text-xs md:text-sm">My Activity</TabsTrigger>
            {isManager && <TabsTrigger value="company" className="text-xs md:text-sm">Company</TabsTrigger>}
            <TabsTrigger value="feed" className="text-xs md:text-sm col-span-2 md:col-span-1">Activity Feed</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
            {/* Stats Cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.pending || 0}</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.approved || 0}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Declined</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats?.declined || 0}</div>
                  <p className="text-xs text-muted-foreground">Need revision</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Requests by Type</CardTitle>
                  <CardDescription>Distribution of your request types</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Request Status</CardTitle>
                  <CardDescription>Current status of all requests</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isManager && (
            <TabsContent value="company" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
              <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{companyStats?.totalRequests || 0}</div>
                    <p className="text-xs text-muted-foreground">Company-wide</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{companyStats?.totalUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">Team members</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{companyStats?.pendingApprovals || 0}</div>
                    <p className="text-xs text-muted-foreground">Require action</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="feed" className="space-y-4 mt-4 md:mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities?.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <Activity className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!activities || activities.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
