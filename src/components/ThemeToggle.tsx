import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { profile } = useAuth();

  useEffect(() => {
    // Initialize theme from localStorage or profile
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || profile?.theme_preference || 'light';
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }
  }, [profile?.theme_preference]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    // Update UI immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Update user preference in database
    if (profile?.user_id) {
      await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('user_id', profile.user_id);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
