import { 
  ShoppingCart, 
  Clock, 
  Package, 
  Users, 
  Settings, 
  BarChart3,
  Building2,
  FileText,
  UserPlus,
  Network,
  ScrollText,
  HelpCircle,
  Wrench,
  Megaphone,
  BookOpen,
  UserMinus,
  ChevronDown,
  Printer,
  MessageCircle,
  FolderOpen,
  Shield,
  Home,
  Newspaper,
  LifeBuoy,
  Headphones,
  Plus,
  Send,
  Bell,
  Edit,
  Pencil,
  Plug,
  Mail,
  Calendar
} from "lucide-react";
import * as Icons from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";
import GlobalRequestsIcon from "@/assets/global-requests-icon.svg";
import foxoLogo from "@/assets/foxo-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFeatures } from "@/hooks/useCompanyFeatures";
import { usePermissions } from "@/hooks/usePermissions";
import { MenuItemEditor } from "@/components/MenuItemEditor";
import { useToast } from "@/hooks/use-toast";
import { CompanySelector } from "@/components/CompanySelector";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { GlobalSearch } from "@/components/GlobalSearch";

interface AppSidebarProps {
  userRole: "requester" | "manager" | "marketing_manager" | "tenant_admin" | "super_admin" | "marketing" | null;
}

