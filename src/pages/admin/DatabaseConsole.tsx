import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminDesktopSidebar from '@/components/AdminDesktopSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Database, Terminal, Play, History, Server, Code, FileText, Zap, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface DatabaseStats {
  totalTables: number;
  totalRecords: number;
  databaseSize: string;
  lastBackup: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

interface QueryHistory {
  id: string;
  query: string;
  timestamp: string;
  status: 'success' | 'error';
  executionTime?: number;
}

interface AdminStatsApiResponse {
  statistics?: {
    total_users?: number;
    total_searches?: number;
  };
}

const DatabaseConsole = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    fetchDatabaseStats();
    fetchQueryHistory();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch admin stats to get database information
      const response = await api.admin.getAdminStats();
      const statsData = (response.data as AdminStatsApiResponse | undefined)?.statistics;

      if (response.success && statsData) {
        const stats = statsData;
        setDbStats({
          totalTables: 12, // This would come from actual database metadata
          totalRecords: stats.total_users + stats.total_searches,
          databaseSize: '2.4 GB', // This would come from database size query
          lastBackup: new Date().toISOString(),
          connectionStatus: 'connected'
        });
      }
    } catch (err) {
      console.error('Error fetching database stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch database stats');
      setDbStats({
        totalTables: 0,
        totalRecords: 0,
        databaseSize: 'Unknown',
        lastBackup: 'Unknown',
        connectionStatus: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQueryHistory = async () => {
    try {
      // For now, we'll use mock data since we don't have a query history endpoint
      // In a real implementation, you would call: const response = await apiClient.getQueryHistory();
      
      setQueryHistory([
        {
          id: '1',
          query: 'SELECT COUNT(*) FROM profiles',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          status: 'success',
          executionTime: 45
        },
        {
          id: '2',
          query: 'SELECT * FROM part_searches ORDER BY created_at DESC LIMIT 10',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          status: 'success',
          executionTime: 120
        },
        {
          id: '3',
          query: 'UPDATE profiles SET updated_at = NOW() WHERE role = \'admin\'',
          timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          status: 'success',
          executionTime: 78
        },
        {
          id: '4',
          query: 'DELETE FROM expired_sessions WHERE created_at < NOW() - INTERVAL \'7 days\'',
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          status: 'success',
          executionTime: 234
        }
      ]);
    } catch (err) {
      console.error('Error fetching query history:', err);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a query to execute.",
      });
      return;
    }

    try {
      setIsExecuting(true);
      setQueryResult(null);

      // For security reasons, we would typically not allow direct SQL execution
      // This would be replaced with specific API endpoints for safe operations
      // const response = await apiClient.executeQuery(query);
      
      // Simulating query execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock result based on query type
      if (query.toLowerCase().includes('select')) {
        setQueryResult({
          type: 'select',
          rows: [
            { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'admin' },
            { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user' }
          ],
          rowCount: 3,
          executionTime: 89
        });
      } else {
        setQueryResult({
          type: 'modify',
          message: 'Query executed successfully',
          affectedRows: 1,
          executionTime: 45
        });
      }

      // Add to history
      const newHistoryItem: QueryHistory = {
        id: Date.now().toString(),
        query: query.trim(),
        timestamp: new Date().toISOString(),
        status: 'success',
        executionTime: Math.floor(Math.random() * 200) + 50
      };
      
      setQueryHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);

      toast({
        title: "Query executed",
        description: "Query completed successfully.",
      });
    } catch (err) {
      console.error('Error executing query:', err);
      toast({
        variant: "destructive",
        title: "Query failed",
        description: "Failed to execute query. Please check your syntax.",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return date.toLocaleDateString();
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
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full border border-blue-500/30 backdrop-blur-xl mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Database className="w-4 h-4 text-blue-400" />
                    </motion.div>
                    <span className="text-blue-300 text-sm font-semibold">Database Management</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Database Console
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Execute queries and manage database operations
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center space-x-3"
                >
                  <Badge className="bg-green-600/20 text-green-300 border-green-500/30 px-3 py-1">
                    <Server className="w-4 h-4 mr-2" />
                    Connected
                  </Badge>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query Editor */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Terminal className="w-5 h-5 text-blue-400" />
                    <span>Query Editor</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Write and execute SQL queries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    className="w-full h-48 bg-white/5 border border-white/10 text-white p-4 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 placeholder:text-gray-400 resize-none"
                    placeholder="SELECT * FROM profiles WHERE role = 'admin';"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                        <Code className="w-3 h-3 mr-1" />
                        SQL
                      </Badge>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 rounded-xl">
                        <Play className="w-4 h-4 mr-2" />
                        Execute Query
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Query History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-pink-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <History className="w-5 h-5 text-purple-400" />
                    <span>Query History</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Recent database queries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { query: "SELECT COUNT(*) FROM profiles", time: "2 min ago", status: "success" },
                      { query: "UPDATE profiles SET role = 'admin'", time: "5 min ago", status: "success" },
                      { query: "SELECT * FROM part_searches LIMIT 10", time: "8 min ago", status: "success" },
                      { query: "DELETE FROM expired_sessions", time: "12 min ago", status: "success" }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <code className="text-blue-300 text-sm font-mono truncate block">
                              {item.query}
                            </code>
                            <p className="text-gray-400 text-xs mt-1">{item.time}</p>
                          </div>
                          <Badge className="bg-green-600/20 text-green-300 border-green-500/30 text-xs ml-2">
                            {item.status}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Query Results */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-green-400" />
                  <span>Query Results</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Results from your last executed query
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No query executed yet</p>
                  <p className="text-gray-500 text-sm">Execute a query to see results here</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DatabaseConsole; 