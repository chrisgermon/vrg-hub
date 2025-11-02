import { useAuth } from "@/hooks/useAuth";
import { ContributorDashboard } from "@/components/newsletter/ContributorDashboard";

export default function NewsletterSubmit() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Newsletter Submission</h1>
          <p className="text-muted-foreground">
            Please sign in to submit newsletter content
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Newsletter Submission</h1>
        <p className="text-muted-foreground">
          Submit your monthly newsletter content
        </p>
      </div>

      <ContributorDashboard />
    </div>
  );
}
