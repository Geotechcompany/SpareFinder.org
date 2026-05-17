import {
  BellRing,
  CreditCard,
  Headphones,
  History,
  LayoutDashboard,
  ScanSearch,
  Settings2,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

export type DashboardNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  requiresPlan?: boolean;
  badge?: string;
};

export type DashboardNavGroup = {
  title: string;
  items: DashboardNavItem[];
};

export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        href: "/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        description: "Overview & analytics",
      },
    ],
  },
  {
    title: "Analysis",
    items: [
      {
        href: "/dashboard/upload",
        icon: ScanSearch,
        label: "Upload",
        description: "Identify parts",
        requiresPlan: true,
      },
      {
        href: "/dashboard/history",
        icon: History,
        label: "History",
        description: "Past analyses",
        requiresPlan: true,
      },
    ],
  },
  {
    title: "Engagement",
    items: [
      {
        href: "/dashboard/reviews",
        icon: Star,
        label: "Reviews",
        description: "Your feedback",
        requiresPlan: true,
      },
      {
        href: "/dashboard/notifications",
        icon: BellRing,
        label: "Notifications",
        description: "Updates & alerts",
        requiresPlan: true,
        badge: "New",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        href: "/dashboard/profile",
        icon: UserRound,
        label: "Profile",
        description: "Your account",
      },
      {
        href: "/dashboard/billing",
        icon: CreditCard,
        label: "Billing",
        description: "Plans & invoices",
      },
      {
        href: "/dashboard/support",
        icon: Headphones,
        label: "Support",
        description: "Help & tickets",
      },
      {
        href: "/dashboard/settings",
        icon: Settings2,
        label: "Settings",
        description: "Preferences",
      },
    ],
  },
];

export function useVisibleDashboardNavGroups(): DashboardNavGroup[] {
  const { isPlanActive, isLoading: subscriptionLoading } = useSubscription();
  const { isAdmin } = useAuth();

  return useMemo(
    () =>
      DASHBOARD_NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => {
          if (isAdmin) return true;
          if (!subscriptionLoading && !isPlanActive && i.requiresPlan) return false;
          return true;
        }),
      })).filter((g) => g.items.length > 0),
    [isAdmin, isPlanActive, subscriptionLoading]
  );
}

export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
