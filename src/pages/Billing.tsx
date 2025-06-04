
import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Crown
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const Billing = () => {
  const [currentPlan, setCurrentPlan] = useState('pro');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'month',
      features: [
        '5 uploads per month',
        'Basic AI identification',
        'Standard support',
        '7-day history'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 19,
      period: 'month',
      features: [
        'Unlimited uploads',
        'Advanced AI identification',
        'Priority support',
        'Full history & analytics',
        'Export capabilities',
        'API access'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      period: 'month',
      features: [
        'Everything in Pro',
        'Custom AI training',
        'Dedicated support',
        'Team collaboration',
        'White-label options',
        'SLA guarantee'
      ],
      popular: false
    }
  ];

  const billingHistory = [
    {
      id: 1,
      date: '2024-01-01',
      description: 'Pro Plan - Monthly',
      amount: 19.00,
      status: 'paid'
    },
    {
      id: 2,
      date: '2023-12-01',
      description: 'Pro Plan - Monthly',
      amount: 19.00,
      status: 'paid'
    },
    {
      id: 3,
      date: '2023-11-01',
      description: 'Pro Plan - Monthly',
      amount: 19.00,
      status: 'paid'
    }
  ];

  const currentSubscription = {
    plan: 'Pro',
    status: 'active',
    nextBilling: '2024-02-01',
    amount: 19.00
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800 px-4">
            <SidebarTrigger className="-ml-1 text-gray-300 hover:text-white hover:bg-gray-800" />
          </header>

          <div className="flex-1 p-4 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 lg:space-y-8"
            >
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 flex items-center space-x-3">
                  <CreditCard className="w-8 h-8" />
                  <span>Billing & Subscription</span>
                </h1>
                <p className="text-gray-400">Manage your subscription and billing information</p>
              </div>

              {/* Current Subscription */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span>Current Subscription</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-white">{currentSubscription.plan} Plan</h3>
                          <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                            {currentSubscription.status}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm">
                          Next billing: {currentSubscription.nextBilling} • ${currentSubscription.amount}/month
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                          Change Plan
                        </Button>
                        <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/20">
                          Cancel Subscription
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pricing Plans */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Available Plans</CardTitle>
                    <CardDescription className="text-gray-400">
                      Choose the plan that best fits your needs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          className={`relative p-6 rounded-lg border transition-colors ${
                            plan.popular
                              ? 'border-purple-500 bg-purple-500/5'
                              : currentPlan === plan.id
                              ? 'border-green-500 bg-green-500/5'
                              : 'border-gray-600 bg-gray-700/30'
                          }`}
                        >
                          {plan.popular && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <Badge className="bg-purple-600 text-white border-purple-500">
                                <Star className="w-3 h-3 mr-1" />
                                Most Popular
                              </Badge>
                            </div>
                          )}
                          
                          {currentPlan === plan.id && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <Badge className="bg-green-600 text-white border-green-500">
                                <Check className="w-3 h-3 mr-1" />
                                Current Plan
                              </Badge>
                            </div>
                          )}

                          <div className="text-center mb-6">
                            <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                            <div className="text-3xl font-bold text-white">
                              ${plan.price}
                              <span className="text-sm text-gray-400 font-normal">/{plan.period}</span>
                            </div>
                          </div>

                          <ul className="space-y-3 mb-6">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center space-x-2 text-sm">
                                <Check className="w-4 h-4 text-green-400" />
                                <span className="text-gray-300">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          <Button
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
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Billing History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Receipt className="w-5 h-5" />
                        <span>Billing History</span>
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Your payment history and invoices
                      </CardDescription>
                    </div>
                    <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {billingHistory.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-700/30 border border-gray-600/50">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{invoice.description}</p>
                              <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <Calendar className="w-3 h-3" />
                                <span>{invoice.date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-white font-semibold">${invoice.amount.toFixed(2)}</p>
                              <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                                {invoice.status}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Invoice
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Billing;
