import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface HeroSlide {
  id: string;
  type: 'announcement' | 'task' | 'news';
  title: string;
  description: string;
  action?: {
    label: string;
    url: string;
  };
  priority?: 'high' | 'medium' | 'low';
}

interface DynamicHeroProps {
  config?: {
    title?: string;
    showTasks?: boolean;
    showAnnouncements?: boolean;
    autoAdvanceInterval?: number;
  };
}

export function DynamicHero({ config = {} }: DynamicHeroProps) {
  const { user, company, userRole } = useAuth();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const {
    title = "",
    showTasks = true,
    showAnnouncements = true,
    autoAdvanceInterval = 6000,
  } = config;

  // Fetch pending tasks/approvals
  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['hero-pending-tasks', user?.id, company?.id],
    queryFn: async () => {
      if (!user?.id || !showTasks) return [];
      
      const tasks: HeroSlide[] = [];
      
      // Check for pending approvals (managers/admins)
      if (userRole !== 'requester') {
        const { data: approvals } = await supabase
          .from('hardware_requests')
          .select('id, title')
          .eq('company_id', company?.id)
          .in('status', ['pending_manager_approval', 'pending_admin_approval', 'submitted'])
          .limit(1);
        
        if (approvals && approvals.length > 0) {
          tasks.push({
            id: `approval-${approvals[0].id}`,
            type: 'task',
            title: 'Pending Approvals',
            description: `You have ${approvals.length}+ request(s) awaiting approval`,
            action: { label: 'Review Now', url: '/approvals' },
            priority: 'high'
          });
        }
      }
      
      // Check for in-progress requests (all users)
      const { data: inProgress } = await supabase
        .from('hardware_requests')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .in('status', ['approved', 'ordered'])
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (inProgress && inProgress.length > 0) {
        tasks.push({
          id: `progress-${inProgress[0].id}`,
          type: 'task',
          title: 'Order in Progress',
          description: `${inProgress[0].title} • Updated ${formatDistanceToNow(new Date(inProgress[0].updated_at), { addSuffix: true })}`,
          action: { label: 'View Status', url: '/requests' },
          priority: 'medium'
        });
      }
      
      return tasks;
    },
    enabled: !!user?.id && !!company?.id && showTasks,
  });

  // Fetch latest announcements/news
  const { data: announcements = [] } = useQuery({
    queryKey: ['hero-announcements', company?.id],
    queryFn: async () => {
      if (!company?.id || !showAnnouncements) return [];
      
      const { data } = await supabase
        .from('news_articles')
        .select('id, title, content, published_at')
        .eq('company_id', company.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3);
      
      return (data || []).map(article => ({
        id: `news-${article.id}`,
        type: 'news' as const,
        title: article.title,
        description: article.content?.substring(0, 120) + '...' || '',
        action: { label: 'Read More', url: `/news/article/${article.id}` },
        priority: 'low' as const
      }));
    },
    enabled: !!company?.id && showAnnouncements,
  });

  // Combine all slides
  const slides = [...pendingTasks, ...announcements];

  // Auto-advance slides
  useEffect(() => {
    if (slides.length <= 1 || autoAdvanceInterval <= 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, autoAdvanceInterval);
    
    return () => clearInterval(timer);
  }, [slides.length, autoAdvanceInterval]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  if (slides.length === 0) {
    const displayTitle = title || `Welcome back, ${user?.email?.split('@')[0] || 'User'}`;
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-elegant mb-6">
        <div className="p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-in">
            {displayTitle}
          </h1>
          <p className="text-muted-foreground text-lg">
            Everything is up to date. Have a productive day!
          </p>
        </div>
      </Card>
    );
  }

  const currentContent = slides[currentSlide];
  
  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-5 h-5 text-status-declined" />;
      case 'medium': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <CheckCircle className="w-5 h-5 text-status-approved" />;
    }
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-elegant mb-6 group">
      {/* Background animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-pulse" />
      
      <div className="relative p-8 md:p-12">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              {getPriorityIcon(currentContent.priority)}
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {currentContent.type === 'task' ? 'Action Required' : 'Latest Update'}
              </span>
            </div>
            
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {currentContent.title}
              </h2>
              <p className="text-muted-foreground text-base md:text-lg">
                {currentContent.description}
              </p>
            </div>
            
            {currentContent.action && (
              <Button
                onClick={() => navigate(currentContent.action!.url)}
                variant="hero"
                size="lg"
                className="mt-4 hover-scale"
              >
                {currentContent.action.label}
              </Button>
            )}
          </div>
          
          {/* Navigation controls */}
          {slides.length > 1 && (
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevSlide}
                className="rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextSlide}
                className="rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Slide indicators */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 bg-primary'
                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
