
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Save, User, Mail, Phone, MapPin } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const Settings = () => {
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    company: 'Auto Parts Inc.',
    address: '123 Main St, City, State 12345'
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoSave: true,
    darkMode: true
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Settings saved:', { formData, preferences });
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
                  <SettingsIcon className="w-8 h-8" />
                  <span>Settings</span>
                </h1>
                <p className="text-gray-400">Manage your account settings and preferences</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <User className="w-5 h-5" />
                        <span>Profile Information</span>
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Update your personal information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-gray-200">First Name</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-gray-200">Last Name</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            className="bg-gray-700/50 border-gray-600 text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-200 flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>Email</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-gray-200 flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>Phone</span>
                        </Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-gray-200">Company</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-gray-200 flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>Address</span>
                        </Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="bg-gray-700/50 border-gray-600 text-white"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white">Preferences</CardTitle>
                      <CardDescription className="text-gray-400">
                        Customize your experience
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Email Notifications</Label>
                          <p className="text-sm text-gray-400">Receive updates via email</p>
                        </div>
                        <Switch
                          checked={preferences.emailNotifications}
                          onCheckedChange={(value) => handlePreferenceChange('emailNotifications', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">SMS Notifications</Label>
                          <p className="text-sm text-gray-400">Receive updates via SMS</p>
                        </div>
                        <Switch
                          checked={preferences.smsNotifications}
                          onCheckedChange={(value) => handlePreferenceChange('smsNotifications', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Auto Save</Label>
                          <p className="text-sm text-gray-400">Automatically save your work</p>
                        </div>
                        <Switch
                          checked={preferences.autoSave}
                          onCheckedChange={(value) => handlePreferenceChange('autoSave', value)}
                        />
                      </div>

                      <Separator className="bg-gray-700" />

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-gray-200">Dark Mode</Label>
                          <p className="text-sm text-gray-400">Use dark theme</p>
                        </div>
                        <Switch
                          checked={preferences.darkMode}
                          onCheckedChange={(value) => handlePreferenceChange('darkMode', value)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white">Danger Zone</CardTitle>
                      <CardDescription className="text-gray-400">
                        Irreversible actions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="destructive" className="w-full">
                        Delete Account
                      </Button>
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

export default Settings;
