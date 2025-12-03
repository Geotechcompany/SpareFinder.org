import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminDesktopSidebar from '@/components/AdminDesktopSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
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
  Globe,
  Loader2
} from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  details: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AuditLogs = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const { toast } = useToast();
  
  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, selectedLevel, selectedUser, selectedAction]);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching audit logs from database...');

      const response = await api.admin.getAuditLogs(page, 50);

      if (response.success && response.data) {
        console.log('✅ Audit logs response:', response.data);
        
        // Handle different possible response structures
        let auditLogs: AuditLog[] = [];
        
        if (Array.isArray(response.data)) {
          // Direct array response
          auditLogs = response.data;
        } else if (response.data.logs && Array.isArray(response.data.logs)) {
          // Nested logs array
          auditLogs = response.data.logs;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Double nested data
          auditLogs = response.data.data;
        }
        
        // Handle backend response format with success flag
        if (response.data.success && response.data.logs) {
          auditLogs = response.data.logs;
        }

        // Transform the data to match our interface
        const transformedLogs: AuditLog[] = auditLogs.map((log: any) => ({
          id: log.id || log.audit_id || `log-${Date.now()}-${Math.random()}`,
          user_id: log.user_id || log.userId || 'unknown',
          action: log.action || log.event_type || log.activity || 'Unknown action',
          resource_type: log.resource_type || log.category || log.type || 'general',
          details: log.details || log.metadata || log.description || {},
          created_at: log.created_at || log.timestamp || new Date().toISOString(),
          profiles: log.profiles ? {
            full_name: log.profiles.full_name || log.profiles.name || 'Unknown User',
            email: log.profiles.email || 'unknown@example.com'
          } : undefined
        }));

        setLogs(transformedLogs);
        
        // Set pagination info
        const pagination = response.data.pagination;
        if (pagination && pagination.pages) {
          setTotalPages(pagination.pages);
        } else {
          setTotalPages(Math.ceil(transformedLogs.length / 50));
        }

        console.log(`📊 Loaded ${transformedLogs.length} audit logs`);
      } else {
        console.warn('❌ No audit logs data received or request failed');
        // Set empty array instead of throwing error
        setLogs([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('❌ Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      setLogs([]); // Set empty array on error
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load audit logs. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logStats = {
    total: logs.length,
    today: logs.filter(log => {
      const logDate = new Date(log.created_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length,
    errors: logs.filter(log => log.action.toLowerCase().includes('error') || log.action.toLowerCase().includes('failed')).length,
    warnings: logs.filter(log => log.action.toLowerCase().includes('warning') || log.action.toLowerCase().includes('alert')).length
  };

  const getLevelFromAction = (action: string) => {
    if (action.toLowerCase().includes('error') || action.toLowerCase().includes('failed')) return 'error';
    if (action.toLowerCase().includes('warning') || action.toLowerCase().includes('alert')) return 'warning';
    if (action.toLowerCase().includes('success') || action.toLowerCase().includes('completed')) return 'success';
    return 'info';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-600/20 dark:text-red-300 dark:border-red-500/30';
      case 'warning':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-yellow-600/20 dark:text-yellow-300 dark:border-yellow-500/30';
      case 'success':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-green-600/20 dark:text-green-300 dark:border-green-500/30';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/30';
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
    switch (category.toLowerCase()) {
      case 'security':
      case 'auth':
      case 'login':
        return <Shield className="w-4 h-4 text-red-400" />;
      case 'upload':
      case 'file':
        return <Upload className="w-4 h-4 text-blue-400" />;
      case 'system':
      case 'database':
        return <Database className="w-4 h-4 text-purple-400" />;
      case 'configuration':
      case 'settings':
        return <Settings className="w-4 h-4 text-green-400" />;
      case 'maintenance':
      case 'activity':
        return <Activity className="w-4 h-4 text-orange-400" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (typeof log.details === 'string' ? log.details.toLowerCase().includes(searchTerm.toLowerCase()) : false);
    
    return matchesSearch;
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDetailsString = (details: any) => {
    if (typeof details === 'string') return details;
    if (typeof details === 'object' && details !== null) {
      return details.description || JSON.stringify(details);
    }
    return 'No details available';
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl opacity-60"
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl opacity-40"
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
      
      <motion.div
        initial={false}
        animate={{ 
          marginLeft: isCollapsed ? '80px' : '320px',
          width: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 320px)'
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 blur-xl opacity-70 dark:from-blue-600/10 dark:to-purple-600/10" />
            <div className="relative rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-soft-elevated px-4 py-4 sm:px-6 sm:py-6 dark:bg-black/20 dark:border-white/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">
                    Audit Logs
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Monitor system activities and security events
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <ThemeToggle />
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-soft-elevated hover:from-blue-700 hover:to-purple-700">
                    <Download className="w-4 h-4 mr-2" />
                    Export Logs
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'Total Events', value: logStats.total, icon: Activity, color: 'from-blue-600 to-cyan-600' },
              { title: 'Today', value: logStats.today, icon: Calendar, color: 'from-green-600 to-emerald-600' },
              { title: 'Errors', value: logStats.errors, icon: AlertTriangle, color: 'from-red-600 to-rose-600' },
              { title: 'Warnings', value: logStats.warnings, icon: AlertTriangle, color: 'from-yellow-600 to-orange-600' }
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl group-hover:opacity-20 transition-opacity`} />
                <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated hover:border-primary/30 hover:shadow-lg dark:bg-black/40 dark:border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-foreground dark:text-white">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} shadow-lg`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <Card className="bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground dark:bg-white/5 dark:border-white/10 dark:text-white"
                  />
                </div>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="bg-card/80 border-border text-foreground hover:bg-muted dark:bg-white/5 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="bg-card/80 border-border text-foreground hover:bg-muted dark:bg-white/5 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="bg-card/80 border-border text-foreground hover:bg-muted dark:bg-white/5 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder="Filter by category" />
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
              </div>
            </CardContent>
          </Card>

          {/* Logs List */}
          <Card className="bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                <History className="w-5 h-5 text-blue-400" />
                <span>System Activity Logs</span>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/30"
                >
                  {filteredLogs.length} events
                </Badge>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Detailed system activity and security events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
                  <span className="ml-2 text-muted-foreground">
                    Loading audit logs...
                  </span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
                  <p className="mb-4 text-muted-foreground">{error}</p>
                  <Button onClick={fetchAuditLogs} variant="outline">
                    Try Again
                  </Button>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No audit logs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 rounded-xl bg-muted/80 border border-border/60 hover:bg-muted transition-all duration-300 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(log.resource_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-foreground dark:text-white truncate">
                                {log.action}
                              </h3>
                              <Badge
                                className={`${getLevelColor(
                                  getLevelFromAction(log.action)
                                )} text-xs font-medium`}
                              >
                                <div className="flex items-center space-x-1">
                                  {getLevelIcon(getLevelFromAction(log.action))}
                                  <span className="capitalize">{getLevelFromAction(log.action)}</span>
                                </div>
                              </Badge>
                            </div>
                            <p className="mb-3 text-sm text-muted-foreground">
                              {getDetailsString(log.details)}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{log.profiles?.full_name || log.profiles?.email || 'Unknown User'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTimestamp(log.created_at)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Globe className="w-3 h-3" />
                                <span>Unknown IP</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Info className="w-3 h-3" />
                                <span className="truncate">No User Agent</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!isLoading && !error && totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-border dark:border-white/10">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="border-border bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:bg-white/10"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="border-border bg-background/80 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:bg-white/10"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuditLogs; 