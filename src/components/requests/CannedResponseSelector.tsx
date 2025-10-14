import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareMore, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string | null;
}

interface CannedResponseSelectorProps {
  onSelect: (content: string) => void;
}

export function CannedResponseSelector({ onSelect }: CannedResponseSelectorProps) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<CannedResponse[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { company } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && company?.id) {
      fetchCannedResponses();
    }
  }, [open, company?.id]);

  useEffect(() => {
    if (search.trim()) {
      setFilteredResponses(
        responses.filter(
          (r) =>
            r.title.toLowerCase().includes(search.toLowerCase()) ||
            r.content.toLowerCase().includes(search.toLowerCase())
        )
      );
    } else {
      setFilteredResponses(responses);
    }
  }, [search, responses]);

  const fetchCannedResponses = async () => {
    if (!company?.id) return;

    try {
      const { data, error } = await supabase
        .from("canned_responses")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("title");

      if (error) throw error;
      setResponses(data || []);
      setFilteredResponses(data || []);
    } catch (error) {
      console.error("Error fetching canned responses:", error);
      toast({
        title: "Error",
        description: "Failed to load canned responses",
        variant: "destructive",
      });
    }
  };

  const handleSelect = (content: string) => {
    onSelect(content);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquareMore className="h-4 w-4 mr-2" />
          Canned responses
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search responses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-64">
            {filteredResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? "No responses found" : "No canned responses available"}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredResponses.map((response) => (
                  <button
                    key={response.id}
                    onClick={() => handleSelect(response.content)}
                    className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <p className="font-medium text-sm">{response.title}</p>
                    {response.category && (
                      <p className="text-xs text-muted-foreground">{response.category}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {response.content}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
