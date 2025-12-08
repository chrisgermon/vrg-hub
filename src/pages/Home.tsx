import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FileText, HeadphonesIcon, Building2, Users, Megaphone, Briefcase, DollarSign, Scan, Activity, Heart, Brain, Microscope, Bone, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { QuickActionsCard } from "@/components/home/QuickActionsCard";
import { NewsUpdatesCard } from "@/components/home/NewsUpdatesCard";
import { QuickLinksCard } from "@/components/home/QuickLinksCard";
import { UpcomingEventsCard } from "@/components/home/UpcomingEventsCard";
import { format } from "date-fns";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const modalities = [
  { name: "X-Ray", icon: Scan, href: "#" },
  { name: "CT", icon: Activity, href: "#" },
  { name: "Ultrasound", icon: Heart, href: "#" },
  { name: "MRI", icon: Brain, href: "#" },
  { name: "Mammography", icon: Microscope, href: "#" },
  { name: "EOS", icon: Bone, href: "#" },
];

const departments = [
  { name: "Reception", icon: Building2, href: "#" },
  { name: "Medical", icon: Users, href: "#" },
  { name: "Marketing", icon: Megaphone, href: "#" },
  { name: "HR", icon: Briefcase, href: "#" },
  { name: "Finance", icon: DollarSign, href: "#" },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(80px,auto)]">
        
        {/* Hero Welcome - spans 8 cols, 2 rows */}
        <div className="col-span-12 lg:col-span-8 row-span-2 relative rounded-2xl overflow-hidden bg-gradient-hero p-6 md:p-8 text-white shadow-elevated">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
              <h1 className="text-2xl md:text-4xl font-bold mt-1">
                {getGreeting()}, {userName}
              </h1>
              <p className="text-white/80 mt-2 max-w-md">
                Welcome to VRG Hub. Access your tools and resources below.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
                onClick={() => navigate('/requests/new')}
              >
                <FileText className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Quick Actions - spans 4 cols, 2 rows */}
        <div className="col-span-12 lg:col-span-4 row-span-2">
          <QuickActionsCard />
        </div>

        {/* Modalities Row - spans 9 cols */}
        <div className="col-span-12 lg:col-span-9 grid grid-cols-3 sm:grid-cols-6 gap-3">
          {modalities.map((modality) => (
            <a
              key={modality.name}
              href={modality.href}
              className="group flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border/50 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-200"
            >
              <div className="p-2.5 rounded-full bg-primary/10 text-primary mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                <modality.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-foreground text-center">
                {modality.name}
              </span>
            </a>
          ))}
        </div>

        {/* Departments - spans 3 cols, next to modalities */}
        <div className="col-span-12 lg:col-span-3 bg-card rounded-xl border border-border/50 shadow-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Departments
          </h3>
          <div className="space-y-2">
            {departments.map((dept) => (
              <a
                key={dept.name}
                href={dept.href}
                className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-secondary/50 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <dept.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">{dept.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>

        {/* News & Updates - spans 5 cols, 3 rows */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 row-span-3">
          <NewsUpdatesCard />
        </div>

        {/* Upcoming Events - spans 4 cols, 3 rows */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-3">
          <UpcomingEventsCard />
        </div>

        {/* Quick Links - spans 6 cols */}
        <div className="col-span-12 lg:col-span-6">
          <QuickLinksCard />
        </div>

        {/* System Status Footer - spans 6 cols */}
        <div className="col-span-12 lg:col-span-6 flex items-center justify-between bg-card rounded-xl border border-border/50 shadow-card px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-status-approved animate-pulse" />
            All Systems Operational
          </div>
          <Link 
            to="/support" 
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <HeadphonesIcon className="h-4 w-4" />
            IT Support
          </Link>
        </div>
      </div>
    </div>
  );
}
