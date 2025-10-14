import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Palette, RotateCcw, Sparkles } from "lucide-react";

interface ColorSchemeManagerProps {
  companyId: string;
}

interface ColorInput {
  label: string;
  key: string;
  description: string;
}

const colorInputs: ColorInput[] = [
  { label: "Primary Color", key: "primary_color", description: "Main brand color for buttons, links, and accents" },
  { label: "Background", key: "background_color", description: "Main background color" },
  { label: "Foreground", key: "foreground_color", description: "Main text color" },
  { label: "Card Background", key: "card_color", description: "Background color for cards and panels" },
  { label: "Card Text", key: "card_foreground_color", description: "Text color for cards" },
  { label: "Muted Background", key: "muted_color", description: "Subtle background color" },
  { label: "Muted Text", key: "muted_foreground_color", description: "Secondary text color" },
  { label: "Border", key: "border_color", description: "Border and separator color" },
  { label: "Accent", key: "accent_color", description: "Highlight and accent color" },
];

const defaultColors: Record<string, string> = {
  primary_color: "198 100% 42%", // #0096D6 - Vision cyan blue
  background_color: "0 0% 100%", // #FFFFFF - Clean white
  foreground_color: "222 37% 19%", // #1F2A44 - Deep navy
  card_color: "210 40% 98%", // #F8FAFC - Light card background
  card_foreground_color: "222 37% 19%", // #1F2A44 - Deep navy
  muted_color: "202 52% 93%", // #E8F3F9 - Light blue tint
  muted_foreground_color: "217 16% 50%", // #6B7C93 - Muted text
  border_color: "213 23% 84%", // #D2DAE3 - Subtle border
  accent_color: "197 79% 90%", // #D0ECF8 - Light blue accent
};

