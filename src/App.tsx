import "@/styles/variables.css";
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import DebugEnv from "@/components/DebugEnv";
import { SpinningLogoLoader } from "@/components/brand/spinning-logo-loader";
import { PageSEO } from "@/components/PageSEO";
import { InstallPrompt } from "@/components/InstallPrompt";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
// Eager-loaded so in-dashboard navigation does not trigger the global SpinningLogoLoader.
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import History from "./pages/History";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Reviews from "./pages/Reviews";
import Support from "./pages/Support";
const TestPayment = lazy(() => import("./pages/TestPayment"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const SystemAnalytics = lazy(() => import("@/pages/admin/SystemAnalytics"));
const SystemSettings = lazy(() => import("@/pages/admin/SystemSettings"));
const DatabaseConsole = lazy(() => import("@/pages/admin/DatabaseConsole"));
const AuditLogs = lazy(() => import("@/pages/admin/AuditLogs"));
const EmailSmtpManagement = lazy(() => import("@/pages/admin/EmailSmtpManagement"));
const PaymentManagement = lazy(() => import("@/pages/admin/PaymentManagement"));
const AIModelsManagement = lazy(() => import("@/pages/admin/AIModelsManagement"));
const SubscribersManagement = lazy(() => import("@/components/admin/SubscribersManagement"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const OnboardingSurveys = lazy(() => import("@/pages/admin/OnboardingSurveys"));
const PlansManagement = lazy(() => import("@/pages/admin/PlansManagement"));
const TicketManagement = lazy(() => import("@/pages/admin/TicketManagement"));
const MarketingOutbound = lazy(() => import("@/pages/admin/MarketingOutbound"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/AdminAnnouncements"));

const Landing = lazy(() => import("@/pages/Landing"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const Help = lazy(() => import("@/pages/Help"));
const Trial = lazy(() => import("@/pages/Trial"));
const OnboardingProfile = lazy(() => import("@/pages/OnboardingProfile"));
const MigrateAccount = lazy(() =>
  import("@/pages/MigrateAccount").then((m) => ({ default: m.MigrateAccount }))
);
const Unauthorized = lazy(() => import("@/pages/Unauthorized"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const Contact = lazy(() => import("@/pages/Contact"));
const PublicReviews = lazy(() => import("@/pages/PublicReviews"));
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
const SharedAnalysis = lazy(() => import("@/pages/SharedAnalysis"));
const ClerkSsoCallback = lazy(() => import("@/pages/ClerkSsoCallback"));
const ApiDocs = lazy(() => import("@/pages/ApiDocs"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkspaceProvider>
      <SubscriptionProvider>
        <ThemeProvider>
          <TooltipProvider>
            <DebugEnv />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PageSEO />
              <InstallPrompt />
              <Suspense fallback={<SpinningLogoLoader label="Loading page…" />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/api-docs" element={<ApiDocs />} />

                  {/* Clerk OAuth/SAML callback routes (required for social sign-in) */}
                  <Route path="/login/sso-callback" element={<ClerkSsoCallback />} />
                  <Route path="/register/sso-callback" element={<ClerkSsoCallback />} />
                  <Route path="/admin/login/sso-callback" element={<ClerkSsoCallback />} />
                  {/* Used when a signed-in user links an OAuth provider (Google/Facebook) */}
                  <Route
                    path="/account/sso-callback"
                    element={
                      <ClerkSsoCallback redirectUrlComplete="/dashboard/settings" />
                    }
                  />

                  <Route
                    path="/login/*"
                    element={
                      <ProtectedRoute requireAuth={false}>
                        <Login />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/register/*"
                    element={
                      <ProtectedRoute requireAuth={false}>
                        <Register />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reset-password/*"
                    element={
                      <ProtectedRoute requireAuth={false}>
                        <ForgotPassword />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/migrate"
                    element={
                      <ProtectedRoute requireAuth={false}>
                        <MigrateAccount />
                      </ProtectedRoute>
                    }
                  />
                  {/* Legacy shortcuts → dashboard routes */}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Navigate to="/dashboard/profile" replace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <Navigate to="/dashboard/history" replace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Navigate to="/dashboard/settings" replace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="upload" element={<Upload />} />
                    <Route path="history" element={<History />} />
                    <Route path="reviews" element={<Reviews />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="support" element={<Support />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>
                  <Route
                    path="/test-payment"
                    element={
                      <ProtectedRoute requireAuth={false}>
                        <TestPayment />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboarding/trial"
                    element={
                      <ProtectedRoute>
                        <Trial />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onboarding/profile"
                    element={
                      <ProtectedRoute>
                        <OnboardingProfile />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin"
                    element={
                      <AdminProtectedRoute>
                        <AdminLayout />
                      </AdminProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="user-management" element={<UserManagement />} />
                    <Route path="system-analytics" element={<SystemAnalytics />} />
                    <Route path="system-settings" element={<SystemSettings />} />
                    <Route path="database-console" element={<DatabaseConsole />} />
                    <Route path="audit-logs" element={<AuditLogs />} />
                    <Route path="email-smtp" element={<EmailSmtpManagement />} />
                    <Route path="payment-methods" element={<PaymentManagement />} />
                    <Route path="plans" element={<PlansManagement />} />
                    <Route path="ai-models" element={<AIModelsManagement />} />
                    <Route path="subscribers" element={<SubscribersManagement />} />
                    <Route path="onboarding-surveys" element={<OnboardingSurveys />} />
                    <Route path="tickets" element={<TicketManagement />} />
                    <Route path="marketing-outbound" element={<MarketingOutbound />} />
                    <Route path="announcements" element={<AdminAnnouncements />} />
                  </Route>
                  <Route path="/admin/login/*" element={<AdminLogin />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/reviews" element={<PublicReviews />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="/share/:token" element={<SharedAnalysis />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </SubscriptionProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
