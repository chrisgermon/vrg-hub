import { useEffect } from 'react';

const THEME_KEYS = [
  'primary',
  'background',
  'foreground',
  'card',
  'card-foreground',
  'muted',
  'muted-foreground',
  'border',
  'accent',
];

interface CompanyTheme {
  id?: string;
  use_custom_colors?: boolean;
  primary_color?: string | null;
  background_color?: string | null;
  foreground_color?: string | null;
  card_color?: string | null;
  card_foreground_color?: string | null;
  muted_color?: string | null;
  muted_foreground_color?: string | null;
  border_color?: string | null;
  accent_color?: string | null;
}

const resetThemeVariables = (root: HTMLElement) => {
  THEME_KEYS.forEach((key) => {
    root.style.removeProperty(`--${key}`);
  });
};

const buildColorMap = (company: CompanyTheme) => ({
  primary: company.primary_color,
  background: company.background_color,
  foreground: company.foreground_color,
  card: company.card_color,
  'card-foreground': company.card_foreground_color,
  muted: company.muted_color,
  'muted-foreground': company.muted_foreground_color,
  border: company.border_color,
  accent: company.accent_color,
});

export const useTenantTheme = (company: CompanyTheme | null) => {
  useEffect(() => {
    const storedTheme = localStorage.getItem('company_theme');
    if (!storedTheme) return;

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
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    resetThemeVariables(root);

    if (!company || company.use_custom_colors !== true) {
      localStorage.removeItem('company_theme');
      return;
    }

    const colorMap = buildColorMap(company);

    Object.entries(colorMap).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--${key}`, value);
      }
    });

    localStorage.setItem(
      'company_theme',
      JSON.stringify({
        companyId: company.id,
        colors: colorMap,
      }),
    );

    return () => {
      resetThemeVariables(root);
    };
  }, [
    company?.id,
    company?.use_custom_colors,
    company?.primary_color,
    company?.background_color,
    company?.foreground_color,
    company?.card_color,
    company?.card_foreground_color,
    company?.muted_color,
    company?.muted_foreground_color,
    company?.border_color,
    company?.accent_color,
  ]);
};
