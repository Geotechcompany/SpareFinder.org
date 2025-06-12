import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Check,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Settings,
  Mail,
  Smartphone,
  Clock,
  Filter,
  CheckCheck,
  Sparkles,
  Zap,
  Upload,
  TrendingUp,
  Target
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const Notifications = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [readNotifications, setReadNotifications] = useState<Set<number>>(new Set());

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const notifications = [
    {
      id: 1,
      type: 'success',
      title: 'Part Successfully Identified',
      message: 'Your brake pad set has been identified with 98.2% confidence',
      timestamp: '2 minutes ago',
      unread: true,
      icon: CheckCircle,
      color: 'from-green-600 to-emerald-600'
    },
    {
      id: 2,
      type: 'info',
      title: 'New Feature Available',
      message: 'Enhanced AI model now supports motorcycle parts identification',
      timestamp: '1 hour ago',
      unread: true,
      icon: Zap,
      color: 'from-blue-600 to-cyan-600'
    },
    {
      id: 3,
      type: 'warning',
      title: 'Low Confidence Result',
      message: 'Part identification completed with 73% confidence. Manual review recommended.',
      timestamp: '3 hours ago',
      unread: true,
      icon: AlertTriangle,
      color: 'from-yellow-600 to-orange-600'
    },
    {
      id: 4,
      type: 'success',
      title: 'Upload Limit Increased',
      message: 'Your monthly upload limit has been increased to 1,000 parts',
      timestamp: '1 day ago',
      unread: false,
      icon: TrendingUp,
      color: 'from-purple-600 to-pink-600'
    },
    {
      id: 5,
      type: 'info',
      title: 'Weekly Report Ready',
      message: 'Your weekly analysis report is ready for download',
      timestamp: '2 days ago',
      unread: false,
      icon: Target,
      color: 'from-indigo-600 to-purple-600'
    },
    {
      id: 6,
      type: 'success',
      title: 'Achievement Unlocked',
      message: 'Congratulations! You\'ve reached 95% accuracy rate',
      timestamp: '3 days ago',
      unread: false,
      icon: CheckCircle,
      color: 'from-green-600 to-emerald-600'
    }
  ];

  const notificationSettings = [
    {
      key: 'email_uploads',
      title: 'Upload Notifications',
      description: 'Get notified when your uploads are processed',
      icon: Upload,
      color: 'from-blue-600 to-cyan-600',
      enabled: true
    },
    {
      key: 'email_reports',
      title: 'Weekly Reports',
      description: 'Receive weekly analysis reports',
      icon: TrendingUp,
      color: 'from-green-600 to-emerald-600',
      enabled: true
    },
    {
      key: 'email_features',
      title: 'New Features',
      description: 'Be first to know about new features',
      icon: Zap,
      color: 'from-purple-600 to-blue-600',
      enabled: false
    },
    {
      key: 'sms_urgent',
      title: 'Urgent Alerts',
      description: 'Critical notifications via SMS',
      icon: AlertTriangle,
      color: 'from-orange-600 to-red-600',
      enabled: false
    }
  ];

  const filteredNotifications = notifications.filter(notification => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return notification.unread && !readNotifications.has(notification.id);
    return notification.type === selectedFilter;
  });

  const unreadCount = notifications.filter(n => n.unread && !readNotifications.has(n.id)).length;

  const markAsRead = (id: number) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => n.unread).map(n => n.id);
    setReadNotifications(prev => new Set([...prev, ...unreadIds]));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Bell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'from-green-600 to-emerald-600';
      case 'warning':
        return 'from-yellow-600 to-orange-600';
      case 'info':
        return 'from-blue-600 to-cyan-600';
      default:
        return 'from-gray-600 to-gray-700';
    }
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

      <DashboardSidebar isCollapsed={isCollapsed} onToggle={handleToggleSidebar} />

      {/* Main Content */}
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
          className="space-y-6 lg:space-y-8 max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </motion.div>
                    <span className="text-purple-300 text-sm font-semibold">Notifications Center</span>
                  </motion.div>
                  <div className="flex items-center space-x-3 mb-3">
                    <motion.h1 
                      className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Notifications
                    </motion.h1>
                    {unreadCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-8 h-8 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center"
                      >
                        <span className="text-white text-sm font-bold">{unreadCount}</span>
                      </motion.div>
                    )}
                  </div>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Stay updated with your part identification activities
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex space-x-3"
                >
                  {unreadCount > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                                             <Button 
                         onClick={markAllAsRead}
                         variant="outline" 
                         className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30 h-12 px-6"
                       >
                         <CheckCheck className="w-4 h-4 mr-2" />
                         Mark All Read
                       </Button>
                    </motion.div>
                  )}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-2 border border-white/10">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All', count: notifications.length },
                  { id: 'unread', label: 'Unread', count: unreadCount },
                  { id: 'success', label: 'Success', count: notifications.filter(n => n.type === 'success').length },
                  { id: 'warning', label: 'Warnings', count: notifications.filter(n => n.type === 'warning').length },
                  { id: 'info', label: 'Info', count: notifications.filter(n => n.type === 'info').length }
                ].map((filter, index) => (
                  <motion.button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`relative flex items-center space-x-2 px-4 py-3 rounded-2xl transition-all duration-300 ${
                      selectedFilter === filter.id
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    {selectedFilter === filter.id && (
                      <motion.div
                        layoutId="activeFilterTab"
                        className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-blue-600/20 rounded-2xl border border-purple-500/30 backdrop-blur-xl"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center space-x-2">
                      <span className="font-medium">{filter.label}</span>
                      <Badge variant="secondary" className="bg-white/10 text-gray-300 border-white/20">
                        {filter.count}
                      </Badge>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Notifications List */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="lg:col-span-2 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-blue-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Bell className="w-5 h-5 text-purple-400" />
                      <span>Recent Notifications ({filteredNotifications.length})</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredNotifications.map((notification, index) => {
                        const isRead = !notification.unread || readNotifications.has(notification.id);
                        const Icon = notification.icon;
                        
                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className={`relative group p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                              isRead 
                                ? 'bg-white/5 border-white/10 opacity-70' 
                                : 'bg-white/10 border-white/20 hover:bg-white/15'
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${notification.color} flex-shrink-0`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-white font-medium truncate">{notification.title}</h4>
                                  <div className="flex items-center space-x-2">
                                    {!isRead && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                    )}
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white/10 transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                    >
                                      <X className="w-4 h-4 text-gray-400" />
                                    </motion.button>
                                  </div>
                                </div>
                                <p className="text-gray-400 text-sm mb-2">{notification.message}</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500 text-xs">{notification.timestamp}</span>
                                  {isRead && (
                                    <span className="text-green-400 text-xs flex items-center">
                                      <Check className="w-3 h-3 mr-1" />
                                      Read
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    
                    {filteredNotifications.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        </motion.div>
                        <p className="text-gray-300 text-lg mb-2">No notifications found</p>
                        <p className="text-gray-400">Try adjusting your filter or check back later</p>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notification Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-blue-400" />
                    <span>Preferences</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your notification settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {notificationSettings.map((setting, index) => (
                    <motion.div
                      key={setting.key}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 bg-gradient-to-r ${setting.color} rounded-xl flex items-center justify-center`}>
                            <setting.icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{setting.title}</h4>
                            <p className="text-gray-400 text-sm">{setting.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={() => {}}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                    </motion.div>
                  ))}

                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-white font-medium mb-4">Delivery Methods</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-blue-400" />
                          <span className="text-white">Email</span>
                        </div>
                        <Switch checked={true} className="data-[state=checked]:bg-purple-600" />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center space-x-3">
                          <Smartphone className="w-5 h-5 text-green-400" />
                          <span className="text-white">SMS</span>
                        </div>
                        <Switch checked={false} className="data-[state=checked]:bg-purple-600" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Notifications;
