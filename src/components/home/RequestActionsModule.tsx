import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RequestActionsModuleProps {
  isAdmin?: boolean;
}

export function RequestActionsModule({ isAdmin = false }: RequestActionsModuleProps) {
  const navigate = useNavigate();

  const actions = [
    { 
      name: "Requests", 
      icon: FileText, 
      onClick: () => navigate('/requests/new'),
      color: "text-primary"
    },
    { 
      name: "Report an incident", 
      icon: AlertTriangle, 
      onClick: () => navigate('/incidents/new'),
      color: "text-primary"
    },
    { 
      name: "Report a maintenance req", 
      icon: Wrench, 
      onClick: () => navigate('/requests/new?type=maintenance'),
      color: "text-primary"
    },
  ];

  return (
    <Card className="h-full rounded-xl shadow-sm border border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-primary">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {actions.map((action) => (
            <button
              key={action.name}
              onClick={action.onClick}
              className="w-full text-left px-2 py-1.5 text-xs text-primary hover:bg-primary/5 rounded transition-colors flex items-center gap-2 group"
            >
              <action.icon className="h-3.5 w-3.5" />
              <span>{action.name}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
