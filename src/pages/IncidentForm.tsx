import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function IncidentForm() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['name', 'incident_involves', 'persons_involved', 'clinic', 'modality_area', 'incident_date', 'incident_time', 'incident_type', 'incident_description'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to submit an incident report',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      // Submit to incidents table
      const { error: requestError } = await supabase
        .from('incidents')
        .insert({
          user_id: user.id,
          reporter_name: formData.name,
          incident_involves: formData.incident_involves,
          persons_involved: formData.persons_involved,
          clinic: formData.clinic,
          modality_area: formData.modality_area,
          incident_date: formData.incident_date,
          incident_time: formData.incident_time,
          incident_type: formData.incident_type,
          incident_description: formData.incident_description,
          further_comments: formData.further_comments || null,
          status: 'submitted',
        });

      if (requestError) throw requestError;

      toast({
        title: 'Success',
        description: 'Your incident report has been submitted and will be forwarded to your manager.',
      });

      // Reset form
      setFormData({});
      navigate('/');
    } catch (error) {
      console.error('Error submitting incident report:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit incident report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Vision Radiology Online Incident Form</CardTitle>
          <CardDescription>
            HR & Employee Assistance Program - Report workplace incidents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">What is your name? *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                required
              />
            </div>

            {/* Who does the incident involve */}
            <div className="space-y-2">
              <Label>Who does the incident involve? *</Label>
              <RadioGroup
                value={formData.incident_involves}
                onValueChange={(value) => handleFieldChange('incident_involves', value)}
              >
                {['Staff', 'Visitor', 'Patient', 'Contractor', 'Other'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`involves-${option}`} />
                    <Label htmlFor={`involves-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Details of persons involved */}
            <div className="space-y-2">
              <Label htmlFor="persons_involved">Details of all person/s involved: *</Label>
              <Textarea
                id="persons_involved"
                value={formData.persons_involved || ''}
                onChange={(e) => handleFieldChange('persons_involved', e.target.value)}
                required
              />
            </div>

            {/* Clinic */}
            <div className="space-y-2">
              <Label htmlFor="clinic">Clinic *</Label>
              <Select
                value={formData.clinic}
                onValueChange={(value) => handleFieldChange('clinic', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  {['Botanic Ridge', 'Bulleen', 'Carnegie', 'Coburg', 'Colac', 'Diamond Creek', 'Greensborough', 'Hampton East', 'Kangaroo Flat', 'Kyabram', 'Lilydale', 'Lynbrook', 'Mornington', 'Mentone', 'Mulgrave', 'North Melbourne', 'Reservoir', 'Sebastopol', 'Shepparton', 'Thornbury', 'Torquay', 'Werribee', 'Williamstown'].map((clinic) => (
                    <SelectItem key={clinic} value={clinic}>{clinic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modality / Area */}
            <div className="space-y-2">
              <Label htmlFor="modality_area">Modality / Area *</Label>
              <Select
                value={formData.modality_area}
                onValueChange={(value) => handleFieldChange('modality_area', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select modality/area" />
                </SelectTrigger>
                <SelectContent>
                  {['XRAY CT Mammo', 'MRI', 'Ultrasound', 'Clinic'].map((modality) => (
                    <SelectItem key={modality} value={modality}>{modality}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date of incident */}
            <div className="space-y-2">
              <Label htmlFor="incident_date">Date of incident *</Label>
              <Input
                id="incident_date"
                type="date"
                value={formData.incident_date || ''}
                onChange={(e) => handleFieldChange('incident_date', e.target.value)}
                required
              />
            </div>

            {/* Time of incident */}
            <div className="space-y-2">
              <Label htmlFor="incident_time">Time of incident *</Label>
              <Input
                id="incident_time"
                type="time"
                value={formData.incident_time || ''}
                onChange={(e) => handleFieldChange('incident_time', e.target.value)}
                required
              />
            </div>

            {/* Type of Incident */}
            <div className="space-y-2">
              <Label htmlFor="incident_type">Type of Incident *</Label>
              <Select
                value={formData.incident_type}
                onValueChange={(value) => handleFieldChange('incident_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select incident type" />
                </SelectTrigger>
                <SelectContent>
                  {['Adverse reaction', 'Cardiac arrest', 'Extravasation', 'Fainting', 'Incorrect imaging', 'Needle stick injury', 'Patient aggression', 'Workplace injury', 'Other'].map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="incident_description">Please provide a description of the incident *</Label>
              <Textarea
                id="incident_description"
                value={formData.incident_description || ''}
                onChange={(e) => handleFieldChange('incident_description', e.target.value)}
                rows={5}
                required
              />
            </div>

            {/* Further comments */}
            <div className="space-y-2">
              <Label htmlFor="further_comments">
                Further comments (e.g., relevant notes added to Karisma in case of a reaction or patient aggression)
              </Label>
              <Textarea
                id="further_comments"
                value={formData.further_comments || ''}
                onChange={(e) => handleFieldChange('further_comments', e.target.value)}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                This form will be forwarded to your manager. Thank you for your submission.
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Incident Report
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
