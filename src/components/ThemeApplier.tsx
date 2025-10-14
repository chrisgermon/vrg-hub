import { useEffect, useRef } from "react";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { getCompanyBySubdomain } from "@/lib/subdomain";

export const ThemeApplier = () => {
  const { currentSubdomain, selectedCompany } = useCompanyContext();
  const { company: authCompany } = useAuth();
  const lastAppliedTheme = useRef<string | null>(null);

  useEffect(() => {
    const applyTheme = async () => {
      // Use subdomain's company theme if available, otherwise use selected company
      let themeCompany: any = selectedCompany;
      
      // If selectedCompany matches user's company, use authCompany (which has latest data after refreshProfile)
      if (authCompany && selectedCompany?.id === authCompany.id) {
        themeCompany = authCompany;
      }
      
      if (currentSubdomain && !themeCompany) {
        themeCompany = await getCompanyBySubdomain(currentSubdomain);
      }
      
      if (!themeCompany) return;

      // Create a theme signature to detect when colors actually change
      const themeSignature = JSON.stringify({
        id: themeCompany.id,
        useCustomColors: themeCompany.use_custom_colors,
        colors: {
          primary: themeCompany.primary_color,
          background: themeCompany.background_color,
          foreground: themeCompany.foreground_color,
          card: themeCompany.card_color,
          cardForeground: themeCompany.card_foreground_color,
          muted: themeCompany.muted_color,
          mutedForeground: themeCompany.muted_foreground_color,
          border: themeCompany.border_color,
          accent: themeCompany.accent_color,
        }
      });

      // Only re-apply if theme actually changed
      if (lastAppliedTheme.current === themeSignature) return;
      
      lastAppliedTheme.current = themeSignature;

      const root = document.documentElement;

      // Store theme in localStorage for persistence
      if (themeCompany.use_custom_colors === true) {
        localStorage.setItem('company_theme', JSON.stringify({
          companyId: themeCompany.id,
          colors: {
            primary: themeCompany.primary_color,
            background: themeCompany.background_color,
            foreground: themeCompany.foreground_color,
            card: themeCompany.card_color,
            "card-foreground": themeCompany.card_foreground_color,
            muted: themeCompany.muted_color,
            "muted-foreground": themeCompany.muted_foreground_color,
            border: themeCompany.border_color,
            accent: themeCompany.accent_color,
          }
        }));
      } else {
        localStorage.removeItem('company_theme');
      }

      // Always reset to defaults first
      const keys = [
        "primary", "background", "foreground", "card", "card-foreground",
        "muted", "muted-foreground", "border", "accent"
      ];
      
      keys.forEach(key => {
        root.style.removeProperty(`--${key}`);
      });

      // Only apply custom colors if explicitly enabled
      if (themeCompany.use_custom_colors === true) {
        const colorMap = {
          primary: themeCompany.primary_color,
          background: themeCompany.background_color,
          foreground: themeCompany.foreground_color,
          card: themeCompany.card_color,
          "card-foreground": themeCompany.card_foreground_color,
          muted: themeCompany.muted_color,
          "muted-foreground": themeCompany.muted_foreground_color,
          border: themeCompany.border_color,
          accent: themeCompany.accent_color,
        };

        Object.entries(colorMap).forEach(([key, value]) => {
          if (value) {
            root.style.setProperty(`--${key}`, value);
          }
        });
      }
    };
    
    applyTheme();
  }, [currentSubdomain, selectedCompany, authCompany]);

  // Apply theme from localStorage immediately on mount (before company data loads)
  useEffect(() => {
    const storedTheme = localStorage.getItem('company_theme');
    if (storedTheme) {
      try {
        const { colors } = JSON.parse(storedTheme);
        const root = document.documentElement;
        
        Object.entries(colors).forEach(([key, value]) => {
          if (value) {
            root.style.setProperty(`--${key}`, value as string);
          }
        });
      } catch (error) {
        console.error('Error applying stored theme:', error);
      }
    }
  }, []);

  return null;
};
