import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AdminSidebar from '@/components/AdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  History, 
  User, 
  Shield, 
  Clock, 
  Search,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Settings,
  Lock,
  Trash,
  Edit,
  Upload,
  Database,
  Activity,
  Calendar,
  Globe
} from 'lucide-react';

const AuditLogs = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  
  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const [logs] = useState([
    { 
      id: 1, 
      user: 'admin', 
      email: 'admin@geotech.com',
      action: 'Modified user permissions', 
      timestamp: '2024-01-15 14:30:25',
      level: 'warning',
      ip: '192.168.1.100',
      userAgent: 'Chrome 120.0.0.0',
      details: 'Changed user role from "user" to "admin" for john@example.com',
      category: 'security'
    },
    { 
      id: 2, 
      user: 'john.doe', 
      email: 'john@geotech.com',
      action: 'Uploaded new part analysis', 
      timestamp: '2024-01-15 14:15:12',
      level: 'info',
      ip: '192.168.1.101',
      userAgent: 'Firefox 119.0',
      details: 'Uploaded part analysis for bearing #BRG-001 with 94.2% confidence',
      category: 'upload'
    },
    { 
      id: 3, 
      user: 'system', 
      email: 'system@geotech.com',
      action: 'Performed automated backup', 
      timestamp: '2024-01-15 03:00:00',
      level: 'success',
      ip: 'localhost',
      userAgent: 'System Process',
      details: 'Daily database backup completed successfully (2.4GB)',
      category: 'system'
    },
    { 
      id: 4, 
      user: 'jane.smith', 
      email: 'jane@geotech.com',
      action: 'Failed login attempt', 
      timestamp: '2024-01-15 13:45:33',
      level: 'error',
      ip: '203.0.113.45',
      userAgent: 'Safari 17.1.2',
      details: 'Invalid password attempt from suspicious IP address',
      category: 'security'
    },
    { 
      id: 5, 
      user: 'mike.wilson', 
      email: 'mike@geotech.com',
      action: 'Updated AI model configuration', 
      timestamp: '2024-01-15 12:20:15',
      level: 'info',
      ip: '192.168.1.102',
      userAgent: 'Chrome 120.0.0.0',
      details: 'Modified GPT-4 API settings and increased rate limits',
      category: 'configuration'
    },
    { 
      id: 6, 
      user: 'system', 
      email: 'system@geotech.com',
      action: 'Database maintenance completed', 
      timestamp: '2024-01-15 11:30:00',
      level: 'success',
      ip: 'localhost',
      userAgent: 'System Process',
      details: 'Optimized database tables and rebuilt indexes',
      category: 'maintenance'
    }
  ]);

  const logStats = {
    total: logs.length,
    today: logs.filter(log => log.timestamp.startsWith('2024-01-15')).length,
    errors: logs.filter(log => log.level === 'error').length,
    warnings: logs.filter(log => log.level === 'warning').length
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-600/20 text-red-300 border-red-500/30';
      case 'warning':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      case 'success':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      default:
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="w-4 h-4 text-red-400" />;
      case 'upload':
        return <Upload className="w-4 h-4 text-blue-400" />;
      case 'system':
        return <Database className="w-4 h-4 text-purple-400" />;
      case 'configuration':
        return <Settings className="w-4 h-4 text-green-400" />;
      case 'maintenance':
        return <Activity className="w-4 h-4 text-orange-400" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    const matchesUser = selectedUser === 'all' || log.user === selectedUser;
    const matchesAction = selectedAction === 'all' || log.category === selectedAction;
    
    return matchesSearch && matchesLevel && matchesUser && matchesAction;
  });

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
                      <History className="w-4 h-4 text-red-400" />
                    </motion.div>
                    <span className="text-red-300 text-sm font-semibold">System Logs</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-red-100 to-rose-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Audit Logs
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Monitor system activities and security events
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center space-x-3"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button variant="outline" className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { 
                label: 'Total Logs', 
                value: logStats.total, 
                icon: History, 
                color: 'from-blue-600 to-cyan-600' 
              },
              { 
                label: 'Today', 
                value: logStats.today, 
                icon: Calendar, 
                color: 'from-green-600 to-emerald-600' 
              },
              { 
                label: 'Errors', 
                value: logStats.errors, 
                icon: AlertTriangle, 
                color: 'from-red-600 to-rose-600' 
              },
              { 
                label: 'Warnings', 
                value: logStats.warnings, 
                icon: AlertTriangle, 
                color: 'from-yellow-600 to-orange-600' 
              }
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

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-blue-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-purple-400" />
                  <span>Filters & Search</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-4 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 rounded-xl"
                    />
                  </div>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="john.doe">John Doe</SelectItem>
                      <SelectItem value="jane.smith">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="configuration">Configuration</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedLevel('all');
                      setSelectedUser('all');
                      setSelectedAction('all');
                    }}
                    variant="outline"
                    className="h-12 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Logs Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-600/5 to-slate-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <History className="w-5 h-5 text-blue-400" />
                    <span>Audit Trail ({filteredLogs.length} entries)</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 + index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(log.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-white truncate">{log.action}</h3>
                              <Badge className={`${getLevelColor(log.level)} text-xs font-medium`}>
                                <div className="flex items-center space-x-1">
                                  {getLevelIcon(log.level)}
                                  <span className="capitalize">{log.level}</span>
                                </div>
                              </Badge>
                            </div>
                            <p className="text-gray-300 text-sm mb-3">{log.details}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-gray-400">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{log.user}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{log.timestamp}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Globe className="w-3 h-3" />
                                <span>{log.ip}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Info className="w-3 h-3" />
                                <span className="truncate">{log.userAgent}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-4"
                        >
                          <Eye className="w-4 h-4 text-blue-400" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {filteredLogs.length === 0 && (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">No logs found matching your criteria</p>
                      <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuditLogs; 