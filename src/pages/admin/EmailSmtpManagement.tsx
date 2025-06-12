import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AdminSidebar from '@/components/AdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Server, 
  Lock, 
  TestTube2, 
  Shield,
  CheckCircle,
  AlertTriangle,
  Settings,
  Eye,
  EyeOff,
  Send,
  Zap,
  Clock,
  Globe
} from 'lucide-react';

const EmailSmtpManagement = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    username: 'noreply@geotech.com',
    password: '',
    encryption: 'TLS',
    fromName: 'PartFinder AI',
    fromEmail: 'noreply@geotech.com'
  });

  const [emailTemplates, setEmailTemplates] = useState([
    { id: 1, name: 'Welcome Email', subject: 'Welcome to PartFinder AI', status: 'active' },
    { id: 2, name: 'Password Reset', subject: 'Reset Your Password', status: 'active' },
    { id: 3, name: 'Upgrade Notification', subject: 'Subscription Updated', status: 'active' },
    { id: 4, name: 'Weekly Report', subject: 'Your Weekly Analytics', status: 'inactive' }
  ]);

  const smtpProviders = [
    { name: 'Gmail', host: 'smtp.gmail.com', port: 587, icon: '📧' },
    { name: 'Outlook', host: 'smtp-mail.outlook.com', port: 587, icon: '📨' },
    { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, icon: '🚀' },
    { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, icon: '💌' }
  ];

  const handleTestConnection = async () => {
    setTestResult('testing');
    // Simulate API call
    setTimeout(() => {
      setTestResult(Math.random() > 0.3 ? 'success' : 'error');
    }, 2000);
  };

  const handleProviderSelect = (provider: typeof smtpProviders[0]) => {
    setSmtpConfig(prev => ({
      ...prev,
      host: provider.host,
      port: provider.port
    }));
  };

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
          className="space-y-6 lg:space-y-8 max-w-6xl mx-auto"
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
                      <Mail className="w-4 h-4 text-red-400" />
                    </motion.div>
                    <span className="text-red-300 text-sm font-semibold">Email Configuration</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-red-100 to-rose-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Email SMTP Management
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Configure email server settings and templates
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center space-x-3"
                >
                  <Badge className="bg-green-600/20 text-green-300 border-green-500/30 px-3 py-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    SMTP Active
                  </Badge>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* SMTP Configuration */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Quick Setup */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-blue-400" />
                      <span>Quick Setup</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Choose a provider for automatic configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {smtpProviders.map((provider, index) => (
                        <motion.button
                          key={provider.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleProviderSelect(provider)}
                          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{provider.icon}</span>
                            <div>
                              <div className="font-medium text-white">{provider.name}</div>
                              <div className="text-gray-400 text-sm">{provider.host}</div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SMTP Server Settings */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-rose-600/5 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Server className="w-5 h-5 text-red-400" />
                      <span>SMTP Server Configuration</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Configure your email server settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="host" className="text-gray-200 font-medium">SMTP Host</Label>
                        <Input
                          id="host"
                          value={smtpConfig.host}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-red-400/50 rounded-xl"
                          placeholder="smtp.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port" className="text-gray-200 font-medium">SMTP Port</Label>
                        <Input
                          id="port"
                          type="number"
                          value={smtpConfig.port}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-red-400/50 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-gray-200 font-medium">Username</Label>
                        <Input
                          id="username"
                          value={smtpConfig.username}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, username: e.target.value }))}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-red-400/50 rounded-xl"
                          placeholder="your-email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-200 font-medium">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={smtpConfig.password}
                            onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                            className="h-12 pr-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-red-400/50 rounded-xl"
                            placeholder="Your password or app key"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="encryption" className="text-gray-200 font-medium">Encryption</Label>
                        <Select value={smtpConfig.encryption} onValueChange={(value) => setSmtpConfig(prev => ({ ...prev, encryption: value }))}>
                          <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TLS">TLS</SelectItem>
                            <SelectItem value="SSL">SSL</SelectItem>
                            <SelectItem value="None">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fromName" className="text-gray-200 font-medium">From Name</Label>
                        <Input
                          id="fromName"
                          value={smtpConfig.fromName}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, fromName: e.target.value }))}
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-red-400/50 rounded-xl"
                          placeholder="Your Company Name"
                        />
                      </div>
                    </div>

                    {/* Test Connection */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-white">Test Configuration</h3>
                          <p className="text-gray-400 text-sm">Send a test email to verify settings</p>
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={handleTestConnection}
                            disabled={testResult === 'testing'}
                            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                          >
                            {testResult === 'testing' ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <TestTube2 className="w-4 h-4 mr-2" />
                                Test Connection
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </div>
                      
                      {testResult !== 'idle' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-3 rounded-lg ${
                            testResult === 'success' 
                              ? 'bg-green-600/20 border border-green-500/30' 
                              : testResult === 'error'
                              ? 'bg-red-600/20 border border-red-500/30'
                              : 'bg-blue-600/20 border border-blue-500/30'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {testResult === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : testResult === 'error' ? (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-blue-400 animate-spin" />
                            )}
                            <span className={`text-sm ${
                              testResult === 'success' ? 'text-green-300' :
                              testResult === 'error' ? 'text-red-300' : 'text-blue-300'
                            }`}>
                              {testResult === 'success' && 'Test email sent successfully!'}
                              {testResult === 'error' && 'Failed to send test email. Check your settings.'}
                              {testResult === 'testing' && 'Sending test email...'}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end space-x-3">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button variant="outline" className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl">
                          Reset
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/25 rounded-xl">
                          <Shield className="w-4 h-4 mr-2" />
                          Save Configuration
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Email Templates */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Send className="w-5 h-5 text-green-400" />
                    <span>Email Templates</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage email templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {emailTemplates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-white">{template.name}</div>
                            <div className="text-gray-400 text-sm mt-1">{template.subject}</div>
                          </div>
                          <Badge className={`${
                            template.status === 'active' 
                              ? 'bg-green-600/20 text-green-300 border-green-500/30'
                              : 'bg-gray-600/20 text-gray-300 border-gray-500/30'
                          } text-xs`}>
                            {template.status}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-6"
                  >
                    <Button variant="outline" className="w-full border-white/10 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl">
                      <Send className="w-4 h-4 mr-2" />
                      Manage Templates
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EmailSmtpManagement; 