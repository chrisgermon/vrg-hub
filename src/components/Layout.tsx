import React, { ReactNode, Suspense, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, User, ChevronDown } from "lucide-react";
import crowdITLogo from "@/assets/crowdit-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { NewsletterBanner } from "./newsletter/NewsletterBanner";
import { SystemStatusIndicator } from "./SystemStatusIndicator";
import { CompanySelector } from "./CompanySelector";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

import { CriticalSystemsBar } from "./CriticalSystemsBar";
import { Footer } from "./Footer";
import { FrontChatWidget } from "./FrontChatWidget";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { RoleImpersonationSelector } from "./RoleImpersonationSelector";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { RouteLoading } from "./RouteLoading";
import { GlobalSearch } from "./GlobalSearch";
import { SystemBanners } from "./banners/SystemBanners";
import { ProfileDialog } from "./ProfileDialog";
import { FirstTimeSetupDialog } from "./FirstTimeSetupDialog";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { userRole, user, signOut } = useAuth();
  const { effectiveRole, isImpersonating } = useRoleImpersonation();
  const [logoUrl, setLogoUrl] = useState<string>(crowdITLogo);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const loadCompanyLogo = async () => {
      if (!user?.id) return;

      // First, try to get the user's brand logo
      const { data: profile } = await supabase
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.brand_id) {
        const { data: brand } = await supabase
          .from('brands')
          .select('logo_url')
          .eq('id', profile.brand_id)
          .maybeSingle();

        if (brand?.logo_url) {
          setLogoUrl(brand.logo_url);
          return;
        }
      }

      // Fallback to app_config logo if no brand logo
      const { data: config } = await supabase
        .from('app_config')
        .select('logo_url')
        .limit(1)
        .maybeSingle();
      
      if (config?.logo_url) {
        setLogoUrl(config.logo_url);
      }
    };
    
    loadCompanyLogo();
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* <FrontChatWidget /> */}
      <FirstTimeSetupDialog />
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar userRole={userRole as any} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-auto min-h-16 border-b bg-card shadow-sm flex flex-col md:flex-row items-start md:items-center px-3 md:px-6 py-3 md:py-0 gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
              <SidebarTrigger />
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className="h-10 md:h-12 object-contain" 
              />
              
              <NavigationMenu className="hidden lg:flex">
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link to="/mission-statement" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                        Mission Statement
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link to="/company-directory" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                        Phone Directory
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link to="/external-providers" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                        External Providers
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Rosters</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[200px] gap-3 p-4">
                        <li>
                          <NavigationMenuLink asChild>
                            <Link to="/rosters/current" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">Current Rosters</div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <Link to="/rosters/upcoming" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">Upcoming Rosters</div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <a href="https://outlook.office.com" target="_blank" rel="noopener noreferrer" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                        Outlook Web
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <a href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer" className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50">
                        Microsoft Teams
                      </a>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              
              <NotificationsDropdown />
            </div>
            
            <div className="ml-auto flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
              {/* Don't show company selector or role impersonation for super admin */}
              {userRole !== 'super_admin' && (
                <>
                  <div className="hidden lg:flex items-center gap-2 md:gap-3">
                    <CriticalSystemsBar />
                    <SystemStatusIndicator />
                  </div>
                </>
              )}
              <div className="hidden sm:block text-right">
                <p className="text-xs md:text-sm font-medium truncate max-w-[150px] md:max-w-none">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                {(effectiveRole || userRole) && !['requester', 'marketing'].includes(effectiveRole || userRole || '') && (
                  <p className="text-[10px] md:text-xs text-muted-foreground capitalize">
                    {isImpersonating && <span className="text-yellow-600 dark:text-yellow-400">Viewing as: </span>}
                    {(effectiveRole || userRole || '').replace('_', ' ')}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setProfileOpen(true)}
                className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0"
              >
                <User className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex-shrink-0">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          
          <main className="flex-1 p-3 md:p-6 pb-32 md:pb-40">
            <NewsletterBanner />
            <SystemBanners />
            <Suspense fallback={<RouteLoading />}>
              {children}
            </Suspense>
          </main>
          <Footer />
          </div>
        </div>
        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </SidebarProvider>
    </>
  );
}