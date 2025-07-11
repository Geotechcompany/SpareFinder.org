import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import AdminDesktopSidebar from '@/components/AdminDesktopSidebar';
import MobileSidebar from '@/components/MobileSidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
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
  ChevronRight
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  company?: string;
  role: 'user' | 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
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
    pages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching users...');
      const response = await api.admin.getUsers(pagination.page, pagination.limit);
      
      console.log('📋 User fetch response:', response);
      
      if (response.success && response.data) {
        let filteredUsers = response.data.users || [];
        
        console.log('📋 Raw users from API:', filteredUsers);
        
        // Apply search filter
        if (searchTerm) {
          filteredUsers = filteredUsers.filter(user => 
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          console.log('📋 After search filter:', filteredUsers);
        }
        
        // Apply role filter
        if (roleFilter !== 'all') {
          filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
          console.log('📋 After role filter:', filteredUsers);
        }
        
        console.log('📋 Final filtered users:', filteredUsers);
        
        setUsers(filteredUsers);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 0
        }));
      } else {
        console.warn('❌ Invalid response format:', response);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    try {
      const response = await api.admin.updateUserRole(userId, newRole);
      
      if (response.success) {
        toast({
          title: "Role Updated",
          description: "User role has been updated successfully.",
        });
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
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
        throw new Error(response.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user. Please try again.",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return Crown;
      case 'admin': return Shield;
      default: return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
      case 'admin': return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
      default: return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
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
            ease: "linear"
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
            ease: "easeInOut"
          }}
        />
      </div>

      <AdminDesktopSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />
      
      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Mobile Menu Button */}
      <button 
        onClick={handleToggleMobileMenu}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{ 
          marginLeft: isCollapsed ? '80px' : '320px',
          width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 320px)'
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
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-gray-400 mt-2">
                Manage system users and their permissions
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 border-purple-500/30">
                <Users className="w-3 h-3 mr-1" />
                {pagination.total} Total Users
              </Badge>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search users by name, email, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>System Users</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-gray-300">User</TableHead>
                          <TableHead className="text-gray-300">Company</TableHead>
                          <TableHead className="text-gray-300">Role</TableHead>
                          <TableHead className="text-gray-300">Joined</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="text-gray-400">
                                {searchTerm || roleFilter !== 'all' ? (
                                  <div>
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No users found matching your criteria.</p>
                                    <p className="text-sm mt-1">Try adjusting your search or filters.</p>
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
                              <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-white">{user.full_name}</div>
                                    <div className="text-sm text-gray-400">{user.email}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-300">
                                  {user.company || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className={getRoleColor(user.role)}>
                                    <RoleIcon className="w-3 h-3 mr-1" />
                                    {user.role.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-300">
                                  {new Date(user.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Select
                                      value={user.role}
                                      onValueChange={(newRole) => handleRoleUpdate(user.id, newRole as any)}
                                    >
                                      <SelectTrigger className="w-32 h-8 bg-white/5 border-white/10 text-white text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
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
                                      <AlertDialogContent className="bg-gray-900 border-white/10">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
                                          <AlertDialogDescription className="text-gray-400">
                                            Are you sure you want to delete {user.full_name}? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteUser(user.id)}
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
                      <div className="text-sm text-gray-400">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page <= 1}
                          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-gray-400">
                          Page {pagination.page} of {pagination.pages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page >= pagination.pages}
                          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
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