import { Button } from "@/components/ui/button";
import { MessageSquareMore } from "lucide-react";

interface CannedResponseSelectorProps {
  onSelect: (content: string) => void;
}

export function CannedResponseSelector({ onSelect }: CannedResponseSelectorProps) {
  return (
    <Button variant="outline" size="sm" disabled>
      <MessageSquareMore className="h-4 w-4 mr-2" />
      Canned responses (unavailable)
    </Button>
  );
}
