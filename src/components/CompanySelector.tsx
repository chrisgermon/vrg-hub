import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";

export function CompanySelector() {
  // Company selector is not shown for super admin anymore
  return null;
}
