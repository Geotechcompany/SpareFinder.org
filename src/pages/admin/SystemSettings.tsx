import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminPageHeader, AdminPageHeaderToolbar } from '@/components/admin/AdminPageHeader';
import { AdminPageContent } from "@/components/admin/AdminPageContent";
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
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

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

  if (isLoading) {
    return (
      <AdminPageContent>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminPageContent>
    );
  }

  return (
    <AdminPageContent>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto"
      >
        <AdminPageHeader
          breadcrumbPage="Settings"
          title="System settings"
          description="Security, email, notifications, and platform configuration."
          actions={
            <AdminPageHeaderToolbar>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={saveSettings}
                  disabled={isSaving || !settings}
                  className="rounded-xl bg-gradient-to-r from-brand-dark to-brand text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-brand-dark"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </motion.div>
            </AdminPageHeaderToolbar>
          }
        />

        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="flex items-center gap-3 p-4 text-red-600 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {settings && (
          <motion.div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>Password and session policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div className="space-y-2">
                  <Label htmlFor="password-min-length">Minimum password length</Label>
                  <Input
                    id="password-min-length"
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) =>
                      updateSetting('security', 'passwordMinLength', Number(e.target.value))
                    }
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="require-special-chars">Require special characters</Label>
                  <Switch
                    id="require-special-chars"
                    checked={settings.security.requireSpecialChars}
                    onCheckedChange={(checked) =>
                      updateSetting('security', 'requireSpecialChars', checked)
                    }
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="two-factor-required">Require two-factor auth</Label>
                  <Switch
                    id="two-factor-required"
                    checked={settings.security.twoFactorRequired}
                    onCheckedChange={(checked) =>
                      updateSetting('security', 'twoFactorRequired', checked)
                    }
                  />
                </motion.div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email
                </CardTitle>
                <CardDescription>SMTP connection settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP host</Label>
                  <Input
                    id="smtp-host"
                    value={settings.email.smtpHost}
                    onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
                  />
                </motion.div>
                <motion.div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(e) => updateSetting('email', 'smtpPort', Number(e.target.value))}
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="smtp-secure">Use TLS/SSL</Label>
                  <Switch
                    id="smtp-secure"
                    checked={settings.email.smtpSecure}
                    onCheckedChange={(checked) => updateSetting('email', 'smtpSecure', checked)}
                  />
                </motion.div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Email notifications</Label>
                  <Switch
                    id="email-notifications"
                    checked={settings.notifications.emailEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'emailEnabled', checked)
                    }
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="slack-notifications">Slack notifications</Label>
                  <Switch
                    id="slack-notifications"
                    checked={settings.notifications.slackEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'slackEnabled', checked)
                    }
                  />
                </motion.div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="maintenance-mode">Maintenance mode</Label>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.system.maintenanceMode}
                    onCheckedChange={(checked) =>
                      updateSetting('system', 'maintenanceMode', checked)
                    }
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="debug-mode">Debug mode</Label>
                  <Switch
                    id="debug-mode"
                    checked={settings.system.debugMode}
                    onCheckedChange={(checked) => updateSetting('system', 'debugMode', checked)}
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="backup-enabled">Automated backups</Label>
                  <Switch
                    id="backup-enabled"
                    checked={settings.system.backupEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting('system', 'backupEnabled', checked)
                    }
                  />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AdminPageContent>
  );
};

export default SystemSettings; 