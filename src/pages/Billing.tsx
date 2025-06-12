import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Download, 
  Check, 
  Star, 
  Calendar,
  DollarSign,
  Receipt,
  Crown,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Building,
  CheckCircle,
  AlertTriangle,
  Menu
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileSidebar from '@/components/MobileSidebar';

const Billing = () => {
  const [currentPlan, setCurrentPlan] = useState('pro');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      price: 0,
      period: 'month',
      description: 'Perfect for trying out PartFinder AI',
      features: [
        '10 uploads per month',
        'Basic AI identification',
        'Standard support',
        '30-day history',
        'Email notifications'
      ],
      popular: false,
      icon: Zap,
      color: 'from-gray-600 to-gray-700',
      limit: '10 uploads/month'
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 29,
      period: 'month',
      description: 'Ideal for professionals and small teams',
      features: [
        'Unlimited uploads',
        'Advanced AI identification',
        'Priority support',
        'Full history & analytics',
        'Export capabilities',
        'API access',
        'Team collaboration (5 users)',
        'Custom reporting'
      ],
      popular: true,
      icon: Crown,
      color: 'from-purple-600 to-blue-600',
      limit: 'Unlimited uploads'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 149,
      period: 'month',
      description: 'Complete solution for large organizations',
      features: [
        'Everything in Professional',
        'Custom AI training',
        'Dedicated support manager',
        'Advanced team collaboration',
        'White-label options',
        'SLA guarantee',
        'Custom integrations',
        'On-premise deployment',
        'Advanced security features'
      ],
      popular: false,
      icon: Building,
      color: 'from-green-600 to-emerald-600',
      limit: 'Enterprise scale'
    }
  ];

  const billingHistory = [
    {
      id: 1,
      date: '2024-01-15',
      description: 'Professional Plan - Monthly',
      amount: 29.00,
      status: 'paid',
      invoice: 'INV-2024-001'
    },
    {
      id: 2,
      date: '2023-12-15',
      description: 'Professional Plan - Monthly',
      amount: 29.00,
      status: 'paid',
      invoice: 'INV-2023-012'
    },
    {
      id: 3,
      date: '2023-11-15',
      description: 'Professional Plan - Monthly',
      amount: 29.00,
      status: 'paid',
      invoice: 'INV-2023-011'
    },
    {
      id: 4,
      date: '2023-10-15',
      description: 'Professional Plan - Monthly',
      amount: 29.00,
      status: 'failed',
      invoice: 'INV-2023-010'
    }
  ];

  const currentSubscription = {
    plan: 'Professional',
    status: 'active',
    nextBilling: '2024-02-15',
    amount: 29.00,
    daysLeft: 12
  };

  const usageStats = {
    uploadsThisMonth: 2847,
    uploadsLimit: 'Unlimited',
    accuracyRate: 96.8,
    avgProcessingTime: '0.3s'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-600/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
        return 'bg-red-600/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Check className="w-4 h-4" />;
    }
  };

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
                    <span className="text-purple-300 text-sm font-semibold">Billing & Subscription</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Subscription Management
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Manage your subscription and billing preferences
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
                    <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 h-12 px-6">
                      <Download className="w-4 h-4 mr-2" />
                      Download Invoice
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Current Subscription & Usage */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Current Subscription */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span>Current Subscription</span>
                      <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                        {currentSubscription.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{currentSubscription.plan} Plan</h3>
                                                 <p className="text-gray-400">
                           <span className="text-white font-semibold">£{currentSubscription.amount}/month</span> • 
                           Next billing in <span className="text-blue-400">{currentSubscription.daysLeft} days</span>
                         </p>
                        <p className="text-gray-500 text-sm mt-1">
                          Billing date: {currentSubscription.nextBilling}
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button variant="outline" className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30">
                            Change Plan
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button variant="outline" className="border-red-600/30 text-red-400 hover:bg-red-600/10 hover:border-red-500/50">
                            Cancel Subscription
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{usageStats.uploadsThisMonth.toLocaleString()}</div>
                        <div className="text-gray-400 text-sm">Uploads this month</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{usageStats.accuracyRate}%</div>
                        <div className="text-gray-400 text-sm">Accuracy rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{usageStats.avgProcessingTime}</div>
                        <div className="text-gray-400 text-sm">Avg processing</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">∞</div>
                        <div className="text-gray-400 text-sm">Upload limit</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pricing Plans */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Available Plans</CardTitle>
                    <CardDescription className="text-gray-400">
                      Choose the plan that best fits your needs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {plans.map((plan, index) => (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                            plan.popular
                              ? 'bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-purple-500/30'
                              : currentPlan === plan.id
                              ? 'bg-gradient-to-r from-green-600/10 to-emerald-600/10 border-green-500/30'
                              : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          {plan.popular && (
                            <div className="absolute -top-3 left-6">
                              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-500/30">
                                <Star className="w-3 h-3 mr-1" />
                                Most Popular
                              </Badge>
                            </div>
                          )}
                          
                          {currentPlan === plan.id && (
                            <div className="absolute -top-3 left-6">
                              <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-500/30">
                                <Check className="w-3 h-3 mr-1" />
                                Current Plan
                              </Badge>
                            </div>
                          )}

                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${plan.color}`}>
                                <plan.icon className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                <p className="text-gray-400 text-sm">{plan.description}</p>
                              </div>
                            </div>
                                                         <div className="text-right">
                               <div className="text-3xl font-bold text-white">
                                 £{plan.price}
                                 <span className="text-lg text-gray-400 font-normal">/{plan.period}</span>
                               </div>
                               <div className="text-gray-400 text-sm">{plan.limit}</div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                            {plan.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center space-x-2 text-sm">
                                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <span className="text-gray-300">{feature}</span>
                              </div>
                            ))}
                          </div>

                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              className={`w-full h-12 ${
                                currentPlan === plan.id
                                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                  : plan.popular
                                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25'
                                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30'
                              }`}
                              disabled={currentPlan === plan.id}
                            >
                              {currentPlan === plan.id ? 'Current Plan' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                            </Button>
                          </motion.div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Billing History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Receipt className="w-5 h-5 text-blue-400" />
                    <span>Billing History</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Your recent transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {billingHistory.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-white font-medium text-sm">{item.description}</div>
                            <div className="text-gray-400 text-xs">{item.date}</div>
                            <div className="text-gray-500 text-xs">{item.invoice}</div>
                          </div>
                                                     <div className="text-right">
                             <div className="text-white font-bold">£{item.amount.toFixed(2)}</div>
                             <Badge className={`${getStatusColor(item.status)} text-xs mt-1`}>
                               <div className="flex items-center space-x-1">
                                 {getStatusIcon(item.status)}
                                 <span>{item.status}</span>
                               </div>
                             </Badge>
                           </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-6"
                  >
                    <Button variant="outline" className="w-full border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/30">
                      <Download className="w-4 h-4 mr-2" />
                      View All Invoices
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

export default Billing;
