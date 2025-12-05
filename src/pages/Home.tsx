import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { NewsFeedModule } from "@/components/home/NewsFeedModule";
import { DepartmentLinksModule } from "@/components/home/DepartmentLinksModule";
import { ModalityLinksModule } from "@/components/home/ModalityLinksModule";
import { FoxoFeedModule } from "@/components/home/FoxoFeedModule";
import { QuickFormsModule } from "@/components/home/QuickFormsModule";
import { CommonLinksModule } from "@/components/home/CommonLinksModule";
import { CalendarModule } from "@/components/home/CalendarModule";
import { RequestActionsModule } from "@/components/home/RequestActionsModule";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = userRole === 'super_admin' || userRole === 'tenant_admin';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Hero Section with Quick Action */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/85 p-5 md:p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              size="default"
              variant="secondary"
              className="shadow-lg hover:shadow-xl transition-all duration-200 bg-white text-primary hover:bg-white/90 font-semibold"
              onClick={() => navigate('/requests/new')}
            >
              <FileText className="mr-2 h-4 w-4" />
              New Request
            </Button>
            {userRole === 'super_admin' && (
              <Button
                size="default"
                variant="outline"
                className="shadow-lg hover:shadow-xl transition-all duration-200 bg-white/90 hover:bg-white font-semibold"
                onClick={() => navigate('/pages/edit')}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Page
              </Button>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-white/10 rounded-full -mr-16 md:-mr-24 -mt-16 md:-mt-24 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-white/5 rounded-full -ml-12 md:-ml-16 -mb-12 md:-mb-16 blur-3xl" />
      </div>

      {/* Main Content Grid - Desktop: 4 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Sidebar - Department Links */}
        <div className="lg:col-span-2">
          <DepartmentLinksModule isAdmin={isAdmin} />
        </div>

        {/* Center Content - Modality Links + News */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Modality Quick Links */}
          <div>
            <ModalityLinksModule isAdmin={isAdmin} />
          </div>

          {/* News Feed */}
          <div>
            <NewsFeedModule title="News" maxItems={5} />
          </div>
        </div>

        {/* Right Sidebar - FOXO Feed */}
        <div className="lg:col-span-3">
          <FoxoFeedModule isAdmin={isAdmin} />
        </div>
      </div>

      {/* Bottom Row - 4 smaller modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickFormsModule isAdmin={isAdmin} />
        <CommonLinksModule isAdmin={isAdmin} />
        <CalendarModule isAdmin={isAdmin} />
        <RequestActionsModule isAdmin={isAdmin} />
      </div>
    </div>
  );
}
