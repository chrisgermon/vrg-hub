import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { Building2, ShoppingCart, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  activeTenants: number;
  globalOrders: number;
  avgProcessingDays: number;
}

export function SuperAdminStats() {
  const [stats, setStats] = useState<Stats>({
    activeTenants: 0,
    globalOrders: 0,
    avgProcessingDays: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Fetch active tenants
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id', { count: 'exact' })
        .eq('active', true);

      if (companiesError) throw companiesError;

      // Fetch global orders (all hardware requests)
      const { data: orders, error: ordersError } = await supabase
        .from('hardware_requests')
        .select('id, created_at, approved, admin_approved_at', { count: 'exact' })
        .not('status', 'eq', 'draft');

      if (ordersError) throw ordersError;

      // Calculate average processing time for approved requests
      let avgDays = 0;
      if (orders && orders.length > 0) {
        const approvedOrders = orders.filter(
          (order: any) => order.admin_approved_at && order.created_at
        );
        
        if (approvedOrders.length > 0) {
          const totalMs = approvedOrders.reduce((sum: number, order: any) => {
            const created = new Date(order.created_at).getTime();
            const approved = new Date(order.admin_approved_at).getTime();
            return sum + (approved - created);
          }, 0);
          
          avgDays = totalMs / approvedOrders.length / (1000 * 60 * 60 * 24);
        }
      }

      setStats({
        activeTenants: companies?.length || 0,
        globalOrders: orders?.length || 0,
        avgProcessingDays: Math.round(avgDays * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscriptions
    const companiesChannel = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies'
        },
        () => fetchStats()
      )
      .subscribe();

    const requestsChannel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hardware_requests'
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(companiesChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DashboardCard 
        title="Active Tenants" 
        value={stats.activeTenants} 
        icon={Building2}
      />
      <DashboardCard 
        title="Global Orders" 
        value={stats.globalOrders} 
        icon={ShoppingCart}
      />
      <DashboardCard 
        title="Avg Processing Time" 
        value={stats.avgProcessingDays > 0 ? `${stats.avgProcessingDays}d` : 'N/A'} 
        icon={TrendingUp}
        description="Days to approval"
      />
    </div>
  );
}
