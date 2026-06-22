import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { AdminPageHeader, AdminPageHeaderToolbar } from "@/components/admin/AdminPageHeader";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { TableSkeleton } from "@/components/skeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Crown,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  UserCog,
  MapPin,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { startImpersonationSession } from "@/lib/impersonation";
import {
  AdminUserLocation,
  LocationSummaryChip,
} from "@/components/admin/AdminUserLocation";

interface UserData {
  id: string;
  email: string;
  full_name: string;
  company?: string;
  role: "user" | "admin" | "super_admin";
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  is_active?: boolean;
  is_verified?: boolean;
  search_count?: number;
  last_search_at?: string;
  upload_count?: number;
  last_upload_at?: string;
  subscription_tier?: string;
  subscription_status?: string;
  is_on_trial?: boolean;
  trial_days_remaining?: number | null;
  trial_ends_at?: string | null;
  clerk_user_id?: string | null;
  user_country?: string | null;
  user_region?: string | null;
  user_currency?: string | null;
  country_code?: string | null;
  location_label?: string | null;
  use_regional_suppliers?: boolean;
}

interface LocationSummaryCountry {
  country: string;
  country_code?: string | null;
  count: number;
  regional_enabled: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [locationSummary, setLocationSummary] = useState<LocationSummaryCountry[]>(
    []
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkCancelDialogOpen, setBulkCancelDialogOpen] = useState(false);
  const [cancelSubscriptionUser, setCancelSubscriptionUser] =
    useState<UserData | null>(null);
  const [cancelSubscriptionLoading, setCancelSubscriptionLoading] =
    useState(false);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: currentUser, isSuperAdmin } = useAuth();

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm || roleFilter !== "all" || countryFilter !== "all") {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
      fetchUsers();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, roleFilter, countryFilter]);

  useEffect(() => {
    void api.admin
      .getUsersLocationSummary()
      .then((res) => {
        const payload = (res as { data?: { countries?: LocationSummaryCountry[] } })
          ?.data;
        if (payload?.countries) setLocationSummary(payload.countries);
      })
      .catch(() => {});
  }, []);

  // Separate effect for pagination changes (no debounce needed)
  useEffect(() => {
    fetchUsers();
  }, [pagination.page]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const response = await api.admin.getUsers(
        pagination.page,
        pagination.limit,
        searchTerm,
        roleFilter,
        countryFilter
      );

      if (response.success && response.data) {
        const data = response.data as any;
        const fetchedUsers = (data.users || []) as UserData[];
        const apiPagination = data.pagination || {};

        const totalFromApi =
          typeof apiPagination.total === "number"
            ? apiPagination.total
            : fetchedUsers.length;
        const pagesFromApi =
          typeof apiPagination.pages === "number"
            ? apiPagination.pages
            : typeof apiPagination.totalPages === "number"
            ? apiPagination.totalPages
            : Math.max(1, Math.ceil(totalFromApi / pagination.limit));

        setUsers(fetchedUsers);
        setPagination((prev) => ({
          ...prev,
          total: totalFromApi,
          pages: pagesFromApi,
        }));
      } else {
        setUsers([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          pages: 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users. Please try again.",
      });
      // Set empty users array on error
      setUsers([]);
      setPagination((prev) => ({
        ...prev,
        total: 0,
        pages: 0,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = async (
    userId: string,
    newRole: "user" | "admin" | "super_admin"
  ) => {
    try {
      const response = await api.admin.updateUserRole(userId, newRole);

      if (response.success) {
        toast({
          title: "Role Updated",
          description: "User role has been updated successfully.",
        });
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role. Please try again.",
      });
    }
  };

  const VALID_TIERS = ["free", "pro", "enterprise"] as const;

  const isSubscriptionCancelled = (user: UserData) =>
    user.subscription_status === "canceled" ||
    user.subscription_status === "inactive";

  const isSubscriptionActive = (user: UserData) =>
    Boolean(user.subscription_status) && !isSubscriptionCancelled(user);

  const getPlanSelectValue = (user: UserData) => {
    if (isSubscriptionCancelled(user)) return "no_active_plan";
    return user.subscription_tier || "free";
  };

  const handlePlanUpdate = async (
    userId: string,
    newTier: "free" | "pro" | "enterprise"
  ) => {
    if (!newTier || !VALID_TIERS.includes(newTier)) return;
    try {
      const response = await api.admin.updateUserPlan(userId, newTier);

      if (response.success) {
        toast({
          title: "Plan Updated",
          description: "User plan has been updated successfully.",
        });
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  subscription_tier: newTier,
                  subscription_status: "active",
                }
              : u
          )
        );
      } else {
        throw new Error((response as any).error || "Failed to update plan");
      }
    } catch (error) {
      console.error("Error updating user plan:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user plan. Please try again.",
      });
    }
  };

  const handleCancelSubscription = async (userId: string) => {
    setCancelSubscriptionLoading(true);
    try {
      const response = await api.admin.cancelUserSubscription(userId);

      if (response.success) {
        toast({
          title: "Subscription Cancelled",
          description:
            "The user's subscription has been cancelled in Stripe and locally.",
        });
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  subscription_tier: "free",
                  subscription_status: "canceled",
                }
              : u
          )
        );
        setCancelSubscriptionUser(null);
      } else {
        throw new Error(
          (response as any).message ||
            (response as any).error ||
            "Failed to cancel subscription"
        );
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to cancel subscription. Please try again.",
      });
    } finally {
      setCancelSubscriptionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await api.admin.deleteUser(userId);

      if (response.success) {
        toast({
          title: "User Deleted",
          description: "User has been deleted successfully.",
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user. Please try again.",
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedForBulkDelete = currentUser?.id
    ? Array.from(selectedIds).filter((id) => id !== currentUser.id)
    : Array.from(selectedIds);

  const handleBulkSetRole = async (role: "user" | "admin" | "super_admin") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    let ok = 0;
    let err = 0;
    for (const userId of ids) {
      try {
        const res = await api.admin.updateUserRole(userId, role);
        if (res.success) ok++;
        else err++;
      } catch {
        err++;
      }
    }
    setBulkActionLoading(false);
    setSelectedIds(new Set());
    fetchUsers();
    toast({
      title: "Bulk role update",
      description: `${ok} updated. ${err > 0 ? `${err} failed.` : ""}`,
      variant: err > 0 ? "destructive" : "default",
    });
  };

  const handleBulkSetPlan = async (tier: "free" | "pro" | "enterprise") => {
    if (!VALID_TIERS.includes(tier)) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    let ok = 0;
    let err = 0;
    for (const userId of ids) {
      try {
        const res = await api.admin.updateUserPlan(userId, tier);
        if (res.success) ok++;
        else err++;
      } catch {
        err++;
      }
    }
    setBulkActionLoading(false);
    setSelectedIds(new Set());
    setUsers((prev) =>
      prev.map((u) =>
        ids.includes(u.id)
          ? {
              ...u,
              subscription_tier: tier,
              subscription_status: "active",
            }
          : u
      )
    );
    fetchUsers();
    toast({
      title: "Bulk plan update",
      description: `${ok} updated. ${err > 0 ? `${err} failed.` : ""}`,
      variant: err > 0 ? "destructive" : "default",
    });
  };

  const handleBulkCancelSubscriptions = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    let ok = 0;
    let err = 0;
    for (const userId of ids) {
      try {
        const res = await api.admin.cancelUserSubscription(userId);
        if (res.success) ok++;
        else err++;
      } catch {
        err++;
      }
    }
    setBulkActionLoading(false);
    setSelectedIds(new Set());
    setBulkCancelDialogOpen(false);
    setUsers((prev) =>
      prev.map((u) =>
        ids.includes(u.id)
          ? {
              ...u,
              subscription_tier: "free",
              subscription_status: "canceled",
            }
          : u
      )
    );
    fetchUsers();
    toast({
      title: "Bulk subscription cancellation",
      description: `${ok} cancelled. ${err > 0 ? `${err} failed.` : ""}`,
      variant: err > 0 ? "destructive" : "default",
    });
  };

  const handleBulkDelete = async () => {
    if (selectedForBulkDelete.length === 0) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: "Selected set includes you; you cannot delete your own account.",
      });
      setBulkDeleteDialogOpen(false);
      return;
    }
    setBulkActionLoading(true);
    let ok = 0;
    let err = 0;
    for (const userId of selectedForBulkDelete) {
      try {
        const res = await api.admin.deleteUser(userId);
        if (res.success) ok++;
        else err++;
      } catch {
        err++;
      }
    }
    setBulkActionLoading(false);
    setSelectedIds(new Set());
    setBulkDeleteDialogOpen(false);
    fetchUsers();
    toast({
      title: "Bulk delete",
      description: `${ok} deleted. ${err > 0 ? `${err} failed.` : ""}`,
      variant: err > 0 ? "destructive" : "default",
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return Crown;
      case "admin":
        return Shield;
      default:
        return User;
    }
  };

  const handleImpersonate = async (target: UserData) => {
    if (target.id === currentUser?.id) {
      toast({
        variant: "destructive",
        title: "Cannot impersonate",
        description: "You cannot impersonate your own account.",
      });
      return;
    }
    if (
      (target.role === "admin" || target.role === "super_admin") &&
      !isSuperAdmin
    ) {
      toast({
        variant: "destructive",
        title: "Not allowed",
        description: "Only super admins can impersonate staff accounts.",
      });
      return;
    }

    setImpersonatingUserId(target.id);
    try {
      const response = await api.admin.impersonateUser(target.id);
      const token = response.data?.token;
      const redirectUrl = (response.data as { redirect_url?: string })?.redirect_url;
      if (!response.success || (!token && !redirectUrl)) {
        throw new Error(
          response.message ||
            (typeof response.error === "string" && response.error !== "error"
              ? response.error
              : null) ||
            "Failed to start impersonation. Check Clerk impersonation is enabled."
        );
      }
      const targetMeta = response.data?.target;
      startImpersonationSession(
        { token, redirectUrl },
        {
          targetEmail: targetMeta?.email || target.email,
          targetName: targetMeta?.full_name || target.full_name,
          returnUrl: "/admin/users",
        }
      );
    } catch (error) {
      console.error("Impersonation error:", error);
      toast({
        variant: "destructive",
        title: "Impersonation failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not sign in as this user. Check Clerk configuration.",
      });
      setImpersonatingUserId(null);
    }
  };

  const formatTrialLabel = (days: number | null | undefined) => {
    if (days == null) return "Trial active";
    if (days <= 0) return "Ends today";
    if (days === 1) return "1 day left";
    return `${days} days left`;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-500/30";
      case "admin":
        return "bg-brand/20 text-brand-light border-brand/30";
      default:
        return "bg-blue-600/20 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <AdminPageContent>
<AdminPageHeader
            breadcrumbPage="People & roles"
            title="User accounts"
            description="Look up members, adjust roles, and keep access under control."
            actions={
              <AdminPageHeaderToolbar>
                <Badge
                  variant="secondary"
                  className="h-9 shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-primary dark:border-primary/25 dark:bg-primary/15"
                >
                  <Users className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  {pagination.total.toLocaleString()} accounts
                </Badge>
              </AdminPageHeaderToolbar>
            }
          />

          {/* Location summary */}
          {locationSummary.length > 0 && (
            <Card className="bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground dark:text-white">
                    Users by location
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LocationSummaryChip
                    country="All countries"
                    count={pagination.total}
                    active={countryFilter === "all"}
                    onClick={() => setCountryFilter("all")}
                  />
                  {locationSummary.slice(0, 12).map((row) => (
                    <LocationSummaryChip
                      key={row.country}
                      country={row.country}
                      countryCode={row.country_code}
                      count={row.count}
                      active={countryFilter === row.country}
                      onClick={() =>
                        setCountryFilter(
                          countryFilter === row.country ? "all" : row.country
                        )
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className="bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 transform text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, email, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background/80 border-border text-foreground placeholder-muted-foreground dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="bg-background/80 border-border text-foreground dark:bg-white/5 dark:border-white/10 dark:text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="super_admin">Super Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                <Users className="w-5 h-5 text-brand dark:text-brand-light" />
                <span>System Users</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton variant="detailed" rows={5} />
              ) : (
                <>
                  {/* Bulk actions bar */}
                  {selectedIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-3 py-3 px-4 mb-4 rounded-lg border border-border bg-muted/50 dark:bg-white/5 dark:border-white/10">
                      <span className="text-sm font-medium text-foreground dark:text-white">
                        {selectedIds.size} selected
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-border bg-background/80 text-foreground dark:bg-white/5 dark:border-white/10 dark:text-white"
                            >
                              Set role <ChevronDown className="w-4 h-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem onClick={() => handleBulkSetRole("user")}>
                              <User className="w-4 h-4 mr-2" />
                              User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkSetRole("admin")}>
                              <Shield className="w-4 h-4 mr-2" />
                              Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkSetRole("super_admin")}>
                              <Crown className="w-4 h-4 mr-2" />
                              Super Admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-border bg-background/80 text-foreground dark:bg-white/5 dark:border-white/10 dark:text-white"
                            >
                              Set plan <ChevronDown className="w-4 h-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem onClick={() => handleBulkSetPlan("free")}>
                              Starter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkSetPlan("pro")}>
                              Professional
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkSetPlan("enterprise")}>
                              Enterprise
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/20"
                          onClick={() => setBulkCancelDialogOpen(true)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel subscriptions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/20"
                          onClick={() => setBulkDeleteDialogOpen(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Clear selection
                      </Button>
                      {bulkActionLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  )}

                  {/* Bulk cancel confirmation dialog */}
                  <AlertDialog open={bulkCancelDialogOpen} onOpenChange={setBulkCancelDialogOpen}>
                    <AlertDialogContent className="border border-border bg-background/95 text-foreground dark:bg-gray-900 dark:border-white/10 dark:text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground dark:text-white">
                          Cancel {selectedIds.size} subscription
                          {selectedIds.size !== 1 ? "s" : ""}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground dark:text-gray-400">
                          This immediately cancels each user&apos;s Stripe subscription (if
                          one exists) and marks their plan as cancelled locally.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border border-border bg-background/80 text-foreground hover:bg-accent dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                          Keep subscriptions
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkCancelSubscriptions}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {bulkActionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Cancel subscriptions
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Single-user cancel confirmation dialog */}
                  <AlertDialog
                    open={Boolean(cancelSubscriptionUser)}
                    onOpenChange={(open) => {
                      if (!open) setCancelSubscriptionUser(null);
                    }}
                  >
                    <AlertDialogContent className="border border-border bg-background/95 text-foreground dark:bg-gray-900 dark:border-white/10 dark:text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground dark:text-white">
                          Cancel subscription?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground dark:text-gray-400">
                          Cancel the subscription for{" "}
                          <strong>
                            {cancelSubscriptionUser?.full_name ||
                              cancelSubscriptionUser?.email}
                          </strong>
                          ? This immediately cancels their Stripe subscription (if one
                          exists) and marks their plan as cancelled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border border-border bg-background/80 text-foreground hover:bg-accent dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                          Keep subscription
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            if (cancelSubscriptionUser) {
                              void handleCancelSubscription(cancelSubscriptionUser.id);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {cancelSubscriptionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Cancel subscription
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Bulk delete confirmation dialog */}
                  <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                    <AlertDialogContent className="border border-border bg-background/95 text-foreground dark:bg-gray-900 dark:border-white/10 dark:text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground dark:text-white">
                          Delete {selectedForBulkDelete.length} user{selectedForBulkDelete.length !== 1 ? "s" : ""}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground dark:text-gray-400">
                          This action cannot be undone. Users and their data will be permanently removed.
                          {currentUser?.id && selectedIds.has(currentUser.id) && (
                            <span className="block mt-2 text-amber-600 dark:text-amber-400">
                              Your own account is in the selection and will be excluded from deletion.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border border-border bg-background/80 text-foreground hover:bg-accent dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {bulkActionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60 dark:border-white/10">
                          <TableHead className="w-10 px-2">
                            <Checkbox
                              checked={
                                users.length > 0
                                  ? selectedIds.size === users.length
                                    ? true
                                    : selectedIds.size > 0
                                    ? "indeterminate"
                                    : false
                                  : false
                              }
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all on page"
                            />
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            User
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Location
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Company
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Role
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Plan
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Trial
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Activity
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Joined
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                              <TableCell colSpan={10} className="py-8 text-center">
                              <div className="text-muted-foreground">
                                {searchTerm || roleFilter !== "all" ? (
                                  <div>
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>
                                      No users found matching your criteria.
                                    </p>
                                    <p className="text-sm mt-1">
                                      Try adjusting your search or filters.
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No users found.</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => {
                            const RoleIcon = getRoleIcon(user.role);
                            return (
                                <TableRow
                                key={user.id}
                                className="hover:bg-muted/60 border-border/40 dark:border-white/10 dark:hover:bg-white/5"
                              >
                                <TableCell className="w-10 px-2">
                                  <Checkbox
                                    checked={selectedIds.has(user.id)}
                                    onCheckedChange={() => toggleUser(user.id)}
                                    aria-label={`Select ${user.full_name || user.email}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-foreground dark:text-white">
                                      {user.full_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground dark:text-gray-400">
                                      {user.email}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <AdminUserLocation user={user as unknown as Record<string, unknown>} />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground dark:text-gray-300">
                                  {user.company || "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    className={getRoleColor(user.role)}
                                  >
                                    <RoleIcon className="w-3 h-3 mr-1" />
                                    {user.role.replace("_", " ").toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={getPlanSelectValue(user)}
                                      onValueChange={(value) => {
                                        if (value === "no_active_plan") return;
                                        handlePlanUpdate(
                                          user.id,
                                          value as "free" | "pro" | "enterprise"
                                        );
                                      }}
                                    >
                                      <SelectTrigger className="w-36 h-8 text-xs bg-background/80 border-border text-foreground dark:bg-white/5 dark:border-white/10 dark:text-white">
                                        <SelectValue placeholder="Plan" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {isSubscriptionCancelled(user) && (
                                          <SelectItem value="no_active_plan" disabled>
                                            No active plan
                                          </SelectItem>
                                        )}
                                        <SelectItem value="free">
                                          Starter
                                        </SelectItem>
                                        <SelectItem value="pro">
                                          Professional
                                        </SelectItem>
                                        <SelectItem value="enterprise">
                                          Enterprise
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {isSubscriptionActive(user) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/20"
                                        onClick={() => setCancelSubscriptionUser(user)}
                                      >
                                        <XCircle className="w-3.5 h-3.5 mr-1" />
                                        Cancel
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {user.is_on_trial ? (
                                    <div className="space-y-1">
                                      <Badge
                                        variant="secondary"
                                        className="bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400"
                                      >
                                        <Clock className="w-3 h-3 mr-1" />
                                        Free trial
                                      </Badge>
                                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                        {formatTrialLabel(user.trial_days_remaining)}
                                      </p>
                                      {user.trial_ends_at && (
                                        <p className="text-xs text-muted-foreground">
                                          Ends{" "}
                                          {new Date(user.trial_ends_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground dark:text-gray-300">
                                  <div className="text-sm">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-blue-500 dark:text-blue-400">
                                        {user.search_count || 0}
                                      </span>
                                      <span className="text-muted-foreground dark:text-gray-500">
                                        searches
                                      </span>
                                    </div>
                                    {user.last_sign_in_at && (
                                      <div className="mt-1 text-xs text-muted-foreground dark:text-gray-500">
                                        Last seen:{" "}
                                        {new Date(
                                          user.last_sign_in_at
                                        ).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground dark:text-gray-300">
                                  <div className="text-sm">
                                    <div>
                                      {new Date(
                                        user.created_at
                                      ).toLocaleDateString()}
                                    </div>
                                    {user.is_verified && (
                                      <div className="mt-1 text-xs text-emerald-500 dark:text-green-400">
                                        ✓ Verified
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Select
                                      value={user.role}
                                      onValueChange={(newRole) =>
                                        handleRoleUpdate(
                                          user.id,
                                          newRole as any
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-32 h-8 text-xs bg-background/80 border-border text-foreground dark:bg-white/5 dark:border-white/10 dark:text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user">
                                          User
                                        </SelectItem>
                                        <SelectItem value="admin">
                                          Admin
                                        </SelectItem>
                                        <SelectItem value="super_admin">
                                          Super Admin
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {user.id !== currentUser?.id &&
                                      (user.role === "user" || isSuperAdmin) && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 text-brand hover:text-brand hover:bg-brand/10"
                                              title="Sign in as this user"
                                              disabled={impersonatingUserId === user.id}
                                            >
                                              {impersonatingUserId === user.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                              ) : (
                                                <UserCog className="w-4 h-4" />
                                              )}
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="border border-border bg-background/95 text-foreground dark:bg-gray-900 dark:border-white/10 dark:text-white">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle className="text-foreground dark:text-white">
                                                Impersonate user?
                                              </AlertDialogTitle>
                                              <AlertDialogDescription className="text-muted-foreground dark:text-gray-400">
                                                You will be signed in as{" "}
                                                <strong>{user.full_name || user.email}</strong>{" "}
                                                and redirected to their dashboard. Use{" "}
                                                <strong>Exit impersonation</strong> in the banner
                                                when finished.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel className="border border-border bg-background/80 text-foreground hover:bg-accent dark:bg-white/5 dark:border-white/10 dark:text-white">
                                                Cancel
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => void handleImpersonate(user)}
                                                className="bg-brand hover:bg-brand/90"
                                              >
                                                Impersonate
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="border border-border bg-background/95 text-foreground dark:bg-gray-900 dark:border-white/10 dark:text-white">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-foreground dark:text-white">
                                            Delete User
                                          </AlertDialogTitle>
                                          <AlertDialogDescription className="text-muted-foreground dark:text-gray-400">
                                            Are you sure you want to delete{" "}
                                            {user.full_name}? This action cannot
                                            be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="border border-border bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              handleDeleteUser(user.id)
                                            }
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground dark:text-gray-400">
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total
                        )}{" "}
                        of {pagination.total} users
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: prev.page - 1,
                            }))
                          }
                          disabled={pagination.page <= 1}
                          className="border-border bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground dark:text-gray-400">
                          Page {pagination.page} of {pagination.pages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPagination((prev) => ({
                              ...prev,
                              page: prev.page + 1,
                            }))
                          }
                          disabled={pagination.page >= pagination.pages}
                          className="border-border bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
    </AdminPageContent>
  );
};

export default UserManagement;
