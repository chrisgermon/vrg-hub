import { useEffect, useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  show_on_pages: string[];
}

export function SystemBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedBanners');
    return stored ? JSON.parse(stored) : [];
  });
  const { company } = useAuth();

  useEffect(() => {
    if (!company?.id) return;

    const fetchBanners = async () => {
      const { data } = await supabase
        .from('system_banners')
        .select('id, title, message, type, show_on_pages')
        .eq('company_id', company.id)
        .eq('is_active', true);

      if (data) {
        const activeBanners = data.filter(b => !dismissedBanners.includes(b.id)) as Banner[];
        setBanners(activeBanners);
      }
    };

    fetchBanners();

    const channel = supabase
      .channel('system_banners')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_banners',
          filter: `company_id=eq.${company.id}`
        },
        () => fetchBanners()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, dismissedBanners]);

  const dismissBanner = (bannerId: string) => {
    const updated = [...dismissedBanners, bannerId];
    setDismissedBanners(updated);
    localStorage.setItem('dismissedBanners', JSON.stringify(updated));
    setBanners(banners.filter(b => b.id !== bannerId));
  };

  const getIcon = (type: Banner['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getVariant = (type: Banner['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {banners.map((banner) => (
        <Alert
          key={banner.id}
          variant={getVariant(banner.type)}
          className="relative"
        >
          <div className="flex items-start gap-3">
            {getIcon(banner.type)}
            <div className="flex-1">
              <AlertTitle>{banner.title}</AlertTitle>
              <AlertDescription className="mt-1">
                {banner.message}
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => dismissBanner(banner.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
