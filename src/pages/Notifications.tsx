
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, MessageSquare, Smartphone, Save } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const Notifications = () => {
  const [notifications, setNotifications] = useState({
    email: {
      uploadComplete: true,
      weeklyReport: true,
      securityAlerts: true,
      productUpdates: false,
      marketing: false
    },
    push: {
      uploadComplete: true,
      systemMaintenance: true,
      securityAlerts: true,
      newFeatures: false
    },
    sms: {
      securityAlerts: true,
      criticalUpdates: true,
      marketing: false
    }
  });

  const handleNotificationChange = (category: string, setting: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  const handleSave = () => {
    console.log('Notification settings saved:', notifications);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800 px-4">
            <SidebarTrigger className="-ml-1 text-gray-300 hover:text-white hover:bg-gray-800" />
            <div className="ml-auto">
              <Button onClick={handleSave} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 lg:space-y-8 max-w-4xl"
            >
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center space-x-3">
                  <Bell className="w-8 h-8" />
                  <span>Notification Settings</span>
                </h1>
                <p className="text-gray-400">Manage how you receive notifications</p>
              </div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Mail className="w-5 h-5 text-blue-400" />
                        <span>Email Notifications</span>
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Choose which emails you want to receive
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Upload Complete</Label>
                          <p className="text-sm text-gray-400">Get notified when part analysis is complete</p>
                        </div>
                        <Switch
                          checked={notifications.email.uploadComplete}
                          onCheckedChange={(value) => handleNotificationChange('email', 'uploadComplete', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Weekly Report</Label>
                          <p className="text-sm text-gray-400">Weekly summary of your activity</p>
                        </div>
                        <Switch
                          checked={notifications.email.weeklyReport}
                          onCheckedChange={(value) => handleNotificationChange('email', 'weeklyReport', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Security Alerts</Label>
                          <p className="text-sm text-gray-400">Important security notifications</p>
                        </div>
                        <Switch
                          checked={notifications.email.securityAlerts}
                          onCheckedChange={(value) => handleNotificationChange('email', 'securityAlerts', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Product Updates</Label>
                          <p className="text-sm text-gray-400">News about new features and improvements</p>
                        </div>
                        <Switch
                          checked={notifications.email.productUpdates}
                          onCheckedChange={(value) => handleNotificationChange('email', 'productUpdates', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Marketing</Label>
                          <p className="text-sm text-gray-400">Promotional content and special offers</p>
                        </div>
                        <Switch
                          checked={notifications.email.marketing}
                          onCheckedChange={(value) => handleNotificationChange('email', 'marketing', value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-green-400" />
                        <span>Push Notifications</span>
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Browser and app notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Upload Complete</Label>
                          <p className="text-sm text-gray-400">Instant notification when analysis is done</p>
                        </div>
                        <Switch
                          checked={notifications.push.uploadComplete}
                          onCheckedChange={(value) => handleNotificationChange('push', 'uploadComplete', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">System Maintenance</Label>
                          <p className="text-sm text-gray-400">Scheduled maintenance notifications</p>
                        </div>
                        <Switch
                          checked={notifications.push.systemMaintenance}
                          onCheckedChange={(value) => handleNotificationChange('push', 'systemMaintenance', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Security Alerts</Label>
                          <p className="text-sm text-gray-400">Critical security notifications</p>
                        </div>
                        <Switch
                          checked={notifications.push.securityAlerts}
                          onCheckedChange={(value) => handleNotificationChange('push', 'securityAlerts', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">New Features</Label>
                          <p className="text-sm text-gray-400">Announcements about new features</p>
                        </div>
                        <Switch
                          checked={notifications.push.newFeatures}
                          onCheckedChange={(value) => handleNotificationChange('push', 'newFeatures', value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Smartphone className="w-5 h-5 text-purple-400" />
                        <span>SMS Notifications</span>
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Text message notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Security Alerts</Label>
                          <p className="text-sm text-gray-400">Critical security notifications only</p>
                        </div>
                        <Switch
                          checked={notifications.sms.securityAlerts}
                          onCheckedChange={(value) => handleNotificationChange('sms', 'securityAlerts', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Critical Updates</Label>
                          <p className="text-sm text-gray-400">Important system updates</p>
                        </div>
                        <Switch
                          checked={notifications.sms.criticalUpdates}
                          onCheckedChange={(value) => handleNotificationChange('sms', 'criticalUpdates', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Marketing</Label>
                          <p className="text-sm text-gray-400">Promotional messages</p>
                        </div>
                        <Switch
                          checked={notifications.sms.marketing}
                          onCheckedChange={(value) => handleNotificationChange('sms', 'marketing', value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Notifications;
