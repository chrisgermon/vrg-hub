import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ModalityCardsRow } from "@/components/home/ModalityCardsRow";
import { QuickActionsCard } from "@/components/home/QuickActionsCard";
import { RecentActivityCard } from "@/components/home/RecentActivityCard";
import { NewsUpdatesCard } from "@/components/home/NewsUpdatesCard";
import { QuickLinksCard } from "@/components/home/QuickLinksCard";
import { UpcomingEventsCard } from "@/components/home/UpcomingEventsCard";
import { DepartmentLinksFooter } from "@/components/home/DepartmentLinksFooter";
import { format } from "date-fns";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-hero p-6 md:p-8 text-white shadow-elevated">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {userName}
            </h1>
            <p className="text-white/80 mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                placeholder="Search..."
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/10 relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center">
                  3
                </span>
              </Button>
              <Button
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
                onClick={() => navigate('/requests/new')}
              >
                <FileText className="mr-2 h-4 w-4" />
                New Request
              </Button>
              {userRole === 'super_admin' && (
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => navigate('/pages/edit')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Page
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl" />
      </div>

      {/* Row 1 - Modality Cards */}
      <section>
        <ModalityCardsRow />
      </section>

      {/* Row 2 - Quick Actions + Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <QuickActionsCard />
        </div>
        <div className="lg:col-span-2">
          <RecentActivityCard />
        </div>
      </section>

      {/* Row 3 - News, Quick Links, Events */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NewsUpdatesCard />
        <QuickLinksCard />
        <UpcomingEventsCard />
      </section>

      {/* Row 4 - Department Links Footer */}
      <section>
        <DepartmentLinksFooter />
      </section>
    </div>
  );
}
