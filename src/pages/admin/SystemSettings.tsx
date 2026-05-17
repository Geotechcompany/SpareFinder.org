import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminDesktopSidebar from '@/components/AdminDesktopSidebar';
import { AdminPageHeader, AdminPageHeaderToolbar } from '@/components/admin/AdminPageHeader';
import { ADMIN_MOBILE_TOP_PADDING, useAdminMainMotion } from '@/lib/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api';
import { Settings, Shield, Lock, Mail, Bell, Server, Database, Key, Globe, Save, Loader2, AlertTriangle } from 'lucide-react';

interface SystemSettings {
  security: {
    passwordMinLength: number;
    requireSpecialChars: boolean;
    sessionTimeout: number;
    twoFactorRequired: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpSecure: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    webhookUrl: string;
  };
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    logLevel: string;
    backupEnabled: boolean;
  };
}

const SystemSettings = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mainMotion = useAdminMainMotion(isCollapsed);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For now, we'll use default settings since the backend might not have this endpoint yet
      // In a real implementation, you would call: const response = await apiClient.getSystemSettings();
      
      // Simulating API call with default settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSettings({
        security: {
          passwordMinLength: 8,
          requireSpecialChars: true,
          sessionTimeout: 3600,
          twoFactorRequired: false,
        },
        email: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: 'admin@geotech.com',
          smtpSecure: true,
        },
        notifications: {
          emailEnabled: true,
          slackEnabled: false,
          webhookUrl: '',
        },
        system: {
          maintenanceMode: false,
          debugMode: false,
          logLevel: 'info',
          backupEnabled: true,
        },
      });
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system settings');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load system settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      
      // In a real implementation, you would call:
      // const response = await apiClient.updateSystemSettings(settings);
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Settings saved",
        description: "System settings have been updated successfully.",
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (category: keyof SystemSettings, key: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        [key]: value
      }
    }));
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand/10 rounded-full blur-3xl opacity-40"
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
        animate={mainMotion}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`flex-1 overflow-x-auto p-4 lg:p-8 relative z-10 ${ADMIN_MOBILE_TOP_PADDING}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 lg:space-y-8 max-w-7xl mx-auto"
        >
          <AdminPageHeader
            breadcrumbPage="Site settings"
            title="Settings"
            description="Security, email, and other options that apply across SpareFinder."
            actions={
              <AdminPageHeaderToolbar>
                <Badge className="h-9 shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100">
                  <Server className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Online
                </Badge>
              </AdminPageHeaderToolbar>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Settings */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-brand/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Shield className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <span>Security Settings</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Configure security policies and access controls
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">Password Policy</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Configure minimum password requirements
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">Session Management</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Set session timeout and security policies
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Enable 2FA for enhanced security
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Authentication */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-pink-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Lock className="w-5 h-5 text-brand dark:text-brand-light" />
                    <span>Authentication</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Configure authentication methods and providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">OAuth Providers</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Configure Google, GitHub, and other OAuth providers
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">LDAP Integration</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Connect to enterprise directory services
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">API Keys</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Manage API authentication tokens
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Email Configuration */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Mail className="w-5 h-5 text-emerald-500 dark:text-green-400" />
                    <span>Email Configuration</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Configure email server and notification settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">SMTP Settings</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Configure outgoing email server
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">Email Templates</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Customize notification email templates
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">Delivery Settings</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Configure email delivery preferences
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 to-red-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                    <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                    <span>Notifications</span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Configure system notifications and alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">Alert Thresholds</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Set system performance alert levels
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">Notification Channels</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Configure Slack, Discord, and webhook integrations
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/80 border border-border/60 dark:bg-white/5 dark:border-white/10">
                      <h4 className="mb-1 font-medium text-foreground dark:text-white">User Preferences</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        Default notification settings for users
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Save Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex justify-end space-x-4"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                className="rounded-xl border-border bg-background/80 text-foreground hover:bg-muted dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                Reset to Defaults
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button className="rounded-xl bg-gradient-to-r from-brand-dark to-brand text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-brand-dark">
                <Settings className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SystemSettings; 