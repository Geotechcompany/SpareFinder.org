import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { 
  Settings as SettingsIcon, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Building,
  MapPin,
  Bell,
  Shield,
  Palette,
  Zap,
  Sparkles,
  Globe,
  Eye,
  Lock,
  Building2,
  Briefcase,
  Menu,
  AlertCircle
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  address: string;
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    autoSave: boolean;
    darkMode: boolean;
    analytics: boolean;
    marketing: boolean;
  };
}

const Settings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    address: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoSave: true,
    darkMode: true,
    analytics: true,
    marketing: false
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('No user session found');

      // Fetch user profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        setFormData({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          email: profile.email || session.user.email || '',
          phone: profile.phone || '',
          company: profile.company || '',
          position: profile.position || '',
          address: profile.address || ''
        });

        // If preferences exist in profile, use them, otherwise use defaults
        if (profile.preferences) {
          setPreferences(profile.preferences);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load user profile. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('No user session found');

      // Update profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          company: formData.company,
          position: formData.position,
          address: formData.address,
          preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Your settings have been saved successfully.",
      });
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save changes. Please try again later.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchUserProfile} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 -right-40 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-60"
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

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Mobile Menu Button */}
      <button 
        onClick={handleToggleMobileMenu}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-xl border border-white/10 md:hidden"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Main Content */}
      <motion.div
        initial={false}
        animate={{ 
          marginLeft: isCollapsed 
            ? 'var(--collapsed-sidebar-width, 80px)' 
            : 'var(--expanded-sidebar-width, 320px)',
          width: isCollapsed
            ? 'calc(100% - var(--collapsed-sidebar-width, 80px))'
            : 'calc(100% - var(--expanded-sidebar-width, 320px))'
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-2 sm:p-4 lg:p-8 relative z-10 overflow-x-hidden md:overflow-x-visible"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl sm:rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full border border-purple-500/30 backdrop-blur-xl mb-3 sm:mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </motion.div>
                    <span className="text-purple-300 text-sm font-semibold">Account Settings</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Settings & Preferences
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Manage your account settings and preferences
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
                    <Button 
                      onClick={handleSave} 
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-2xl sm:rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-2 border border-white/10 overflow-x-auto">
              <div className="flex flex-nowrap min-w-max sm:min-w-0 sm:flex-wrap gap-2">
                {tabs.map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-2xl transition-all duration-300 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeSettingsTab"
                        className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-blue-600/20 rounded-2xl border border-purple-500/30 backdrop-blur-xl"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center space-x-2">
                      <tab.icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8"
                >
                  {/* Personal Information */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
                    <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 h-full">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <User className="w-5 h-5 text-purple-400" />
                          <span>Personal Information</span>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Update your personal details
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName" className="text-gray-200">First Name</Label>
                            <Input
                              id="firstName"
                              value={formData.first_name}
                              onChange={(e) => handleInputChange('first_name', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName" className="text-gray-200">Last Name</Label>
                            <Input
                              id="lastName"
                              value={formData.last_name}
                              onChange={(e) => handleInputChange('last_name', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12"
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
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12"
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
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="company" className="text-gray-200 flex items-center space-x-2">
                            <Building2 className="w-4 h-4" />
                            <span>Company</span>
                          </Label>
                          <Input
                            id="company"
                            value={formData.company}
                            onChange={(e) => handleInputChange('company', e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="position" className="text-gray-200 flex items-center space-x-2">
                            <Briefcase className="w-4 h-4" />
                            <span>Position</span>
                          </Label>
                          <Input
                            id="position"
                            value={formData.position}
                            onChange={(e) => handleInputChange('position', e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 h-12"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Account Security */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-red-600/10 rounded-3xl blur-xl opacity-60" />
                    <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 h-full">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Shield className="w-5 h-5 text-orange-400" />
                          <span>Account Security</span>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Manage your security settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <div>
                              <h4 className="text-white font-medium">Password</h4>
                              <p className="text-gray-400 text-sm">Last changed 3 months ago</p>
                            </div>
                            <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-600/10 hover:border-orange-500/50 h-10 w-full sm:w-auto">
                              Change Password
                            </Button>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <div>
                              <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                              <p className="text-gray-400 text-sm">Add an extra layer of security</p>
                            </div>
                            <Button variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-600/10 hover:border-green-500/50 h-10 w-full sm:w-auto">
                              Enable 2FA
                            </Button>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <div>
                              <h4 className="text-white font-medium">Login Sessions</h4>
                              <p className="text-gray-400 text-sm">Manage your active sessions</p>
                            </div>
                            <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-600/10 hover:border-blue-500/50 h-10 w-full sm:w-auto">
                              View Sessions
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
                    <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Bell className="w-5 h-5 text-purple-400" />
                          <span>Notification Preferences</span>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Choose how you want to be notified
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {[
                          {
                            key: 'emailNotifications',
                            title: 'Email Notifications',
                            description: 'Receive notifications via email',
                            icon: Mail,
                            color: 'from-blue-600 to-cyan-600'
                          },
                          {
                            key: 'smsNotifications',
                            title: 'SMS Notifications',
                            description: 'Receive notifications via SMS',
                            icon: Phone,
                            color: 'from-green-600 to-emerald-600'
                          },
                          {
                            key: 'autoSave',
                            title: 'Auto Save',
                            description: 'Automatically save your work',
                            icon: Save,
                            color: 'from-purple-600 to-blue-600'
                          },
                          {
                            key: 'analytics',
                            title: 'Analytics Tracking',
                            description: 'Help us improve with usage analytics',
                            icon: Zap,
                            color: 'from-orange-600 to-red-600'
                          },
                          {
                            key: 'marketing',
                            title: 'Marketing Emails',
                            description: 'Receive updates about new features',
                            icon: Globe,
                            color: 'from-pink-600 to-purple-600'
                          }
                        ].map((setting) => (
                          <div key={setting.key} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                              <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 bg-gradient-to-r ${setting.color} rounded-xl flex items-center justify-center`}>
                                  <setting.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-white font-medium">{setting.title}</h4>
                                  <p className="text-gray-400 text-sm">{setting.description}</p>
                                </div>
                              </div>
                              <Switch
                                checked={preferences[setting.key as keyof typeof preferences] as boolean}
                                onCheckedChange={(checked) => handlePreferenceChange(setting.key, checked)}
                                className="data-[state=checked]:bg-purple-600"
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}

              {(activeTab === 'privacy' || activeTab === 'appearance') && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
                    <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          {activeTab === 'privacy' ? (
                            <Shield className="w-5 h-5 text-green-400" />
                          ) : (
                            <Palette className="w-5 h-5 text-pink-400" />
                          )}
                          <span>{activeTab === 'privacy' ? 'Privacy Settings' : 'Appearance'}</span>
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {activeTab === 'privacy' 
                            ? 'Control your privacy and data settings' 
                            : 'Customize the look and feel'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-12">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            {activeTab === 'privacy' ? (
                              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            ) : (
                              <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            )}
                          </motion.div>
                          <p className="text-gray-300 text-lg mb-2">Coming Soon</p>
                          <p className="text-gray-400">This section is under development</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Settings;
