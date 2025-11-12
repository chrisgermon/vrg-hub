import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { InlineEditProvider } from "@/contexts/InlineEditContext";
import { ProtectedLayoutRoute } from "@/components/ProtectedLayoutRoute";
import { RouteLoading } from "@/components/RouteLoading";
import { ThemeApplier } from "./components/ThemeApplier";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eager imports for high-traffic pages
import Auth from "./pages/Auth";
import SystemLogin from "./pages/SystemLogin";
import CreateSystemAdmin from "./pages/CreateSystemAdmin";
import Home from "./pages/Home";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import EditRequest from "./pages/EditRequest";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Lazy imports for low-traffic pages
const NewRequest = lazy(() => import("./pages/NewRequest"));
const NewRequestCategory = lazy(() => import("./pages/NewRequestCategory"));
const NewDynamicRequest = lazy(() => import("./pages/NewDynamicRequest"));
const NewTicket = lazy(() => import("./pages/NewTicket"));
const MonthlyNewsletter = lazy(() => import("./pages/MonthlyNewsletter"));
const Approvals = lazy(() => import("./pages/Approvals"));
const Admin = lazy(() => import("./pages/Admin"));
const ModalityManagement = lazy(() => import("./pages/ModalityManagement"));
const SharedClinic = lazy(() => import("./pages/SharedClinic"));
const ConfirmOrder = lazy(() => import("./pages/ConfirmOrder"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Help = lazy(() => import("./pages/Help"));
const UserRoles = lazy(() => import("./pages/UserRoles"));
const ContactSupport = lazy(() => import("./pages/ContactSupport"));
const FileManager = lazy(() => import("./pages/FileManager"));
const PrintOrderingForms = lazy(() => import("./pages/PrintOrderingForms"));
const NewsManagement = lazy(() => import("./pages/NewsManagement"));
const NewsViewAll = lazy(() => import("./pages/NewsViewAll"));
const ArticleEditor = lazy(() => import("./components/news/ArticleEditor"));
const ArticleView = lazy(() => import("./pages/ArticleView"));
const HelpTicket = lazy(() => import("./pages/HelpTicket"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CompanyAdmin = lazy(() => import("./pages/CompanyAdmin"));
const CompanyDirectory = lazy(() => import("./pages/CompanyDirectory"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const MarketingCampaigns = lazy(() => import("./pages/MarketingCampaigns"));
const MarketingCalendar = lazy(() => import("./pages/MarketingCalendar"));
const PermissionManager = lazy(() => import("./pages/PermissionManager"));
const NewsletterSubmit = lazy(() => import("./pages/NewsletterSubmit"));
const AdvancedNotifications = lazy(() => import("./pages/AdvancedNotifications"));
const ContentEditor = lazy(() => import("./pages/ContentEditor"));
const FormTemplates = lazy(() => import("./pages/FormTemplates"));
const SeedFormTemplates = lazy(() => import("./pages/SeedFormTemplates"));
const AssignCategories = lazy(() => import("./pages/AssignCategories"));
const UploadLogoToStorage = lazy(() => import("./pages/UploadLogoToStorage"));
const Install = lazy(() => import("./pages/Install"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Reminders = lazy(() => import("./pages/Reminders"));
const NewReminder = lazy(() => import("./pages/NewReminder"));
const ReminderDetail = lazy(() => import("./pages/ReminderDetail"));
const ReminderEdit = lazy(() => import("./pages/ReminderEdit"));
const SiteMaps = lazy(() => import("./pages/SiteMaps"));
const SharedModality = lazy(() => import("./pages/SharedModality"));
const MissionStatement = lazy(() => import("./pages/MissionStatement"));
const ExternalProviders = lazy(() => import("./pages/ExternalProviders"));
const EmailTest = lazy(() => import("./pages/EmailTest"));
const EmailTestingDashboard = lazy(() => import("./pages/EmailTestingDashboard"));
const SetupVerification = lazy(() => import("./pages/SetupVerification"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Documents = lazy(() => import("./pages/Documents"));
const HRAssistance = lazy(() => import("./pages/HRAssistance"));
const IncidentForm = lazy(() => import("./pages/IncidentForm"));

const protectedLayoutRoutes: Array<{
  path: string;
  element: JSX.Element;
  requiredRole?: string[];
}> = [
  { path: "/home", element: <Home /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/requests", element: <Requests /> },
  { path: "/request/:requestNumber", element: <RequestDetail /> },
  { path: "/requests/:identifier", element: <RequestDetail /> },
  { path: "/requests/:identifier/edit", element: <EditRequest /> },
  { path: "/requests/hardware/:id", element: <Requests /> },
  { path: "/requests/marketing/:id", element: <Requests /> },
  { path: "/requests/user-account/:id", element: <Requests /> },
  { path: "/requests/new", element: <NewRequest /> },
  { path: "/requests/new/:slug", element: <NewRequestCategory /> },
  { path: "/requests/new/:slug/:categorySlug", element: <NewDynamicRequest /> },
  { path: "/requests/tickets/new", element: <NewTicket /> },
  { path: "/documents", element: <Documents /> },
  { path: "/hr-assistance", element: <HRAssistance /> },
  { path: "/incident-form", element: <IncidentForm /> },
  { path: "/news/view-all", element: <NewsViewAll /> },
  { path: "/news", element: <NewsManagement /> },
  { path: "/news/new", element: <ArticleEditor /> },
  { path: "/news/edit/:articleId", element: <ArticleEditor /> },
  { path: "/news/:slug", element: <ArticleView /> },
  { path: "/newsletter", element: <MonthlyNewsletter /> },
  { path: "/approvals", element: <Approvals /> },
  { path: "/settings", element: <Settings /> },
  { path: "/modality-management", element: <ModalityManagement /> },
  { path: "/help", element: <Help /> },
  { path: "/requests/help", element: <HelpTicket /> },
  { path: "/directory", element: <CompanyDirectory /> },
  { path: "/phone-directory", element: <CompanyDirectory /> },
  { path: "/company-directory", element: <CompanyDirectory /> },
  { path: "/external-providers", element: <ExternalProviders /> },
  { path: "/knowledge-base", element: <KnowledgeBase /> },
  { path: "/marketing-campaigns", element: <MarketingCampaigns /> },
  { path: "/marketing-calendar", element: <MarketingCalendar /> },
  { path: "/fax-campaigns", element: <Navigate to="/marketing-campaigns" replace /> },
  { path: "/mailchimp-campaigns", element: <Navigate to="/marketing-campaigns" replace /> },
  { path: "/requests/support", element: <ContactSupport /> },
  { path: "/contact-support", element: <Navigate to="/requests/support" replace /> },
  { path: "/help-ticket", element: <Navigate to="/requests/help" replace /> },
  { path: "/tickets/new", element: <Navigate to="/requests/tickets/new" replace /> },
  { path: "/admin", element: <Admin />, requiredRole: ["super_admin"] },
  { path: "/admin/company", element: <CompanyAdmin />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/admin/files", element: <FileManager />, requiredRole: ["super_admin"] },
  { path: "/audit-log", element: <AuditLog />, requiredRole: ["super_admin"] },
  { path: "/users", element: <Admin />, requiredRole: ["tenant_admin", "super_admin"] },
  { path: "/permissions", element: <PermissionManager />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/user-roles", element: <UserRoles />, requiredRole: ["tenant_admin", "super_admin"] },
  { path: "/notifications/advanced", element: <AdvancedNotifications />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/content-editor", element: <ContentEditor />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/form-templates", element: <FormTemplates />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/form-templates/seed", element: <SeedFormTemplates />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/form-templates/assign", element: <AssignCategories />, requiredRole: ["super_admin", "tenant_admin"] },
  { path: "/integrations", element: <Integrations />, requiredRole: ["super_admin"] },
  { path: "/reminders", element: <Reminders /> },
  { path: "/reminders/new", element: <NewReminder /> },
  { path: "/reminders/edit/:id", element: <ReminderEdit /> },
  { path: "/reminders/:id", element: <ReminderDetail /> },
  { path: "/site-maps", element: <SiteMaps /> },
  { path: "/install", element: <Install /> },
  { path: "/mission-statement", element: <MissionStatement /> },
  { path: "/email-test", element: <EmailTest />, requiredRole: ["super_admin", "tenant_admin", "manager"] },
  { path: "/email-testing", element: <EmailTestingDashboard />, requiredRole: ["super_admin", "tenant_admin", "manager"] },
  { path: "/setup-verification", element: <SetupVerification />, requiredRole: ["super_admin", "tenant_admin"] },
  ];

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InlineEditProvider>
            <ThemeApplier />
            <TooltipProvider>
              <Toaster />
              <BrowserRouter>
                <Suspense fallback={<RouteLoading />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/system-login" element={<SystemLogin />} />
                    <Route path="/create-system-admin" element={<CreateSystemAdmin />} />
                    {protectedLayoutRoutes.map(({ path, element, requiredRole }) => (
                      <Route
                        key={path}
                        path={path}
                        element={
                          <ProtectedLayoutRoute requiredRole={requiredRole}>
                            {element}
                          </ProtectedLayoutRoute>
                        }
                      />
                    ))}
                    <Route path="/shared/:token" element={<SharedClinic />} />
                    <Route path="/shared-clinic/:token" element={<SharedModality />} />
                    <Route path="/confirm-order/:token" element={<ConfirmOrder />} />
                    <Route path="/upload-logo" element={<UploadLogoToStorage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </InlineEditProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;