export function AppSidebar({ userRole: propUserRole }: AppSidebarProps) {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  
  // Close sidebar on mobile when menu item is clicked
  const handleMenuItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const location = useLocation();
  const { user } = useAuth();
  const userCompany: any = null;
  const { effectiveRole: impersonatedRole } = useRoleImpersonation();
  
  // Use impersonated role if active, otherwise use the prop role
  const userRole = (impersonatedRole || propUserRole) as "requester" | "manager" | "marketing_manager" | "tenant_admin" | "super_admin" | "marketing" | null;
  const { isFeatureEnabled } = useCompanyFeatures();
  const { hasPermission } = usePermissions();
  const [hasNewsletterAssignment, setHasNewsletterAssignment] = useState(false);
  const [checkingAssignment, setCheckingAssignment] = useState(true);
  const [editingItem, setEditingItem] = useState<{ key: string; label: string; icon?: string } | null>(null);
  const [menuCustomizations, setMenuCustomizations] = useState<Record<string, { label?: string; icon?: string; visible?: boolean }>>({});
  const [menuConfigs, setMenuConfigs] = useState<any[]>([]);
  const [globalHeadings, setGlobalHeadings] = useState<any[]>([]);
  const { toast } = useToast();

  // Load menu customizations with real-time updates
  useEffect(() => {
    const loadMenuCustomizations = async () => {
      if (!userRole) return;

      try {
        const { data, error } = await (supabase as any)
          .from('menu_configurations')
          .select('item_key, custom_label, custom_icon, is_visible, item_type, sort_order, custom_heading_label')
          .eq('role', userRole)
          .order('sort_order');

        if (!error && data) {
          setMenuConfigs(data || []);
          const customizations: Record<string, { label?: string; icon?: string; visible?: boolean }> = {};
          data.forEach((item) => {
            customizations[item.item_key] = {
              label: item.custom_label || undefined,
              icon: item.custom_icon || undefined,
              visible: item.is_visible,
            };
          });
          setMenuCustomizations(customizations);
        }
      } catch (error) {
        console.error('Error loading menu customizations:', error);
      }
    };

    const loadGlobalHeadings = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_headings')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        if (!error && data) {
          setGlobalHeadings(data || []);
        }
      } catch (error) {
        console.error('Error loading global headings:', error);
      }
    };

    loadMenuCustomizations();
    loadGlobalHeadings();

    // Set up real-time subscription for menu configuration changes
    const channel = supabase
      .channel('menu-configs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_configurations',
          filter: `role=eq.${userRole}`,
        },
        () => {
          // Reload customizations when changes occur
          loadMenuCustomizations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_headings',
        },
        () => {
          // Reload headings when changes occur
          loadGlobalHeadings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  // Check if user has newsletter assignment - MUST be before any conditional returns
  useEffect(() => {
    const checkNewsletterAssignment = async () => {
      if (!user?.id) {
        setCheckingAssignment(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('department_assignments')
          .select('department')
          .contains('assignee_ids', [user.id]);

        if (!error && data && data.length > 0) {
          setHasNewsletterAssignment(true);
        }
      } catch (error) {
        console.error('Error checking newsletter assignment:', error);
      } finally {
        setCheckingAssignment(false);
      }
    };

    checkNewsletterAssignment();
  }, [user?.id]);

  // Guard against null/undefined userRole - MUST be after all hooks
  if (!userRole) {
    return null;
  }

  // Super admin doesn't get special menu treatment anymore
  // They should only see platform admin interface
  const effectiveRole = impersonatedRole || userRole;

  const isPathActive = (paths: string[]) => {
    return paths.some(path => location.pathname.startsWith(path));
  };

  // Only allow menu editing based on actual role, not impersonated role
  const canEditMenu = propUserRole === 'super_admin' || propUserRole === 'tenant_admin';

  const getMenuItemKey = (title: string, url: string): string => {
    // Create a consistent key from title and url
    const titleKey = title.toLowerCase().replace(/\s+/g, '-');
    return `${titleKey}-${url.split('/').filter(Boolean).join('-')}`;
  };

  const getCustomLabel = (itemKey: string, defaultLabel: string): string => {
    return menuCustomizations[itemKey]?.label || defaultLabel;
  };

  const getCustomIcon = (itemKey: string, defaultIcon: any): any => {
    const customIconName = menuCustomizations[itemKey]?.icon;
    if (customIconName && (Icons as any)[customIconName]) {
      return (Icons as any)[customIconName];
    }
    return defaultIcon;
  };

  const isMenuItemVisible = (itemKey: string): boolean => {
    // If no config exists for this item, it's visible by default
    if (!(itemKey in menuCustomizations)) return true;
    // Otherwise, check the is_visible flag
    return menuCustomizations[itemKey]?.visible !== false;
  };

  const handleEditMenuItem = (itemKey: string, label: string, icon?: string) => {
    setEditingItem({ key: itemKey, label, icon });
  };

  const handleSaveMenuItem = async (label: string, icon: string) => {
    if (!editingItem || !userRole) return;

    try {
      // Get all existing configs for this item across all roles
      const { data: existingConfigs, error: fetchError } = await (supabase as any)
        .from('menu_configurations')
        .select('id, role')
        .eq('item_key', editingItem.key);

      if (fetchError) throw fetchError;

      const allRoles: Array<'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing'> = 
        ['requester', 'manager', 'marketing_manager', 'tenant_admin', 'super_admin', 'marketing'];

      // Update or insert for all roles
      const updatePromises = allRoles.map(async (role) => {
        const existingConfig = existingConfigs?.find(c => c.role === role);

        if (existingConfig) {
          // Update existing
          return (supabase as any)
            .from('menu_configurations')
            .update({ custom_label: label, custom_icon: icon })
            .eq('id', existingConfig.id);
        } else {
          // Insert new
          return (supabase as any)
            .from('menu_configurations')
            .insert({
              role: role,
              item_key: editingItem.key,
              item_type: 'item',
              custom_label: label,
              custom_icon: icon,
              is_visible: true,
              sort_order: 0,
            });
        }
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} role(s)`);
      }

      toast({
        title: 'Success',
        description: 'Menu item updated for all user roles',
      });

      setEditingItem(null);
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update menu item',
        variant: 'destructive',
      });
    }
  };

  const getMenuCategories = () => {
    const commonItems = [
      { title: "Home", url: "/home", icon: Home },
      { title: "Requests", url: "/requests", icon: ShoppingCart },
      { title: "Reminders", url: "/reminders", icon: Bell },
      { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
    ].filter(item => isMenuItemVisible(getMenuItemKey(item.title, item.url)));

    const helpItem = { title: "Help Guide", url: "/help", icon: HelpCircle, key: "help" };
    const helpTicketItem = { title: "Submit IT Ticket", url: "/help-ticket", icon: LifeBuoy, key: "help-ticket" };
    const canSubmitTicket = hasPermission('create_ticket_request');
    const directoryItem = { title: "Company Directory", url: "/directory", icon: Users, key: "directory" };

    // Helper to check if newsletter should be visible
    const isNewsletterVisible = () => {
      // Always visible for managers and admins
      const isManager = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(effectiveRole);
      if (isManager) return true;
      
      // Visible for users with assignments
      return hasNewsletterAssignment && !checkingAssignment;
    };

    // Helper to filter items by feature availability AND permissions
    const filterByFeatures = (items: any[]) => {
      return items.filter(item => {
        // Map URLs to feature keys and permission keys
        if (item.url?.includes('/requests/tickets/new')) {
          return hasPermission('create_ticket_request');
        }
        if (item.url?.includes('/facility-services')) {
          return hasPermission('create_facility_services_request');
        }
        if (item.url?.includes('/office-services')) {
          return hasPermission('create_office_services_request');
        }
        if (item.url?.includes('/accounts-payable')) {
          return hasPermission('create_accounts_payable_request');
        }
        if (item.url?.includes('/finance/new')) {
          return hasPermission('create_finance_request');
        }
        if (item.url?.includes('/technology-training')) {
          return hasPermission('create_technology_training_request');
        }
        if (item.url?.includes('/it-service-desk')) {
          return hasPermission('create_it_service_desk_request');
        }
        if (item.url?.includes('/hr/new')) {
          return hasPermission('create_hr_request');
        }
        if (item.url?.includes('/requests') && !item.url?.includes('/marketing')) {
          return isFeatureEnabled('hardware_requests') && hasPermission('create_hardware_request');
        }
        if (item.url?.includes('/toner')) {
          return isFeatureEnabled('toner_requests') && hasPermission('create_toner_request');
        }
        if (item.url?.includes('/user-accounts/new')) {
          return isFeatureEnabled('user_accounts') && hasPermission('create_user_account_request');
        }
        if (item.url?.includes('/user-offboarding/new')) {
          return isFeatureEnabled('user_accounts') && hasPermission('create_user_offboarding_request');
        }
        if (item.url?.includes('/marketing')) {
          return isFeatureEnabled('marketing_requests') && hasPermission('create_marketing_request');
        }
        if (item.url?.includes('/newsletter')) {
          return isFeatureEnabled('monthly_newsletter') && isNewsletterVisible();
        }
        if (item.url?.includes('/modality-management')) {
          return isFeatureEnabled('modality_management') && hasPermission('view_modality_details');
        }
        if (item.url?.includes('/documents')) {
          return true; // All authenticated users can access file manager
        }
        if (item.url?.includes('/print-orders')) {
          return isFeatureEnabled('print_ordering');
        }
        // Keep items without feature mapping
        return true;
      });
    };

    // Single news menu item
    const newsMenuItem = { title: "News", url: "/news/view-all", icon: Newspaper };

    switch (effectiveRole) {
      case "requester":
      case "marketing":
        return {
          common: commonItems,
          news: newsMenuItem,
          categories: [
            {
              title: "Marketing",
              icon: Megaphone,
              items: filterByFeatures([
                { title: "Print Ordering Forms", url: "/marketing/print-orders", icon: Printer },
              ]),
              paths: ["/marketing"]
            },
          ].filter(cat => cat.items.length > 0), // Remove empty categories
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          admin: [
            ...(hasPermission('view_fax_campaigns') && isFeatureEnabled('fax_campaigns')
              ? [
                  { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
                  { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar }
                ]
              : []),
          ],
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
      
      case "manager":
      case "marketing_manager":
        return {
          common: commonItems,
          approvals: { title: "Pending Approvals", url: "/approvals", icon: Clock },
          news: newsMenuItem,
          categories: [
            {
              title: "Marketing",
              icon: Megaphone,
              items: filterByFeatures([
                { title: "Print Ordering Forms", url: "/marketing/print-orders", icon: Printer },
              ]),
              paths: ["/marketing"]
            },
          ].filter(cat => cat.items.length > 0),
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          admin: [
            ...(hasPermission('view_fax_campaigns') && isFeatureEnabled('fax_campaigns')
              ? [
                  { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
                  { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar }
                ]
              : []),
          ],
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
      
      case "tenant_admin":
        return {
          common: commonItems,
          approvals: { title: "Pending Approvals", url: "/approvals", icon: Clock },
          news: newsMenuItem,
          categories: [
            {
              title: "Equipment",
              icon: Wrench,
              items: filterByFeatures([]),
              paths: ["/requests", "/toner"]
            },
          ].filter(cat => cat.items.length > 0),
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          admin: [
            ...(hasPermission('view_fax_campaigns') && isFeatureEnabled('fax_campaigns')
              ? [
                  { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
                  { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar }
                ]
              : []),
          ],
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          settings: { title: "Settings", url: "/settings", icon: Settings },
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
      
      case "super_admin":
        return {
          common: commonItems,
          approvals: { title: "Pending Approvals", url: "/approvals", icon: Clock },
          news: newsMenuItem,
          categories: [
            {
              title: "Equipment",
              icon: Wrench,
              items: filterByFeatures([]),
              paths: ["/approvals", "/requests", "/toner"]
            },
          ].filter(cat => cat.items.length > 0),
          modalityDetails: isFeatureEnabled('modality_management') && hasPermission('view_modality_details')
            ? { title: "Modality Details", url: "/modality-management", icon: Network }
            : null,
          admin: [
            { title: "Audit Log", url: "/audit-log", icon: ScrollText },
            { title: "Integrations", url: "/integrations", icon: Plug },
            { title: "Marketing Campaigns", url: "/marketing-campaigns", icon: Mail },
            { title: "Marketing Calendar", url: "/marketing-calendar", icon: Calendar },
          ],
          newsletter: isFeatureEnabled('monthly_newsletter') && isNewsletterVisible() 
            ? { title: "Monthly Newsletter", url: "/newsletter", icon: Newspaper } 
            : null,
          directory: isMenuItemVisible(directoryItem.key) ? directoryItem : null,
          settings: { title: "Settings", url: "/settings", icon: Settings },
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
      
        default:
        return {
          common: commonItems,
          categories: [],
          help: isMenuItemVisible(helpItem.key) ? helpItem : null,
          helpTicket: canSubmitTicket && isMenuItemVisible(helpTicketItem.key) ? helpTicketItem : null
        };
    }
  };

  const menuConfig = getMenuCategories();

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      {/* Company Selector at the top */}
      <div className={`border-b border-sidebar-border ${collapsed ? 'px-2 py-3' : 'p-4'}`}>
        <CompanySelector />
      </div>
      
      <SidebarContent className="flex flex-col h-full overflow-x-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Global Search at the top */}
          <div className={`${collapsed ? 'px-2 py-3' : 'px-3 py-3'} space-y-3`}>
            <GlobalSearch />
            
            {/* Prominent New Request Button */}
            <Button 
              onClick={() => {
                window.location.href = '/requests/new';
                handleMenuItemClick();
              }}
              className="w-full h-10 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground font-medium rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {!collapsed && <span>New Request</span>}
            </Button>
          </div>
          
          <SidebarGroup>
            <SidebarGroupContent>
            <SidebarMenu>

              {/* Common Items */}
              {menuConfig.common.map((item) => {
                const itemKey = getMenuItemKey(item.title, item.url);
                const CustomIcon = getCustomIcon(itemKey, item.icon);
                const customLabel = getCustomLabel(itemKey, item.title);
                
                const menuItem = (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          }`
                        }
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu key={item.title}>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })}

              {/* Render global headings from menu_headings table */}
              {globalHeadings.map((heading) => (
                <SidebarGroupLabel key={heading.id} className="px-4 py-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {!collapsed && heading.label}
                </SidebarGroupLabel>
              ))}

              {/* Categorized Items - flatten single-item categories */}
              {menuConfig.categories.map((category) => {
                // If category has only one item, render it as a standalone menu item
                if (category.items.length === 1) {
                  const item = category.items[0];
                  const itemKey = getMenuItemKey(item.title, item.url);
                  const CustomIcon = getCustomIcon(itemKey, item.icon);
                  const customLabel = getCustomLabel(itemKey, item.title);
                  
                  const menuItem = (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          onClick={handleMenuItemClick}
                          className={({ isActive }) => 
                            `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                              isActive 
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                            }`
                          }
                        >
                          <CustomIcon className="w-5 h-5 flex-shrink-0" />
                          {!collapsed && <span className="text-sm">{customLabel}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );

                  return canEditMenu ? (
                    <ContextMenu key={item.title}>
                      <ContextMenuTrigger>
                        {menuItem}
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Menu Item
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ) : menuItem;
                }

                // Otherwise, render as collapsible category
                return (
                  <Collapsible
                    key={category.title}
                    defaultOpen={false}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="mx-2">
                          <category.icon className="w-5 h-5" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left text-sm">{category.title}</span>
                              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenu className="ml-4 border-l pl-2 mt-1">
                          {category.items.map((item) => {
                            const itemKey = getMenuItemKey(item.title, item.url);
                            const CustomIcon = getCustomIcon(itemKey, item.icon);
                            const customLabel = getCustomLabel(itemKey, item.title);
                            
                            const menuItem = (
                              <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                  <NavLink 
                                    to={item.url}
                                    onClick={handleMenuItemClick}
                                    className={({ isActive }) => 
                                      `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                                        isActive 
                                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                                      }`
                                    }
                                  >
                                    <CustomIcon className="w-4 h-4 flex-shrink-0" />
                                    {!collapsed && <span className="text-sm">{customLabel}</span>}
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );

                            return canEditMenu ? (
                              <ContextMenu key={item.title}>
                                <ContextMenuTrigger>
                                  {menuItem}
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Menu Item
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            ) : menuItem;
                          })}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}

              {/* Pending Approvals */}
              {menuConfig.approvals && (() => {
                const itemKey = getMenuItemKey(menuConfig.approvals.title, menuConfig.approvals.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.approvals.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.approvals.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.approvals.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          }`
                        }
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* News */}
              {menuConfig.news && (() => {
                const itemKey = getMenuItemKey(menuConfig.news.title, menuConfig.news.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.news.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.news.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.news.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          }`
                        }
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Admin Items (super_admin only) */}
              {menuConfig.admin && menuConfig.admin.map((item) => {
                const itemKey = getMenuItemKey(item.title, item.url);
                const CustomIcon = getCustomIcon(itemKey, item.icon);
                const customLabel = getCustomLabel(itemKey, item.title);
                
                const menuItem = (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          }`
                        }
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu key={item.title}>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })}

              {/* Settings (tenant_admin & super_admin) */}
              {menuConfig.settings && (() => {
                const itemKey = getMenuItemKey(menuConfig.settings.title, menuConfig.settings.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.settings.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.settings.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.settings.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          }`
                        }
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Monthly Newsletter */}
              {menuConfig.newsletter && (() => {
                const itemKey = getMenuItemKey(menuConfig.newsletter.title, menuConfig.newsletter.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.newsletter.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.newsletter.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.newsletter.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          }`
                        }
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Modality Details */}
              {menuConfig.modalityDetails && (() => {
                const itemKey = getMenuItemKey(menuConfig.modalityDetails.title, menuConfig.modalityDetails.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.modalityDetails.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.modalityDetails.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.modalityDetails.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          }`
                        }
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

              {/* Help */}
              {menuConfig.help && (() => {
                const itemKey = getMenuItemKey(menuConfig.help.title, menuConfig.help.url);
                const CustomIcon = getCustomIcon(itemKey, menuConfig.help.icon);
                const customLabel = getCustomLabel(itemKey, menuConfig.help.title);
                
                const menuItem = (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={menuConfig.help.url}
                        onClick={handleMenuItemClick}
                        className={({ isActive }) => 
                          `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                          }`
                        }
                      >
                        <CustomIcon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{customLabel}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );

                return canEditMenu ? (
                  <ContextMenu>
                    <ContextMenuTrigger>
                      {menuItem}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditMenuItem(itemKey, customLabel, menuCustomizations[itemKey]?.icon)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Menu Item
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : menuItem;
              })()}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        </div>
        
        {/* Footer buttons - Always visible at bottom */}
        <div className="sticky bottom-0 p-3 border-t border-sidebar-border bg-sidebar-background space-y-2 overflow-hidden">
          {/* Foxo Link */}
          <Button
            asChild
            variant="outline"
            className={`w-full border-sidebar-border hover:bg-sidebar-accent ${collapsed ? 'px-2' : 'py-3'}`}
            size={collapsed ? "icon" : "lg"}
          >
            <a 
              href="https://crowdit.com.au/files/foxo/index.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full"
            >
              <img src={foxoLogo} alt="Foxo" className={collapsed ? "h-6 w-6" : "h-8 w-auto object-contain"} />
            </a>
          </Button>
          
          {/* Contact IT Support */}
          <Button
            asChild
            className={`w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground shadow-sm ${collapsed ? 'px-2' : ''}`}
            size={collapsed ? "icon" : "default"}
          >
              <Link to="/contact-support" className="flex items-center justify-center gap-2 w-full overflow-hidden whitespace-nowrap">
                <MessageCircle className={collapsed ? "h-5 w-5" : "h-4 w-4"} />
                {!collapsed && <span className="text-sm truncate">Contact IT Support</span>}
              </Link>
          </Button>
        </div>
      </SidebarContent>

      {/* Menu Item Editor Dialog */}
      {editingItem && (
        <MenuItemEditor
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          itemKey={editingItem.key}
          currentLabel={editingItem.label}
          currentIcon={editingItem.icon}
          onSave={handleSaveMenuItem}
        />
      )}
    </Sidebar>
  );
}