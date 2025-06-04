
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Download, Zap, Star, Crown } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const Billing = () => {
  const [currentPlan, setCurrentPlan] = useState('starter');
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Mock data - will be replaced with real Stripe data
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      icon: Zap,
      monthlyPrice: 9,
      yearlyPrice: 90,
      uploads: 50,
      features: [
        'AI-powered part identification',
        'Basic price comparison',
        'Upload history',
        'Email support'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Professional',
      icon: Star,
      monthlyPrice: 29,
      yearlyPrice: 290,
      uploads: 200,
      features: [
        'Everything in Starter',
        'Advanced price tracking',
        'Export functionality',
        'Priority support',
        'API access'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Crown,
      monthlyPrice: 99,
      yearlyPrice: 990,
      uploads: 'Unlimited',
      features: [
        'Everything in Professional',
        'Custom integrations',
        'Bulk processing',
        'Dedicated support',
        'White-label options'
      ],
      popular: false
    }
  ];

  const invoices = [
    { id: 1, date: '2024-01-01', amount: '$29.00', status: 'paid', plan: 'Professional' },
    { id: 2, date: '2023-12-01', amount: '$29.00', status: 'paid', plan: 'Professional' },
    { id: 3, date: '2023-11-01', amount: '$29.00', status: 'paid', plan: 'Professional' },
  ];

  const handlePlanChange = (planId: string) => {
    // Stripe checkout logic will be implemented
    console.log('Changing to plan:', planId);
  };

  const handleDownloadInvoice = (invoiceId: number) => {
    // Download invoice functionality
    console.log('Downloading invoice:', invoiceId);
  };

  const getPrice = (plan: any) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getSavings = (plan: any) => {
    const yearlyTotal = plan.monthlyPrice * 12;
    const savings = yearlyTotal - plan.yearlyPrice;
    return Math.round((savings / yearlyTotal) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      <DashboardSidebar />
      
      <div className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
            <p className="text-gray-400">Manage your subscription and billing information.</p>
          </div>

          {/* Current Plan Status */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Current Plan</CardTitle>
              <CardDescription className="text-gray-400">
                Your active subscription details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Professional Plan</h3>
                    <p className="text-gray-400 text-sm">$29/month • Next billing: February 1, 2024</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">127 of 200 uploads used</p>
                  <div className="w-32 bg-gray-700 rounded-full h-2 mt-2">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full" style={{ width: '63.5%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-1 backdrop-blur-sm">
              <div className="flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="ml-1 text-xs bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded-full">
                    Save up to 20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                    Most Popular
                  </div>
                )}
                <Card className={`h-full ${
                  plan.popular 
                    ? 'bg-gray-800/70 border-purple-500/50 ring-1 ring-purple-500/30' 
                    : 'bg-gray-800/50 border-gray-700'
                } backdrop-blur-sm transition-all duration-200 hover:border-purple-500/30`}>
                  <CardHeader className="text-center">
                    <plan.icon className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                    <CardTitle className="text-white">{plan.name}</CardTitle>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-white">
                        ${getPrice(plan)}
                        <span className="text-lg text-gray-400 font-normal">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-sm text-green-400">
                          Save {getSavings(plan)}% with yearly billing
                        </p>
                      )}
                    </div>
                    <CardDescription className="text-gray-400">
                      {typeof plan.uploads === 'string' ? plan.uploads : `${plan.uploads} uploads/month`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handlePlanChange(plan.id)}
                      className={`w-full ${
                        currentPlan === plan.id
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                          : plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                      disabled={currentPlan === plan.id}
                    >
                      {currentPlan === plan.id ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Billing History */}
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Billing History</CardTitle>
              <CardDescription className="text-gray-400">
                Download your invoices and view payment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                    <div className="flex items-center space-x-4">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-white font-medium">{invoice.plan} Plan</p>
                        <p className="text-gray-400 text-sm">{new Date(invoice.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-white font-medium">{invoice.amount}</p>
                        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                          {invoice.status}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Billing;
