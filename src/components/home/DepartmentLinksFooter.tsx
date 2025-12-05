import { Building2, Users, Megaphone, Briefcase, DollarSign, HeadphonesIcon } from "lucide-react";

const departments = [
  { name: "Reception", icon: Building2, href: "#" },
  { name: "Medical", icon: Users, href: "#" },
  { name: "Marketing", icon: Megaphone, href: "#" },
  { name: "HR", icon: Briefcase, href: "#" },
  { name: "Finance", icon: DollarSign, href: "#" },
];

export function DepartmentLinksFooter() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card rounded-xl border border-border/50 shadow-card">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {departments.map((dept) => (
          <a
            key={dept.name}
            href={dept.href}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-primary hover:text-primary-foreground text-sm font-medium transition-colors"
          >
            <dept.icon className="h-4 w-4" />
            {dept.name}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-status-approved animate-pulse" />
          All Systems Operational
        </div>
        <a 
          href="/support" 
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <HeadphonesIcon className="h-4 w-4" />
          IT Support
        </a>
      </div>
    </div>
  );
}
