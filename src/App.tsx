import "@/styles/variables.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DebugEnv from "@/components/DebugEnv";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import History from "./pages/History";
import Billing from "./pages/Billing";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import UserManagement from "@/pages/admin/UserManagement";
import SystemAnalytics from "@/pages/admin/SystemAnalytics";
import SystemSettings from "@/pages/admin/SystemSettings";
import DatabaseConsole from "@/pages/admin/DatabaseConsole";
import AuditLogs from "@/pages/admin/AuditLogs";
import EmailSmtpManagement from "@/pages/admin/EmailSmtpManagement";
import PaymentManagement from "@/pages/admin/PaymentManagement";
import AIModelsManagement from "@/pages/admin/AIModelsManagement";
import SubscribersManagement from "@/components/admin/SubscribersManagement";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

import Landing from "@/pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Trial from "@/pages/Trial";
import Unauthorized from "@/pages/Unauthorized";
import ForgotPassword from "@/pages/ForgotPassword";
import Contact from "@/pages/Contact";
import Reviews from "@/pages/Reviews";
import DashboardLayout from "@/components/DashboardLayout";
import SharedAnalysis from "@/pages/SharedAnalysis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <DebugEnv />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/login"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Login />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Register />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <ForgotPassword />
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
                <Route path="profile" element={<Profile />} />
              </Route>
              <Route
                path="/onboarding/trial"
                element={
                  <ProtectedRoute>
                    <Trial />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/dashboard"
                element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/user-management"
                element={
                  <AdminProtectedRoute>
                    <UserManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/system-analytics"
                element={
                  <AdminProtectedRoute>
                    <SystemAnalytics />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/system-settings"
                element={
                  <AdminProtectedRoute requiredRole="super_admin">
                    <SystemSettings />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/database-console"
                element={
                  <AdminProtectedRoute requiredRole="super_admin">
                    <DatabaseConsole />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <AdminProtectedRoute>
                    <AuditLogs />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/email-smtp"
                element={
                  <AdminProtectedRoute requiredRole="super_admin">
                    <EmailSmtpManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/payment-methods"
                element={
                  <AdminProtectedRoute>
                    <PaymentManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/ai-models"
                element={
                  <AdminProtectedRoute requiredRole="super_admin">
                    <AIModelsManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/subscribers"
                element={
                  <AdminProtectedRoute>
                    <SubscribersManagement />
                  </AdminProtectedRoute>
                }
              />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/share/:token" element={<SharedAnalysis />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