// Convert HSL string to hex for color input
const hslToHex = (hsl: string): string => {
  const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = (l / 100) - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Convert hex to HSL string
const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Calculate relative luminance for contrast checking
const getLuminance = (hsl: string): number => {
  const [, , l] = hsl.split(' ').map(v => parseFloat(v));
  return l / 100;
};

// Check if contrast ratio is sufficient (WCAG AA standard: 4.5:1 for normal text)
const hasGoodContrast = (color1: string, color2: string): boolean => {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const contrast = (lighter + 0.05) / (darker + 0.05);
  return contrast >= 4.5;
};

export default function ColorSchemeManager({ companyId }: ColorSchemeManagerProps) {
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch the specific company data
  const { data: company } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id,name,logo_url,use_custom_colors,primary_color,background_color,foreground_color,card_color,card_foreground_color,muted_color,muted_foreground_color,border_color,accent_color')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const [useCustomColors, setUseCustomColors] = useState(company?.use_custom_colors || false);
  const [overrideContrastCheck, setOverrideContrastCheck] = useState(false);
  const [colors, setColors] = useState<Record<string, string>>({
    primary_color: company?.primary_color || defaultColors.primary_color,
    background_color: company?.background_color || defaultColors.background_color,
    foreground_color: company?.foreground_color || defaultColors.foreground_color,
    card_color: company?.card_color || defaultColors.card_color,
    card_foreground_color: company?.card_foreground_color || defaultColors.card_foreground_color,
    muted_color: company?.muted_color || defaultColors.muted_color,
    muted_foreground_color: company?.muted_foreground_color || defaultColors.muted_foreground_color,
    border_color: company?.border_color || defaultColors.border_color,
    accent_color: company?.accent_color || defaultColors.accent_color,
  });

  // Update local state when company data loads
  useEffect(() => {
    if (company) {
      setUseCustomColors(company.use_custom_colors || false);
      setColors({
        primary_color: company.primary_color || defaultColors.primary_color,
        background_color: company.background_color || defaultColors.background_color,
        foreground_color: company.foreground_color || defaultColors.foreground_color,
        card_color: company.card_color || defaultColors.card_color,
        card_foreground_color: company.card_foreground_color || defaultColors.card_foreground_color,
        muted_color: company.muted_color || defaultColors.muted_color,
        muted_foreground_color: company.muted_foreground_color || defaultColors.muted_foreground_color,
        border_color: company.border_color || defaultColors.border_color,
        accent_color: company.accent_color || defaultColors.accent_color,
      });
    }
  }, [company]);

  const analyzeLogoMutation = useMutation({
    mutationFn: async (logoUrl: string) => {
      const { data, error } = await supabase.functions.invoke('analyze-logo-colors', {
        body: { logoUrl }
      });

      if (error) throw error;
      if (!data?.colors) throw new Error('No color data returned');
      
      return data.colors;
    },
    onSuccess: (aiColors) => {
      console.log('AI suggested colors:', aiColors);
      setColors(aiColors);
      setUseCustomColors(true);
      toast.success('AI color scheme applied! Review and save when ready.');
    },
    onError: (error: any) => {
      console.error('Error analyzing logo:', error);
      let message = 'Failed to analyze logo colors';
      const ctxBody = error?.context?.body;
      if (ctxBody) {
        try {
          const parsed = typeof ctxBody === 'string' ? JSON.parse(ctxBody) : ctxBody;
          if (parsed?.error) message = parsed.error;
        } catch {
          // ignore JSON parse errors
        }
      } else if (error?.message) {
        message = error.message;
      }
      toast.error(message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Company ID not found");

      // Validate contrasts before saving (unless override is enabled)
      if (!overrideContrastCheck) {
        const validations = [
          { bg: colors.background_color, fg: colors.foreground_color, name: "Background/Foreground" },
          { bg: colors.card_color, fg: colors.card_foreground_color, name: "Card Background/Text" },
          { bg: colors.muted_color, fg: colors.muted_foreground_color, name: "Muted Background/Text" },
        ];

        for (const { bg, fg, name } of validations) {
          if (!hasGoodContrast(bg, fg)) {
            throw new Error(`Poor contrast detected for ${name}. Please adjust colors for better readability.`);
          }
        }
      }

      const { error } = await supabase
        .from("companies")
        .update({
          ...colors,
          use_custom_colors: useCustomColors,
        })
        .eq("id", companyId);

      if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    toast.success("Colour scheme updated successfully");
    // Refresh auth context so the theme hook gets new company values
    refreshProfile?.();

    // Apply colours immediately
    if (useCustomColors) {
      applyColors(colors);
    } else {
      applyColors(defaultColors);
    }
  },
  onError: (error: any) => {
    toast.error("Failed to update colour scheme: " + error.message);
  },
  });

  const applyColors = (colorValues: Record<string, string>) => {
    const root = document.documentElement;
    const tokenMap: Record<string, string> = {
      primary_color: 'primary',
      background_color: 'background',
      foreground_color: 'foreground',
      card_color: 'card',
      card_foreground_color: 'card-foreground',
      muted_color: 'muted',
      muted_foreground_color: 'muted-foreground',
      border_color: 'border',
      accent_color: 'accent',
    };
    Object.entries(colorValues).forEach(([key, value]) => {
      const token = tokenMap[key];
      if (token && value) {
        root.style.setProperty(`--${token}`, value);
      }
    });
  };

  const handleColorChange = (key: string, hexValue: string) => {
    const hslValue = hexToHsl(hexValue);
    setColors(prev => ({ ...prev, [key]: hslValue }));
  };

  const handleReset = () => {
    setColors(defaultColors);
    setUseCustomColors(false);
  };

  const handleAnalyzeLogo = () => {
    const logoUrl = company?.logo_url;
    if (!logoUrl) {
      toast.error('Please upload a company logo first');
      return;
    }
    if (logoUrl.toLowerCase().endsWith('.svg')) {
      toast.error('SVG logos are not supported. Please upload a PNG or JPG logo.');
      return;
    }
    analyzeLogoMutation.mutate(logoUrl);
  };

  return (
    <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Colour Scheme
          </CardTitle>
          <CardDescription>
            Customise the colour scheme to match your brand. Colours are validated for accessibility.
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Use Custom Colours</Label>
            <p className="text-sm text-muted-foreground">
              Enable to use your custom colour scheme
            </p>
          </div>
          <Switch
            checked={useCustomColors}
            onCheckedChange={setUseCustomColors}
          />
        </div>

        {useCustomColors && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {colorInputs.map(({ label, key, description }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id={key}
                      value={hslToHex(colors[key])}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{description}</p>
                      <code className="text-xs">{colors[key]}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Override Contrast Check</Label>
                <p className="text-sm text-muted-foreground">
                  Allow saving colors that don't meet WCAG accessibility standards
                </p>
              </div>
              <Switch
                checked={overrideContrastCheck}
                onCheckedChange={setOverrideContrastCheck}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleAnalyzeLogo}
                disabled={analyzeLogoMutation.isPending || !company?.logo_url}
                variant="secondary"
              >
                {analyzeLogoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Logo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate from Logo
                  </>
                )}
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Colour Scheme
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="grid grid-cols-2 gap-2">
                <div 
                  className="p-3 rounded border"
                  style={{ 
                    backgroundColor: `hsl(${colors.background_color})`,
                    color: `hsl(${colors.foreground_color})`,
                    borderColor: `hsl(${colors.border_color})`
                  }}
                >
                  <p className="text-sm">Background & Text</p>
                </div>
                <div 
                  className="p-3 rounded"
                  style={{ 
                    backgroundColor: `hsl(${colors.primary_color})`,
                    color: `hsl(${colors.background_color})`
                  }}
                >
                  <p className="text-sm font-medium">Primary Button</p>
                </div>
                <div 
                  className="p-3 rounded border"
                  style={{ 
                    backgroundColor: `hsl(${colors.card_color})`,
                    color: `hsl(${colors.card_foreground_color})`,
                    borderColor: `hsl(${colors.border_color})`
                  }}
                >
                  <p className="text-sm">Card Content</p>
                </div>
                <div 
                  className="p-3 rounded"
                  style={{ 
                    backgroundColor: `hsl(${colors.muted_color})`,
                    color: `hsl(${colors.muted_foreground_color})`
                  }}
                >
                  <p className="text-sm">Muted Section</p>
                </div>
              </div>
            </div>
          </>
        )}

        {!useCustomColors && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Enable custom colours to customise your brand's colour scheme
          </p>
        )}
      </CardContent>
    </Card>
  );
}
