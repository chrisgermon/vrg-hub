import { useAuth } from "@/hooks/useAuth";
import { NewsletterSubmissionForm } from "@/components/newsletter/NewsletterSubmissionForm";
import { useNavigate } from "react-router-dom";

export default function NewsletterSubmit() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

      <NewsletterSubmissionForm
        cycleId=""
        department=""
        onSuccess={() => navigate("/newsletter")}
        onCancel={() => navigate("/newsletter")}
      />
    </div>
  );
}
