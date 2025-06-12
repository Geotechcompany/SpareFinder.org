import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '@/components/AdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Plus, 
  Wallet, 
  Banknote, 
  Edit, 
  Trash,
  Settings,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Lock,
  Zap,
  Globe,
  Shield,
  Eye,
  EyeOff,
  Key,
  TestTube2
} from 'lucide-react';

const PaymentManagement = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<{[key: number]: boolean}>({});
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleApiKeyVisibility = (id: number) => {
    setShowApiKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [paymentMethods, setPaymentMethods] = useState([
    { 
      id: 1, 
      name: 'Stripe', 
      status: 'active', 
      apiKey: 'sk_live_1234567890abcdef',
      secretKey: 'sk_test_0987654321fedcba',
      description: 'Credit cards, Apple Pay, Google Pay',
      transactions: 2847,
      revenue: 125670.50,
      fees: 3.2,
      icon: '💳',
      color: 'from-purple-600 to-indigo-600'
    },
    { 
      id: 2, 
      name: 'PayPal', 
      status: 'inactive', 
      apiKey: 'AQkquBDf1zctJOWGKWUEtKXm6qVhueUEMvXO_-MCI4DQQ4-LWvkDLcr1SmIkpDqg',
      secretKey: 'EGnHDxD_qRPOmeAjlZXHdccxRQ',
      description: 'PayPal, PayPal Credit, Venmo',
      transactions: 892,
      revenue: 38240.75,
      fees: 2.9,
      icon: '🅿️',
      color: 'from-blue-600 to-cyan-600'
    },
    { 
      id: 3, 
      name: 'Square', 
      status: 'pending', 
      apiKey: 'sandbox-sq0idb-K4nQFCCWV1j_7-K_3r3Q',
      secretKey: 'sandbox-sq0csp-K4nQFCCWV1j_7-K_3r3Q',
      description: 'In-person and online payments',
      transactions: 134,
      revenue: 8450.25,
      fees: 2.6,
      icon: '⬜',
      color: 'from-green-600 to-emerald-600'
    }
  ]);

  const paymentStats = {
    totalRevenue: paymentMethods.reduce((sum, method) => sum + method.revenue, 0),
    totalTransactions: paymentMethods.reduce((sum, method) => sum + method.transactions, 0),
    averageFee: paymentMethods.reduce((sum, method) => sum + method.fees, 0) / paymentMethods.length,
    activeGateways: paymentMethods.filter(method => method.status === 'active').length
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
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
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
          className="space-y-6 lg:space-y-8 max-w-7xl mx-auto"
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
                      <CreditCard className="w-4 h-4 text-red-400" />
                    </motion.div>
                    <span className="text-red-300 text-sm font-semibold">Payment Management</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-red-100 to-rose-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Payment Methods
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Manage payment gateways and configurations
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
                    <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/25 h-12 px-6">
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
                label: 'Transactions', 
                value: paymentStats.totalTransactions.toLocaleString(), 
                icon: CreditCard, 
                color: 'from-blue-600 to-cyan-600' 
              },
              { 
                label: 'Active Gateways', 
                value: paymentStats.activeGateways, 
                icon: CheckCircle, 
                color: 'from-purple-600 to-violet-600' 
              },
              { 
                label: 'Avg. Fee', 
                value: `${paymentStats.averageFee.toFixed(1)}%`, 
                icon: Wallet, 
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
            {paymentMethods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${method.color} opacity-10 rounded-2xl blur-xl`} />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${method.color} flex items-center justify-center text-2xl`}>
                          {method.icon}
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">{method.name}</CardTitle>
                          <CardDescription className="text-gray-400 text-sm">
                            {method.description}
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
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-white/5">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{method.transactions.toLocaleString()}</div>
                        <div className="text-gray-400 text-xs">Transactions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">£{method.revenue.toLocaleString()}</div>
                        <div className="text-gray-400 text-xs">Revenue</div>
                      </div>
                    </div>

                    {/* API Keys */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-gray-200 text-sm">API Key</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            type={showApiKeys[method.id] ? 'text' : 'password'}
                            value={method.apiKey}
                            readOnly
                            className="h-10 bg-white/5 border-white/10 text-white text-sm font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleApiKeyVisibility(method.id)}
                            className="h-10 w-10 p-0 border-white/10 hover:bg-white/10"
                          >
                            {showApiKeys[method.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-gray-200 text-sm">Processing Fee</Label>
                        <div className="text-white font-semibold">{method.fees}% + £0.30</div>
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
                          <TestTube2 className="w-4 h-4 text-green-400" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Trash className="w-4 h-4 text-red-400" />
                        </motion.button>
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

          {/* Configuration Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-blue-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span>Global Payment Settings</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure global payment processing settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-gray-200 font-medium">Default Currency</Label>
                    <Input
                      id="currency"
                      value="GBP"
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook" className="text-gray-200 font-medium">Webhook URL</Label>
                    <Input
                      id="webhook"
                      value="https://api.geotech.com/webhooks/payment"
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout" className="text-gray-200 font-medium">Payment Timeout</Label>
                    <Input
                      id="timeout"
                      value="30 minutes"
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 rounded-xl">
                      <Lock className="w-4 h-4 mr-2" />
                      Save Settings
                    </Button>
                  </motion.div>
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