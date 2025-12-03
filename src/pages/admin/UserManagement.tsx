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
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import MobileSidebar from "@/components/MobileSidebar";
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
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // Reset to page 1 when search or filter changes
      if (searchTerm || roleFilter !== "all") {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
      fetchUsers();
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, roleFilter]);

  // Separate effect for pagination changes (no debounce needed)
  useEffect(() => {
    fetchUsers();
  }, [pagination.page]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log("🔍 Fetching users with filters:", {
        searchTerm,
        roleFilter,
        page: pagination.page,
      });

      const response = await api.admin.getUsers(
        pagination.page,
        pagination.limit,
        searchTerm,
        roleFilter
      );

      console.log("📋 User fetch response:", response);

      if (response.success && response.data) {
        const data = response.data as any;
        const fetchedUsers = (data.users || []) as UserData[];
        const apiPagination = data.pagination || {};

        console.log("📋 Fetched users from API:", fetchedUsers);
        console.log("📋 Pagination from API:", apiPagination);

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
        console.warn("❌ Invalid response format:", response);
        // Set empty users array if response is invalid
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

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await api.admin.deleteUser(userId);

      if (response.success) {
        toast({
          title: "User Deleted",
          description: "User has been deleted successfully.",
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-500/30";
      case "admin":
        return "bg-purple-600/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-blue-600/20 text-blue-400 border-blue-500/30";
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-40"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <AdminDesktopSidebar
        isCollapsed={isCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Button */}
      <button
        onClick={handleToggleMobileMenu}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg border border-border bg-card/90 text-muted-foreground shadow-soft-elevated backdrop-blur-xl hover:bg-accent hover:text-accent-foreground md:hidden dark:bg-black/70 dark:border-white/10 dark:text-white"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{
          marginLeft: isCollapsed ? "80px" : "320px",
          width: isCollapsed ? "calc(100% - 80px)" : "calc(100% - 320px)",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">
                User Management
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage system users and their permissions
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                className="bg-purple-600/20 text-purple-400 border-purple-500/30"
              >
                <Users className="w-3 h-3 mr-1" />
                {pagination.total} Total Users
              </Badge>
            </div>
          </div>

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
                <Users className="w-5 h-5 text-purple-500 dark:text-purple-400" />
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60 dark:border-white/10">
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            User
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Company
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Role
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
                              <TableCell colSpan={6} className="py-8 text-center">
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
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UserManagement;
