import {
  BarChart3,
  BellRing,
  BrainCircuit,
  CreditCard,
  Crown,
  Database,
  FileText,
  Mail,
  Megaphone,
  Settings,
  Tag,
  Terminal,
  Ticket,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { DashboardNavGroup } from "@/components/dashboard/dashboard-nav-config";
import { useAdminSidebarStats } from "@/contexts/AdminSidebarStatsContext";

export type AdminNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  badge?: string;
};

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

export function useAdminNavGroups(): DashboardNavGroup[] {
  const { totalUsers, recentAlerts } = useAdminSidebarStats();

  return useMemo(
    () => [
      {
        title: "Main",
        items: [
          {
            href: "/admin/dashboard",
            icon: BarChart3,
            label: "Dashboard",
            description: "Summary and charts",
          },
          {
            href: "/admin/user-management",
            icon: Users,
            label: "Users",
            description: "Accounts and roles",
            badge: totalUsers > 0 ? String(totalUsers) : undefined,
          },
          {
            href: "/admin/tickets",
            icon: Ticket,
            label: "Support tickets",
            description: "Help requests from customers",
          },
          {
            href: "/admin/system-analytics",
            icon: TrendingUp,
            label: "Usage & trends",
            description: "Traffic and product usage",
          },
          {
            href: "/admin/audit-logs",
            icon: Terminal,
            label: "Activity log",
            description: "Who changed what and when",
            badge: recentAlerts > 0 ? String(recentAlerts) : undefined,
          },
          {
            href: "/admin/onboarding-surveys",
            icon: FileText,
            label: "Welcome survey",
            description: "Answers from new sign-ups",
          },
          {
            href: "/admin/marketing-outbound",
            icon: Megaphone,
            label: "Email campaigns",
            description: "Cold email, contacts, and logs",
          },
          {
            href: "/admin/announcements",
            icon: BellRing,
            label: "In-app announcements",
            description: "Notify users in the dashboard",
          },
        ],
      },
      {
        title: "Billing",
        items: [
          {
            href: "/admin/payment-methods",
            icon: CreditCard,
            label: "Payments",
            description: "Cards, payouts, and billing",
          },
          {
            href: "/admin/plans",
            icon: Tag,
            label: "Pricing plans",
            description: "Change prices and features",
          },
          {
            href: "/admin/subscribers",
            icon: Crown,
            label: "Subscribers",
            description: "Who is on which plan",
          },
        ],
      },
      {
        title: "Advanced tools",
        items: [
          {
            href: "/admin/system-settings",
            icon: Settings,
            label: "Site settings",
            description: "Branding, limits, and toggles",
          },
          {
            href: "/admin/database-console",
            icon: Database,
            label: "Database tools",
            description: "Run safe admin queries",
          },
          {
            href: "/admin/email-smtp",
            icon: Mail,
            label: "Outgoing email",
            description: "How the app sends mail",
          },
          {
            href: "/admin/ai-models",
            icon: BrainCircuit,
            label: "AI settings",
            description: "Models used across the product",
          },
        ],
      },
    ],
    [recentAlerts, totalUsers]
  );
}
