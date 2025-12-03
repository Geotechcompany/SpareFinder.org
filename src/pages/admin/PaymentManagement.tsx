import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminDesktopSidebar from '@/components/AdminDesktopSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { 
  CreditCard, 
  Plus, 
  Key, 
  DollarSign,
  Settings,
  Eye,
  EyeOff,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  BarChart3,
  Loader2,
  RefreshCw,
  Download,
  Upload,
  Zap,
  Users,
  ShoppingCart,
  Receipt,
  Trash2
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  secret_key: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  transactions_count: number;
  revenue: number;
  fees: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

const PaymentManagement = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    api_key: '',
    secret_key: '',
    description: ''
  });
  
  const { toast } = useToast();
  
  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.admin.getPaymentMethods();
      
      if (response.success && response.data?.methods) {
        setMethods(response.data.methods);
      } else {
        throw new Error('Failed to fetch payment methods');
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payment methods. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Payment method name is required",
      });
      return false;
    }
    
    if (!formData.provider) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Provider is required",
      });
      return false;
    }
    
    if (!formData.api_key.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "API key is required",
      });
      return false;
    }
    
    if (!formData.secret_key.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Secret key is required",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await api.admin.createPaymentMethod({
        name: formData.name.trim(),
        provider: formData.provider,
        api_key: formData.api_key.trim(),
        secret_key: formData.secret_key.trim(),
        description: formData.description.trim() || undefined
      });
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Payment method created successfully!",
        });
        
        // Reset form
        setFormData({
          name: '',
          provider: '',
          api_key: '',
          secret_key: '',
          description: ''
        });
        
        // Refresh payment methods list
        await fetchPaymentMethods();
      } else {
        throw new Error(response.message || 'Failed to create payment method');
      }
    } catch (err) {
      console.error('Error creating payment method:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create payment method",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (paymentMethodId: string) => {
    try {
      setIsDeleting(paymentMethodId);
      
      const response = await api.admin.deletePaymentMethod(paymentMethodId);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Payment method deleted successfully!",
        });
        
        // Refresh payment methods list
        await fetchPaymentMethods();
      } else {
        throw new Error(response.message || 'Failed to delete payment method');
      }
    } catch (err) {
      console.error('Error deleting payment method:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete payment method",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const paymentStats = {
    totalRevenue: methods.reduce((sum, method) => sum + method.revenue, 0),
    totalTransactions: methods.reduce((sum, method) => sum + method.transactions_count, 0),
    totalFees: methods.reduce((sum, method) => sum + method.fees, 0),
    activeMethods: methods.filter(method => method.status === 'active').length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'inactive':
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-red-600/20 text-red-300 border-red-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'stripe':
        return '💳';
      case 'paypal':
        return '🔵';
      case 'square':
        return '⬜';
      default:
        return '💳';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'stripe':
        return 'from-purple-600 to-indigo-600';
      case 'paypal':
        return 'from-blue-600 to-cyan-600';
      case 'square':
        return 'from-green-600 to-emerald-600';
      default:
        return 'from-gray-600 to-slate-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-green-900/20 to-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-green-900/20 to-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-green-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchPaymentMethods} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-[#0B1026] dark:via-[#1A1033] dark:to-[#0C1226] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-green-600/15 rounded-full blur-3xl opacity-60"
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl opacity-40"
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
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-full border border-green-500/30 backdrop-blur-xl mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <CreditCard className="w-4 h-4 text-green-400" />
                    </motion.div>
                    <span className="text-green-300 text-sm font-semibold">Payments</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Payment Management
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Manage payment gateways and transaction processing
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
                    <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25 h-12 px-6">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Payment Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { 
                label: 'Total Revenue', 
                value: `£${paymentStats.totalRevenue.toLocaleString()}`, 
                icon: DollarSign, 
                color: 'from-green-600 to-emerald-600' 
              },
              { 
                label: 'Total Transactions', 
                value: paymentStats.totalTransactions.toLocaleString(), 
                icon: Receipt, 
                color: 'from-blue-600 to-cyan-600' 
              },
              { 
                label: 'Total Fees', 
                value: `£${paymentStats.totalFees.toLocaleString()}`, 
                icon: TrendingUp, 
                color: 'from-purple-600 to-violet-600' 
              },
              { 
                label: 'Active Methods', 
                value: paymentStats.activeMethods.toString(), 
                icon: CreditCard, 
                color: 'from-orange-600 to-red-600' 
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-10 rounded-2xl blur-xl`} />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Payment Methods Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {methods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${getProviderColor(method.provider)} opacity-10 rounded-2xl blur-xl`} />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getProviderColor(method.provider)} flex items-center justify-center text-2xl`}>
                          {getProviderIcon(method.provider)}
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{method.name}</CardTitle>
                          <CardDescription className="text-gray-400 text-sm">
                            {method.provider}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(method.status)} font-medium`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(method.status)}
                          <span className="capitalize">{method.status}</span>
                        </div>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Description */}
                    <p className="text-gray-300 text-sm">{method.description}</p>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4 p-3 rounded-xl bg-white/5">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{method.transactions_count.toLocaleString()}</div>
                        <div className="text-gray-400 text-xs">Transactions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">£{method.revenue.toLocaleString()}</div>
                        <div className="text-gray-400 text-xs">Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">£{method.fees.toFixed(0)}</div>
                        <div className="text-gray-400 text-xs">Fees</div>
                      </div>
                    </div>

                    {/* API Keys */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-gray-200 text-sm">API Key</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            type={showSecrets[method.id] ? 'text' : 'password'}
                            value={method.api_key}
                            readOnly
                            className="h-10 bg-white/5 border-white/10 text-white text-sm font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSecretVisibility(method.id)}
                            className="h-10 w-10 p-0 border-white/10 hover:bg-white/10"
                          >
                            {showSecrets[method.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-200 text-sm">Secret Key</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            type={showSecrets[method.id] ? 'text' : 'password'}
                            value={method.secret_key}
                            readOnly
                            className="h-10 bg-white/5 border-white/10 text-white text-sm font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSecretVisibility(method.id)}
                            className="h-10 w-10 p-0 border-white/10 hover:bg-white/10"
                          >
                            {showSecrets[method.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4 text-blue-400" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <BarChart3 className="w-4 h-4 text-green-400" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Activity className="w-4 h-4 text-purple-400" />
                        </motion.button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                              disabled={isDeleting === method.id}
                            >
                              {isDeleting === method.id ? (
                                <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-400" />
                              )}
                            </motion.button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-black/80 backdrop-blur-xl border-white/10">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Delete Payment Method</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to delete "{method.name}"? This action cannot be undone and will permanently remove this payment method from the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(method.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={method.status === 'active' ? 'outline' : 'default'}
                          size="sm"
                          className={
                            method.status === 'active'
                              ? 'border-yellow-600/30 text-yellow-400 hover:bg-yellow-600/10'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }
                        >
                          {method.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Add New Payment Method */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-green-400" />
                  <span>Add New Payment Method</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure a new payment gateway for the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-200 font-medium">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Payment method name"
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider" className="text-gray-200 font-medium">Provider</Label>
                    <Select value={formData.provider} onValueChange={(value) => handleInputChange('provider', value)}>
                      <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apikey" className="text-gray-200 font-medium">API Key</Label>
                    <Input
                      id="apikey"
                      type="password"
                      value={formData.api_key}
                      onChange={(e) => handleInputChange('api_key', e.target.value)}
                      placeholder="Enter API key"
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretkey" className="text-gray-200 font-medium">Secret Key</Label>
                    <Input
                      id="secretkey"
                      type="password"
                      value={formData.secret_key}
                      onChange={(e) => handleInputChange('secret_key', e.target.value)}
                      placeholder="Enter secret key"
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>
                  <div className="flex items-end">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full"
                    >
                      <Button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25 rounded-xl"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Add Method
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
                
                {/* Description field (optional) */}
                <div className="mt-6 space-y-2">
                  <Label htmlFor="description" className="text-gray-200 font-medium">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of this payment method"
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentManagement; 