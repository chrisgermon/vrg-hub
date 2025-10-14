import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Monitor, Printer, UserPlus, Mail, UserMinus, Search, Clock, Wrench, Building2, DollarSign, TrendingUp, GraduationCap, HelpCircle, Users, Megaphone } from 'lucide-react';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { usePermissions } from '@/hooks/usePermissions';

const RECENT_REQUEST_KEY = 'recentRequestType';

export default function NewRequest() {
  const navigate = useNavigate();
  const { isFeatureEnabled } = useCompanyFeatures();
  const { hasPermission } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentRequestPath, setRecentRequestPath] = useState<string | null>(null);

  useEffect(() => {
    const recent = localStorage.getItem(RECENT_REQUEST_KEY);
    if (recent) {
      setRecentRequestPath(recent);
    }
  }, []);

  const handleRequestClick = (path: string) => {
    localStorage.setItem(RECENT_REQUEST_KEY, path);
    navigate(path);
  };

  const requestTypes = [
    {
      title: 'Hardware Request',
      description: 'Request new hardware, equipment, or IT assets',
      icon: Monitor,
      path: '/requests/hardware/new',
      featureKey: 'hardware_requests',
      permissionKey: 'create_hardware_request',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      hoverColor: 'hover:bg-blue-100 dark:hover:bg-blue-900/40'
    },
    {
      title: 'Toner Request',
      description: 'Order printer toner and supplies',
      icon: Printer,
      path: '/toner/new',
      featureKey: 'toner_requests',
      permissionKey: 'create_toner_request',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      hoverColor: 'hover:bg-purple-100 dark:hover:bg-purple-900/40'
    },
    {
      title: 'New User Account',
      description: 'Request a new user account setup',
      icon: UserPlus,
      path: '/user-accounts/new',
      featureKey: 'user_accounts',
      permissionKey: 'create_user_account_request',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      hoverColor: 'hover:bg-green-100 dark:hover:bg-green-900/40'
    },
    {
      title: 'User Offboarding',
      description: 'Request user account deactivation',
      icon: UserMinus,
      path: '/user-offboarding/new',
      featureKey: 'user_accounts',
      permissionKey: 'create_user_offboarding_request',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      hoverColor: 'hover:bg-orange-100 dark:hover:bg-orange-900/40'
    },
    {
      title: 'Marketing Request',
      description: 'Request marketing materials or campaigns',
      icon: Mail,
      path: '/marketing/new',
      featureKey: 'marketing_requests',
      permissionKey: 'create_marketing_request',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950/30',
      hoverColor: 'hover:bg-pink-100 dark:hover:bg-pink-900/40'
    },
    {
      title: 'Facility Services',
      description: 'Maintenance, cleaning, and facility requests',
      icon: Wrench,
      path: '/facility-services/new',
      featureKey: 'department_requests',
      permissionKey: 'create_department_request',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      hoverColor: 'hover:bg-amber-100 dark:hover:bg-amber-900/40'
    },
    {
      title: 'Office Services',
      description: 'Print, post, couriers, and stationary',
      icon: Building2,
      path: '/office-services/new',
      featureKey: 'department_requests',
      permissionKey: 'create_department_request',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
      hoverColor: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/40'
    },
    {
      title: 'Accounts Payable',
      description: 'EFT payments and reimbursements',
      icon: DollarSign,
      path: '/accounts-payable/new',
      featureKey: 'department_requests',
      permissionKey: 'create_department_request',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      hoverColor: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
    },
    {
      title: 'Finance',
      description: 'Statements and payroll issues',
      icon: TrendingUp,
      path: '/finance/new',
      featureKey: 'department_requests',
      permissionKey: 'create_department_request',
      color: 'text-lime-600',
      bgColor: 'bg-lime-50 dark:bg-lime-950/30',
      hoverColor: 'hover:bg-lime-100 dark:hover:bg-lime-900/40'
    },
    {
      title: 'Technology Training',
      description: 'System and application training',
      icon: GraduationCap,
      path: '/technology-training/new',
      featureKey: 'department_requests',
      permissionKey: 'create_department_request',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      hoverColor: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
    },
    {
      title: 'IT Service Desk',
      description: 'Computer and IT support',
      icon: HelpCircle,
      path: '/it-service-desk/new',
      featureKey: 'department_requests',
      permissionKey: 'create_department_request',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      hoverColor: 'hover:bg-blue-100 dark:hover:bg-blue-900/40'
    },
    {
      title: 'HR',
      description: 'HR support and compliance',
      icon: Users,
      path: '/hr/new',
      featureKey: 'department_requests',
      permissionKey: 'create_department_request',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 dark:bg-rose-950/30',
      hoverColor: 'hover:bg-rose-100 dark:hover:bg-rose-900/40'
    },
    {
      title: 'Marketing Service',
      description: 'MLO and referrer requests',
      icon: Megaphone,
      path: '/marketing-service/new',
      featureKey: 'department_requests',
      permissionKey: 'create_department_request',
      color: 'text-fuchsia-600',
      bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
      hoverColor: 'hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40'
    }
  ];

  const availableRequests = requestTypes.filter(request => 
    isFeatureEnabled(request.featureKey as any) && 
    hasPermission(request.permissionKey as any)
  );

  const filteredRequests = availableRequests.filter(request =>
    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: most recent first, then alphabetically
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (a.path === recentRequestPath) return -1;
    if (b.path === recentRequestPath) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Request</h1>
        <p className="text-muted-foreground mt-2">
          Choose the type of request you'd like to create
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search request types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedRequests.map((request) => {
          const Icon = request.icon;
          const isRecent = request.path === recentRequestPath;
          return (
            <Card
              key={request.path}
              className={`cursor-pointer transition-all ${request.hoverColor} border hover:shadow-md ${
                isRecent ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleRequestClick(request.path)}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-10 h-10 rounded-lg ${request.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${request.color}`} />
                  </div>
                  {isRecent && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Recent
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{request.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {request.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {filteredRequests.length === 0 && availableRequests.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No request types match your search. Try a different search term.
            </p>
          </CardContent>
        </Card>
      )}

      {availableRequests.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No request types are currently available. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
