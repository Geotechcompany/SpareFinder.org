import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '@/components/AdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Shield, 
  Search, 
  Edit, 
  Trash, 
  Plus, 
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Activity,
  UserCheck,
  UserX,
  Crown,
  Sparkles
} from 'lucide-react';

const UserManagement = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const users = [
    { 
      id: 1, 
      name: 'John Doe', 
      email: 'john@geotech.com', 
      role: 'admin', 
      status: 'active',
      lastLogin: '2024-01-15 14:32',
      uploads: 1247,
      joinDate: '2023-03-15'
    },
    { 
      id: 2, 
      name: 'Sarah Smith', 
      email: 'sarah@geotech.com', 
      role: 'pro', 
      status: 'active',
      lastLogin: '2024-01-14 09:15',
      uploads: 892,
      joinDate: '2023-05-22'
    },
    { 
      id: 3, 
      name: 'Mike Johnson', 
      email: 'mike@techcorp.com', 
      role: 'free', 
      status: 'suspended',
      lastLogin: '2024-01-10 16:45',
      uploads: 23,
      joinDate: '2023-12-08'
    },
    { 
      id: 4, 
      name: 'Emily Chen', 
      email: 'emily@designstudio.com', 
      role: 'pro', 
      status: 'active',
      lastLogin: '2024-01-15 11:28',
      uploads: 634,
      joinDate: '2023-07-10'
    },
    { 
      id: 5, 
      name: 'David Wilson', 
      email: 'david@manufacturing.co.uk', 
      role: 'enterprise', 
      status: 'active',
      lastLogin: '2024-01-15 13:56',
      uploads: 2103,
      joinDate: '2023-01-20'
    }
  ];

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    suspendedUsers: users.filter(u => u.status === 'suspended').length,
    proUsers: users.filter(u => u.role === 'pro' || u.role === 'enterprise').length
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || user.status === selectedFilter || user.role === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600/20 text-red-300 border-red-500/30';
      case 'enterprise':
        return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
      case 'pro':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'suspended':
        return 'bg-red-600/20 text-red-300 border-red-500/30';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'enterprise':
        return <Shield className="w-4 h-4" />;
      case 'pro':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-red-600/15 rounded-full blur-3xl opacity-60"
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl opacity-40"
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

      <AdminSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />
      
      <motion.div
        initial={false}
        animate={{ marginLeft: isCollapsed ? 80 : 320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-4 lg:p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-rose-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-full border border-red-500/30 backdrop-blur-xl mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Users className="w-4 h-4 text-red-400" />
                    </motion.div>
                    <span className="text-red-300 text-sm font-semibold">User Management</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-red-100 to-rose-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    User Management
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Manage system users and permissions
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/25 h-12 px-6">
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-blue-600 to-cyan-600' },
              { label: 'Active Users', value: stats.activeUsers, icon: UserCheck, color: 'from-green-600 to-emerald-600' },
              { label: 'Pro Users', value: stats.proUsers, icon: Crown, color: 'from-purple-600 to-violet-600' },
              { label: 'Suspended', value: stats.suspendedUsers, icon: UserX, color: 'from-red-600 to-rose-600' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl`} />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-rose-600/5 rounded-2xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-red-400/50 rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['all', 'active', 'suspended', 'admin', 'pro', 'free'].map((filter) => (
                      <Button
                        key={filter}
                        variant={selectedFilter === filter ? "default" : "outline"}
                        onClick={() => setSelectedFilter(filter)}
                        className={`${
                          selectedFilter === filter
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                        } capitalize rounded-xl`}
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Users Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-rose-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-red-400" />
                  <span>Users ({filteredUsers.length})</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">User</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Activity</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Uploads</th>
                        <th className="px-4 py-3 text-right text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, index) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1 + index * 0.05 }}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-white">{user.name}</div>
                                <div className="text-gray-400 text-sm">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={`${getRoleColor(user.role)} font-medium`}>
                              <div className="flex items-center space-x-1">
                                {getRoleIcon(user.role)}
                                <span className="capitalize">{user.role}</span>
                              </div>
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={`${getStatusColor(user.status)} font-medium`}>
                              <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  user.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                                }`} />
                                <span className="capitalize">{user.status}</span>
                              </div>
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-white text-sm">{user.lastLogin}</div>
                            <div className="text-gray-400 text-xs">Joined {user.joinDate}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-white font-medium">{user.uploads.toLocaleString()}</div>
                            <div className="text-gray-400 text-xs">total uploads</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4 text-blue-400" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Trash className="w-4 h-4 text-red-400" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UserManagement; 