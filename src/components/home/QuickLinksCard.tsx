import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, FileText, ClipboardCheck, FolderOpen, Link as LinkIcon } from "lucide-react";

const linkGroups = [
  {
    title: "Forms",
    links: [
      { label: "Ultrasound Worksheets", href: "#", icon: FileSpreadsheet },
      { label: "Quick Forms", href: "/forms", icon: ClipboardCheck },
      { label: "Attendance Certificate", href: "#", icon: FileText },
    ],
  },
  {
    title: "Documents",
    links: [
      { label: "Excel Templates", href: "#", icon: FileSpreadsheet },
      { label: "Common Documents", href: "/documents", icon: FolderOpen },
    ],
  },
];

export function QuickLinksCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          Quick Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.title}
              </h4>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-sm text-foreground hover:text-primary"
                  >
                    <link.icon className="h-4 w-4 text-muted-foreground" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
