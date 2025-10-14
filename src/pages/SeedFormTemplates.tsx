import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { seedFormTemplates } from '@/lib/seedFormTemplates';
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function SeedFormTemplates() {
  const navigate = useNavigate();
  const { company } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const activeCompany = selectedCompany || company;
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSeed = async () => {
    if (!activeCompany?.id) {
      toast.error('No company selected');
      return;
    }

    setIsSeeding(true);
    setResults([]);

    try {
      const seedResults = await seedFormTemplates(activeCompany.id);
      setResults(seedResults);
      
      const successCount = seedResults.filter(r => r.success).length;
      const failCount = seedResults.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast.success(`Successfully imported ${successCount} form templates!`);
      } else {
        toast.warning(`Imported ${successCount} templates, ${failCount} failed`);
      }
    } catch (error) {
      console.error('Error seeding templates:', error);
      toast.error('Failed to seed form templates');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/form-templates')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import Existing Forms</h1>
          <p className="text-muted-foreground">
            Import all existing request forms as customizable templates
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">This will import:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Hardware Request Form</li>
              <li>Marketing Request Form</li>
              <li>Toner Request Form</li>
              <li>User Account Request Form</li>
              <li>Generic Department Request Form</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            Company: <span className="font-medium">{activeCompany?.name}</span>
          </p>

          <Button
            onClick={handleSeed}
            disabled={isSeeding || !activeCompany}
            className="w-full"
          >
            {isSeeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Import Form Templates
          </Button>

          {results.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-semibold">Import Results:</h4>
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm p-2 rounded border"
                >
                  {result.success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>{result.name}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>{result.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({result.error?.message || 'Unknown error'})
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
