import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { adminApi } from "../../lib/api";
import AdminDesktopSidebar from "../AdminDesktopSidebar";
import { ADMIN_MOBILE_TOP_PADDING, useAdminMainMotion } from "@/lib/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Search,
  Users,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { CardSkeleton, TableSkeleton } from "../skeletons";

interface Subscriber {
  id: string;
  user_id: string;
  tier: "free" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due" | "unpaid" | "trialing";
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    email: string;
    full_name: string;
    company?: string;
    created_at: string;
    updated_at: string;
  };
}

interface SubscriptionStats {
  total: number;
  by_tier: {
    free: number;
    pro: number;
    enterprise: number;
  };
  by_status: {
    active: number;
    canceled: number;
    past_due: number;
    unpaid: number;
    trialing: number;
  };
}

const SubscribersManagement: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainMotion = useAdminMainMotion(sidebarCollapsed);
  const [selectedSubscriber, setSelectedSubscriber] =
    useState<Subscriber | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📊 Fetching subscribers...");
      const response = await adminApi.getSubscribers(
        currentPage,
        20,
        tierFilter,
        statusFilter
      );

      if (response.success && response.data) {
        console.log("📊 Subscribers fetched successfully:", response.data);
        const data = response.data as any;
        const subscribersData = data.subscribers || [];
        console.log("📊 Setting subscribers:", subscribersData);
        console.log("📊 Setting stats:", data.statistics);
        setSubscribers(subscribersData);
        setStats(data.statistics);
        setTotalPages(data.pagination?.pages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        console.log("📊 API response failed:", response);
        throw new Error(response.message || "Failed to fetch subscribers");
      }
    } catch (err) {
      console.error("📊 Error fetching subscribers:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch subscribers"
      );
    } finally {
      console.log("📊 Setting loading to false");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [currentPage, tierFilter, statusFilter]);

  const filteredSubscribers = subscribers.filter((subscriber) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      subscriber.profiles.email.toLowerCase().includes(searchLower) ||
      subscriber.profiles.full_name.toLowerCase().includes(searchLower) ||
      subscriber.profiles.company?.toLowerCase().includes(searchLower) ||
      subscriber.tier.toLowerCase().includes(searchLower) ||
      subscriber.status.toLowerCase().includes(searchLower)
    );
  });

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-gray-100 text-gray-800";
      case "pro":
        return "bg-blue-100 text-blue-800";
      case "enterprise":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "trialing":
        return "bg-blue-100 text-blue-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      case "past_due":
        return "bg-yellow-100 text-yellow-800";
      case "unpaid":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const handleViewDetails = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setIsDetailsModalOpen(true);
  };

  console.log("📊 Render state:", {
    loading,
    subscribersCount: subscribers.length,
    stats,
    error,
  });

  if (loading) {
    console.log("📊 Rendering skeleton loader");
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226]">
        <AdminDesktopSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <motion.div
          className={`flex flex-1 flex-col ${ADMIN_MOBILE_TOP_PADDING}`}
          initial={false}
          animate={mainMotion}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="border-b border-border bg-card px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground dark:text-white sm:text-2xl">
                  Subscribers Management
                </h1>
                <p className="text-sm text-muted-foreground dark:text-gray-300">
                  Manage user subscriptions and billing
                </p>
              </div>
              <Button onClick={fetchSubscribers} disabled={loading} className="shrink-0 self-start sm:self-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-6 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <CardSkeleton key={index} variant="stats" />
              ))}
            </div>
            <div className="p-2 sm:p-6">
              <TableSkeleton variant="detailed" rows={5} />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  console.log("📊 Rendering main content");
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226]">
      <AdminDesktopSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <motion.div
        initial={false}
        animate={mainMotion}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`flex flex-1 flex-col ${ADMIN_MOBILE_TOP_PADDING}`}
      >
        <div className="border-b border-border bg-card px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground dark:text-white sm:text-2xl">
                Subscribers Management
              </h1>
              <p className="text-sm text-muted-foreground dark:text-gray-300">
                Manage user subscriptions and billing
              </p>
            </div>
            <Button onClick={fetchSubscribers} disabled={loading} className="shrink-0 self-start sm:self-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-6 p-4 sm:p-6">
            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Subscribers
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pro Subscribers
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.by_tier.pro}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Enterprise
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.by_tier.enterprise}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Subscriptions
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.by_status.active}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search subscribers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setTierFilter("all");
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Error State */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="text-red-800">
                    <p className="font-medium">Error loading subscribers</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subscribers Table (desktop) */}
            <div className="hidden lg:block">
            <Card>
              <CardHeader>
                <CardTitle>Subscribers ({totalCount})</CardTitle>
                <CardDescription>
                  Showing {filteredSubscribers.length} of {totalCount}{" "}
                  subscribers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="hidden sm:table-cell">
                          User
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Tier
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Status
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Period
                        </TableHead>
                        <TableHead className="hidden xl:table-cell">
                          Stripe ID
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Created
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscribers.map((subscriber) => (
                        <TableRow key={subscriber.id}>
                          <TableCell className="sm:table-cell">
                            <div>
                              <div className="font-medium">
                                {subscriber.profiles.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {subscriber.profiles.email}
                              </div>
                              {subscriber.profiles.company && (
                                <div className="text-sm text-gray-500">
                                  {subscriber.profiles.company}
                                </div>
                              )}
                              {/* Mobile view - show tier and status below name */}
                              <div className="sm:hidden mt-2 flex gap-2">
                                <Badge
                                  className={getTierBadgeColor(subscriber.tier)}
                                >
                                  {subscriber.tier}
                                </Badge>
                                <Badge
                                  className={getStatusBadgeColor(
                                    subscriber.status
                                  )}
                                >
                                  {subscriber.status}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              className={getTierBadgeColor(subscriber.tier)}
                            >
                              {subscriber.tier}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              className={getStatusBadgeColor(subscriber.status)}
                            >
                              {subscriber.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {subscriber.current_period_start &&
                            subscriber.current_period_end ? (
                              <div className="text-sm">
                                <div>
                                  {formatDate(subscriber.current_period_start)}
                                </div>
                                <div className="text-gray-500">
                                  to {formatDate(subscriber.current_period_end)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <div className="text-sm font-mono">
                              {subscriber.stripe_customer_id ? (
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Customer:
                                  </div>
                                  <div className="truncate max-w-32">
                                    {subscriber.stripe_customer_id}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-sm">
                              {formatDate(subscriber.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => handleViewDetails(subscriber)}
                              >
                                View Details
                              </Button>
                              {subscriber.cancel_at_period_end && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs w-fit"
                                >
                                  Canceling
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Subscribers list (small screens) */}
            <div className="lg:hidden">
            <Card>
          <CardHeader>
            <CardTitle>Subscribers ({totalCount})</CardTitle>
            <CardDescription>
              Showing {filteredSubscribers.length} of {totalCount} subscribers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredSubscribers.map((subscriber) => (
                <div
                  key={subscriber.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div>
                    <div className="font-medium text-lg">
                      {subscriber.profiles.full_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {subscriber.profiles.email}
                    </div>
                    {subscriber.profiles.company && (
                      <div className="text-sm text-gray-500">
                        {subscriber.profiles.company}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getTierBadgeColor(subscriber.tier)}>
                      {subscriber.tier}
                    </Badge>
                    <Badge className={getStatusBadgeColor(subscriber.status)}>
                      {subscriber.status}
                    </Badge>
                    {subscriber.cancel_at_period_end && (
                      <Badge variant="destructive" className="text-xs">
                        Canceling
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Created: {formatDate(subscriber.created_at)}</div>
                    {subscriber.current_period_start &&
                      subscriber.current_period_end && (
                        <div>
                          Period: {formatDate(subscriber.current_period_start)}{" "}
                          - {formatDate(subscriber.current_period_end)}
                        </div>
                      )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleViewDetails(subscriber)}
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </div>

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
            </div>
          </div>
        </motion.div>

      {/* Subscriber Details Modal */}
      {isDetailsModalOpen && selectedSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Subscriber Details
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Full Name
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedSubscriber.profiles.full_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedSubscriber.profiles.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Company
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedSubscriber.profiles.company || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tier
                  </label>
                  <Badge className={getTierBadgeColor(selectedSubscriber.tier)}>
                    {selectedSubscriber.tier}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </label>
                  <Badge
                    className={getStatusBadgeColor(selectedSubscriber.status)}
                  >
                    {selectedSubscriber.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Created At
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(selectedSubscriber.created_at)}
                  </p>
                </div>
                {selectedSubscriber.current_period_start &&
                  selectedSubscriber.current_period_end && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Current Period Start
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(selectedSubscriber.current_period_start)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Current Period End
                        </label>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(selectedSubscriber.current_period_end)}
                        </p>
                      </div>
                    </>
                  )}
                {selectedSubscriber.stripe_customer_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Stripe Customer ID
                    </label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {selectedSubscriber.stripe_customer_id}
                    </p>
                  </div>
                )}
                {selectedSubscriber.stripe_subscription_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Stripe Subscription ID
                    </label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {selectedSubscriber.stripe_subscription_id}
                    </p>
                  </div>
                )}
              </div>

              {selectedSubscriber.cancel_at_period_end && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    ⚠️ This subscription is set to cancel at the end of the
                    current period.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscribersManagement;
