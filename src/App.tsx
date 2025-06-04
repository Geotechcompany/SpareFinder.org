import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import History from "./pages/History";
import Billing from "./pages/Billing";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import UserManagement from '@/pages/admin/UserManagement';
import SystemAnalytics from '@/pages/admin/SystemAnalytics';
import SystemSettings from '@/pages/admin/SystemSettings';
import DatabaseConsole from '@/pages/admin/DatabaseConsole';
import AuditLogs from '@/pages/admin/AuditLogs';
import EmailSmtpManagement from '@/pages/admin/EmailSmtpManagement';
import PaymentManagement from '@/pages/admin/PaymentManagement';
import AIModelsManagement from '@/pages/admin/AIModelsManagement';
import AdminLogin from '@/pages/admin/AdminLogin';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/upload" element={<Upload />} />
            <Route path="/dashboard/history" element={<History />} />
            <Route path="/dashboard/billing" element={<Billing />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/notifications" element={<Notifications />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/user-management" element={<UserManagement />} />
            <Route path="/admin/system-analytics" element={<SystemAnalytics />} />
            <Route path="/admin/system-settings" element={<SystemSettings />} />
            <Route path="/admin/database-console" element={<DatabaseConsole />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
            <Route path="/admin/email-smtp" element={<EmailSmtpManagement />} />
            <Route path="/admin/payment-methods" element={<PaymentManagement />} />
            <Route path="/admin/ai-models" element={<AIModelsManagement />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
