import { lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { InlineEditProvider } from "@/contexts/InlineEditContext";
import { ProtectedLayoutRoute } from "@/components/ProtectedLayoutRoute";
import { ThemeApplier } from "./components/ThemeApplier";

// Eager imports for high-traffic pages
import Auth from "./pages/Auth";
import SystemLogin from "./pages/SystemLogin";
import CreateSystemAdmin from "./pages/CreateSystemAdmin";
import Home from "./pages/Home";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Lazy imports for low-traffic pages
import NewRequest from "./pages/NewRequest";
const NewHardwareRequest = lazy(() => import("./pages/NewHardwareRequest"));
const NewUserAccount = lazy(() => import("./pages/NewUserAccount"));
const NewUserOffboarding = lazy(() => import("./pages/NewUserOffboarding"));
const NewMarketingRequest = lazy(() => import("./pages/NewMarketingRequest"));
const MonthlyNewsletter = lazy(() => import("./pages/MonthlyNewsletter"));
const Approvals = lazy(() => import("./pages/Approvals"));
const Admin = lazy(() => import("./pages/Admin"));
const ModalityManagement = lazy(() => import("./pages/ModalityManagement"));
const SharedClinic = lazy(() => import("./pages/SharedClinic"));
const ConfirmOrder = lazy(() => import("./pages/ConfirmOrder"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Help = lazy(() => import("./pages/Help"));
const Catalog = lazy(() => import("./pages/Catalog"));
const UserRoles = lazy(() => import("./pages/UserRoles"));
const ContactSupport = lazy(() => import("./pages/ContactSupport"));
const FileManager = lazy(() => import("./pages/FileManager"));
const PrintOrderingForms = lazy(() => import("./pages/PrintOrderingForms"));
const Documentation = lazy(() => import("./pages/Documentation"));
const NewsManagement = lazy(() => import("./pages/NewsManagement"));
const NewsViewAll = lazy(() => import("./pages/NewsViewAll"));
const ArticleEditor = lazy(() => import("./components/news/ArticleEditor"));
const ArticleView = lazy(() => import("./pages/ArticleView"));
const HelpTicket = lazy(() => import("./pages/HelpTicket"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CompanyAdmin = lazy(() => import("./pages/CompanyAdmin"));
const CompanyDirectory = lazy(() => import("./pages/CompanyDirectory"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const NotifyreFaxLogs = lazy(() => import("./pages/NotifyreFaxLogs"));
const PermissionManager = lazy(() => import("./pages/PermissionManager"));
const NewsletterSubmit = lazy(() => import("./pages/NewsletterSubmit"));
const AdvancedNotifications = lazy(() => import("./pages/AdvancedNotifications"));
const ContentEditor = lazy(() => import("./pages/ContentEditor"));
const FormTemplates = lazy(() => import("./pages/FormTemplates"));
const SeedFormTemplates = lazy(() => import("./pages/SeedFormTemplates"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Install = lazy(() => import("./pages/Install"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Reminders = lazy(() => import("./pages/Reminders"));
const NewReminder = lazy(() => import("./pages/NewReminder"));
const ReminderDetail = lazy(() => import("./pages/ReminderDetail"));
const ReminderEdit = lazy(() => import("./pages/ReminderEdit"));
const SiteMaps = lazy(() => import("./pages/SiteMaps"));
const SharedModality = lazy(() => import("./pages/SharedModality"));

const protectedLayoutRoutes: Array<{
  path: string;
  element: JSX.Element;
  requiredRole?: string[];
}> = [
  { path: "/home", element: <Home /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/requests", element: <Requests /> },
  { path: "/request/:requestNumber", element: <RequestDetail /> },
  { path: "/requests/:id", element: <RequestDetail /> },
  { path: "/requests/hardware/:id", element: <Requests /> },
  { path: "/requests/marketing/:id", element: <Requests /> },
  { path: "/requests/user-account/:id", element: <Requests /> },
  { path: "/requests/new", element: <NewRequest /> },
  { path: "/requests/hardware/new", element: <NewHardwareRequest /> },
  { path: "/catalog", element: <Catalog /> },
  { path: "/documentation", element: <Documentation /> },
  { path: "/news/view-all", element: <NewsViewAll /> },
  { path: "/news", element: <NewsManagement /> },
  { path: "/news/new", element: <ArticleEditor /> },
  { path: "/news/edit/:articleId", element: <ArticleEditor /> },
  { path: "/news/view/:articleId", element: <ArticleView /> },
  { path: "/user-accounts/new", element: <NewUserAccount /> },
  { path: "/user-offboarding/new", element: <NewUserOffboarding /> },
  { path: "/marketing/new", element: <NewMarketingRequest /> },
  { path: "/approvals", element: <Approvals /> },
  { path: "/settings", element: <Settings /> },
  { path: "/modality-management", element: <ModalityManagement /> },
  { path: "/help", element: <Help /> },
  { path: "/help-ticket", element: <HelpTicket /> },
  { path: "/directory", element: <CompanyDirectory /> },
  { path: "/knowledge-base", element: <KnowledgeBase /> },
  { path: "/fax-campaigns", element: <NotifyreFaxLogs /> },
  { path: "/contact-support", element: <ContactSupport /> },
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
  { path: "/integrations", element: <Integrations />, requiredRole: ["super_admin"] },
  { path: "/reminders", element: <Reminders /> },
  { path: "/reminders/new", element: <NewReminder /> },
  { path: "/reminders/edit/:id", element: <ReminderEdit /> },
  { path: "/reminders/:id", element: <ReminderDetail /> },
  { path: "/site-maps", element: <SiteMaps /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/install", element: <Install /> },
  ];

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InlineEditProvider>
          <ThemeApplier />
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
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
                <Route path="/shared/modality/:token" element={<SharedModality />} />
                <Route path="/confirm-order/:token" element={<ConfirmOrder />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </InlineEditProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;