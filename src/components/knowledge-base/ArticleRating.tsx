import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ArticleRatingProps {
  pageId: string;
}

export function ArticleRating({ pageId }: ArticleRatingProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const { data: userRating } = useQuery({
    queryKey: ["kb-rating", pageId, profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base_ratings")
        .select("rating")
        .eq("page_id", pageId)
        .eq("user_id", profile?.user_id!)
        .maybeSingle();

      if (error) throw error;
      return data?.rating || 0;
    },
    enabled: !!profile?.user_id,
  });

  const { data: averageRating } = useQuery({
    queryKey: ["kb-average-rating", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base_ratings")
        .select("rating")
        .eq("page_id", pageId);

      if (error) throw error;
      if (!data || data.length === 0) return { average: 0, count: 0 };

      const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
      return {
        average: sum / data.length,
        count: data.length,
      };
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const { error } = await supabase
        .from("knowledge_base_ratings")
        .upsert({
          page_id: pageId,
          user_id: profile?.user_id!,
          rating,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-rating", pageId] });
      queryClient.invalidateQueries({ queryKey: ["kb-average-rating", pageId] });
      toast.success("Rating submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit rating");
    },
  });

  const handleRating = (rating: number) => {
    rateMutation.mutate(rating);
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="flex-1">
        <p className="text-sm font-medium mb-2">Rate this article</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <Button
              key={rating}
              variant="ghost"
              size="sm"
              className="p-1"
              onMouseEnter={() => setHoveredRating(rating)}
              onMouseLeave={() => setHoveredRating(null)}
              onClick={() => handleRating(rating)}
            >
              <Star
                className={`h-5 w-5 ${
                  rating <= (hoveredRating || userRating || 0)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
          ))}
        </div>
      </div>
      
      {averageRating && averageRating.count > 0 && (
        <div className="text-sm text-muted-foreground">
          <div className="font-medium">
            {averageRating.average.toFixed(1)} / 5
          </div>
          <div className="text-xs">
            ({averageRating.count} {averageRating.count === 1 ? "rating" : "ratings"})
          </div>
        </div>
      )}
    </div>
  );
}