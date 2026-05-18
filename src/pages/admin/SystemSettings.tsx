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

  return (
    <AdminPageContent>
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
    </AdminPageContent>
  );
};

export default SystemSettings; 