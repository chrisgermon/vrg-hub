import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  HeartHandshake, 
  FileText, 
  AlertTriangle, 
  Globe, 
  Download,
  Phone,
  Building2,
  QrCode,
  ExternalLink,
  Shield,
  Users,
  Briefcase,
  BookOpen,
  ClipboardList,
  UserCheck,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DocumentFile {
  name: string;
  id: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export default function HRAssistance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hrFiles, setHrFiles] = useState<DocumentFile[]>([]);
  // Load HR documents from storage
  useEffect(() => {
    if (user) {
      loadHRDocuments();
    }
  }, [user]);

  const loadHRDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from("documents")
        .list("shared/HR/", {
          sortBy: { column: "name", order: "asc" },
        });

      if (error) throw error;

      // Filter out folders and only get files
      const fileItems = (data || []).filter((item) => item.id !== null) as DocumentFile[];
      setHrFiles(fileItems);
    } catch (error: any) {
      console.error("Error loading HR documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDocument = async (fileName: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access documents",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(`shared/HR/${fileName}`, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      console.error("Error opening document:", error);
      toast({
        title: "Error",
        description: "Failed to open document. Please ensure the file exists.",
        variant: "destructive",
      });
    }
  };

  const findDocument = (searchName: string): DocumentFile | undefined => {
    return hrFiles.find((file) =>
      file.name.toLowerCase().includes(searchName.toLowerCase())
    );
  };

  // EAP Information
  const eapAccessCode = "0407086000";
  const companyName = "Vision Radiology Group";
  const eapWebsite = "https://eapassist.com.au/";

  const eapFeatures = [
    "Confidential counselling for personal or work-related issues",
    "Health and wellness resources",
    "Work-life balance guidance",
    "Referrals for specialised services as needed"
  ];

  const eapLinks = [
    {
      title: "EAP Official Website",
      description: "Access counselling and wellness programs",
      url: eapWebsite,
      icon: Globe,
      external: true
    },
    {
      title: "Whistleblower Program",
      description: "Report concerns confidentially",
      url: "#whistleblower",
      icon: Shield,
      external: false
    },
    {
      title: "EAP Assist Flyer",
      description: "Download program information",
      url: "#flyer",
      icon: Download,
      external: false
    }
  ];

  // HR Documents organized by category - these will link to actual files
  const hrDocuments = {
    organisational: [
      { name: "VR Group Organisational Support Centre Chart", icon: Building2, fileName: "VR-Group-Organisational-Support-Centre-Chart" },
      { name: "VR-Clinic-Workflow-Chart", icon: ClipboardList, fileName: "VR-Clinic-Workflow-Chart" }
    ],
    forms: [
      { name: "Vision-Radiology---Employee-Induction-V2", icon: UserCheck, fileName: "Vision-Radiology---Employee-Induction-V2" },
      { name: "Employee-Led-Check-In", icon: ClipboardList, fileName: "Employee-Led-Check-In" },
      { name: "Change of Bank Account Form", icon: FileText, fileName: "Change-of-Bank-Account-Form" },
      { name: "Maternity leave application letter", icon: FileText, fileName: "Maternity-leave-application-letter" }
    ],
    policies: [
      { name: "Responsibilities for incident management", icon: Shield, fileName: "Responsibilities-for-incident-management" },
      { name: "VRG Workflow for Addressing Incidents", icon: AlertTriangle, fileName: "VRG-Workflow-for-Addressing-Incidents" },
      { name: "VRG-HR-Policy-Manual-V2", icon: BookOpen, fileName: "VRG-HR-Policy-Manual-V2" },
      { name: "VRG_WHS Policy Statement", icon: Shield, fileName: "VRG_WHS-Policy-Statement" },
      { name: "Respectful Workplace Training - VRG Group", icon: Users, fileName: "Respectful-Workplace-Training-VRG-Group" },
      { name: "VRG Work Health Safety Management System Manual", icon: Shield, fileName: "VRG-Work-Health-Safety-Management-System-Manual" },
      { name: "Vision Radiology Saturday Urgent Reports Procedure", icon: ClipboardList, fileName: "Vision-Radiology-Saturday-Urgent-Reports-Procedure" },
      { name: "Contrast Media Administration Policy", icon: FileText, fileName: "Contrast-Media-Administration-Policy" },
      { name: "Managing Risk Of Potential Cross Infection", icon: Shield, fileName: "Managing-Risk-Of-Potential-Cross-Infection" }
    ]
  };

  const handleDocumentClick = (fileName: string) => {
    const doc = findDocument(fileName);
    if (doc) {
      openDocument(doc.name);
    } else {
      toast({
        title: "Document not found",
        description: "This document hasn't been uploaded yet. Please contact HR.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 md:p-12 mb-8 text-white">
        <div className="relative z-10">
          <div className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4">
            EMPLOYEE SUPPORT
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Vision Radiology's Employee Assistance Program
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl">
            Vision Radiology is excited to announce the launch of our new Employee Assistance Program (EAP), 
            designed to support your overall well-being and help you navigate the challenges of both your 
            personal and professional life.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* EAP Assist Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <HeartHandshake className="h-6 w-6 text-primary" />
                EAP Assist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                The EAP offers confidential counselling services, wellness programs, and many other helpful 
                resources, all at no cost to you. Whether you're dealing with stress, personal challenges, 
                relationship concerns, or work-related issues, our EAP is here to assist you in finding 
                practical solutions. The services are available to you and your immediate family members, 
                ensuring comprehensive support.
              </p>

              <div>
                <h3 className="font-semibold mb-3">Key Features of the EAP Include:</h3>
                <ul className="space-y-2">
                  {eapFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  EAP Assist counsellors are all qualified and highly experienced and will initially ask for 
                  your name as well as that of your employer details in order to verify eligibility for 
                  services. Information obtained during counselling is totally confidential & will not be 
                  released to any third party without prior written consent.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">
                  The EAP Assist website also contains an extensive range of self-help resources including 
                  digital treatment programs, apps & wellness challenges for employees to access:{" "}
                  <a 
                    href={eapWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {eapWebsite}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-primary">Confidentiality Guarantee</p>
                <p className="text-sm text-muted-foreground">
                  The program is confidential, and no personal information will be shared with the company 
                  without your permission.
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                We encourage you to take full advantage of this valuable resource. Our goal is to help you 
                maintain a healthy balance in all aspects of your life, which ultimately leads to a more 
                productive and positive work environment.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                If you have any questions or would like more information, please don't hesitate to reach out 
                to any of one of the leadership team, or visit{" "}
                <a 
                  href={`${eapWebsite}/faqs/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {eapWebsite}/faqs/
                  <ExternalLink className="h-3 w-3" />
                </a>.
              </p>
            </CardContent>
          </Card>

          {/* HR Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileText className="h-6 w-6 text-primary" />
                Policy and HR Documents
              </CardTitle>
              <CardDescription>
                Access important company policies, forms, and procedures
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading HR documents...</span>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Organisational Charts */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      VR Organisational Chart
                    </h3>
                    <div className="space-y-2">
                      {hrDocuments.organisational.map((doc, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3 px-3"
                          onClick={() => handleDocumentClick(doc.fileName)}
                          disabled={!findDocument(doc.fileName)}
                        >
                          <doc.icon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                          <span className="text-sm line-clamp-2">{doc.name}</span>
                        </Button>
                      ))}
                    </div>

                    {/* Monthly Newsletter Forms */}
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                        Monthly Newsletter Forms
                      </h3>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open('/newsletter', '_blank')}
                      >
                        <Globe className="h-4 w-4 mr-2 text-primary" />
                        Access newsletter forms
                      </Button>
                    </div>
                  </div>

                  {/* HR Forms */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      HR Forms
                    </h3>
                    <div className="space-y-2">
                      {hrDocuments.forms.map((doc, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3 px-3"
                          onClick={() => handleDocumentClick(doc.fileName)}
                          disabled={!findDocument(doc.fileName)}
                        >
                          <doc.icon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                          <span className="text-sm line-clamp-2">{doc.name}</span>
                        </Button>
                      ))}
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={() => window.open('/requests/help', '_blank')}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <span className="text-sm">Report workplace incident</span>
                      </Button>
                    </div>
                  </div>

                  {/* Policies & Procedures */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Policies | Procedures | Training
                    </h3>
                    <div className="space-y-2">
                      {hrDocuments.policies.map((doc, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3 px-3"
                          onClick={() => handleDocumentClick(doc.fileName)}
                          disabled={!findDocument(doc.fileName)}
                        >
                          <doc.icon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                          <span className="text-sm line-clamp-2">{doc.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {eapLinks.map((link, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => {
                    if (link.external) {
                      window.open(link.url, '_blank', 'noopener,noreferrer');
                    } else {
                      console.log(`Navigate to ${link.url}`);
                    }
                  }}
                >
                  <div className="flex items-start gap-3 w-full">
                    <link.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-0.5 flex items-center gap-1">
                        {link.title}
                        {link.external && <ExternalLink className="h-3 w-3" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {link.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Access EAP Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  To access up to three hours of telephone counselling from 9am - 9pm Monday - Saturday, 
                  scan the below QR Code:
                </p>
                <div className="bg-white rounded-lg p-4 flex items-center justify-center border-2 border-primary/20">
                  <QrCode className="h-32 w-32 text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Allocated Access Code:</span>
                  <code className="bg-background px-2 py-1 rounded border font-mono">
                    {eapAccessCode}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Registered company name:</span>
                  <p className="text-muted-foreground">{companyName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
