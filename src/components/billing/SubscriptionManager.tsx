import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  CheckCircle,
  CreditCard,
  Crown,
  Star,
  Zap,
  Clock,
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import supabase from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, addDays, addMonths } from 'date-fns'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  billingCycle: 'monthly' | 'yearly'
  features: string[]
  limits: {
    monthlySearches: number
    aiModels: string[]
    priority: 'standard' | 'high' | 'premium'
    support: string
    apiAccess: boolean
  }
  popular?: boolean
  recommended?: boolean
}

interface UserSubscription {
  id: string
  planId: string
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  currentPeriodStart: string
  currentPeriodEnd: string
  usage: {
    searchesUsed: number
    searchesLimit: number
    apiCallsUsed: number
    storageUsed: number
  }
}

interface BillingHistory {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed'
  description: string
  date: string
  invoiceUrl?: string
}

const SubscriptionManager: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const { user } = useAuth()

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    setLoading(true)
    try {
      // Mock data - in real implementation, this would come from your billing service
      const mockPlans: SubscriptionPlan[] = [
        {
          id: 'free',
          name: 'Free',
          description: 'Perfect for getting started',
          price: 0,
          billingCycle: 'monthly',
          features: [
            '10 part searches per month',
            'Basic AI model access',
            'Standard support',
            'Search history (30 days)',
            'Email notifications'
          ],
          limits: {
            monthlySearches: 10,
            aiModels: ['basic'],
            priority: 'standard',
            support: 'email',
            apiAccess: false,
          }
        },
        {
          id: 'pro',
          name: 'Professional',
          description: 'For serious automotive professionals',
          price: 29,
          billingCycle: 'monthly',
          features: [
            '500 part searches per month',
            'Advanced AI models',
            'Priority support',
            'Unlimited search history',
            'Batch processing',
            'API access',
            'Advanced analytics'
          ],
          limits: {
            monthlySearches: 500,
            aiModels: ['basic', 'advanced'],
            priority: 'high',
            support: 'priority',
            apiAccess: true,
          },
          popular: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'For teams and businesses',
          price: 99,
          billingCycle: 'monthly',
          features: [
            'Unlimited part searches',
            'All AI models including custom',
            '24/7 premium support',
            'Team collaboration',
            'Custom integrations',
            'Dedicated account manager',
            'SLA guarantee',
            'White-label options'
          ],
          limits: {
            monthlySearches: -1, // unlimited
            aiModels: ['basic', 'advanced', 'premium', 'custom'],
            priority: 'premium',
            support: '24/7',
            apiAccess: true,
          },
          recommended: true
        }
      ]

      const mockSubscription: UserSubscription = {
        id: 'sub_1',
        planId: 'pro',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: addMonths(new Date(), 1).toISOString(),
        usage: {
          searchesUsed: 127,
          searchesLimit: 500,
          apiCallsUsed: 1250,
          storageUsed: 2.4, // GB
        }
      }

      const mockBillingHistory: BillingHistory[] = [
        {
          id: 'inv_1',
          amount: 29.00,
          currency: 'USD',
          status: 'paid',
          description: 'Professional Plan - Monthly',
          date: new Date().toISOString(),
        },
        {
          id: 'inv_2',
          amount: 29.00,
          currency: 'USD',
          status: 'paid',
          description: 'Professional Plan - Monthly',
          date: addDays(new Date(), -30).toISOString(),
        },
        {
          id: 'inv_3',
          amount: 29.00,
          currency: 'USD',
          status: 'paid',
          description: 'Professional Plan - Monthly',
          date: addDays(new Date(), -60).toISOString(),
        }
      ]

      setPlans(mockPlans)
      setCurrentSubscription(mockSubscription)
      setBillingHistory(mockBillingHistory)
    } catch (error) {
      console.error('Error fetching subscription data:', error)
      toast.error('Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradeSubscription = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setIsUpgradeDialogOpen(true)
  }

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return

    try {
      // Mock implementation - would integrate with Stripe/payment processor
      toast.success(`Upgraded to ${selectedPlan.name} plan!`)
      setIsUpgradeDialogOpen(false)
      setSelectedPlan(null)
      fetchSubscriptionData() // Refresh data
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      toast.error('Failed to upgrade subscription')
    }
  }

  const handleCancelSubscription = async () => {
    try {
      // Mock implementation
      toast.success('Subscription cancelled. You will retain access until the end of your billing period.')
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error('Failed to cancel subscription')
    }
  }

  const getCurrentPlan = () => {
    return plans.find(plan => plan.id === currentSubscription?.planId)
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-600/20 text-green-300 border-green-500/30', label: 'Active' },
      cancelled: { color: 'bg-red-600/20 text-red-300 border-red-500/30', label: 'Cancelled' },
      past_due: { color: 'bg-orange-600/20 text-orange-300 border-orange-500/30', label: 'Past Due' },
      trialing: { color: 'bg-blue-600/20 text-blue-300 border-blue-500/30', label: 'Trial' },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  const currentPlan = getCurrentPlan()

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-black/20 backdrop-blur-xl border-white/10">
          <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/20">
            Overview
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-white data-[state=active]:bg-white/20">
            Plans & Pricing
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-white data-[state=active]:bg-white/20">
            Billing History
          </TabsTrigger>
          <TabsTrigger value="usage" className="text-white data-[state=active]:bg-white/20">
            Usage Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Subscription */}
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    Current Subscription
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your subscription and usage
                  </CardDescription>
                </div>
                {currentSubscription && getStatusBadge(currentSubscription.status)}
              </div>
            </CardHeader>
            <CardContent>
              {currentPlan && currentSubscription ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {currentPlan.name}
                        {currentPlan.popular && <Star className="w-4 h-4 text-yellow-400" />}
                        {currentPlan.recommended && <Crown className="w-4 h-4 text-purple-400" />}
                      </h3>
                      <p className="text-gray-400">{currentPlan.description}</p>
                      <p className="text-2xl font-bold text-white mt-2">
                        ${currentPlan.price}
                        <span className="text-gray-400 text-base font-normal">/{currentPlan.billingCycle}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Next billing date</p>
                      <p className="text-white font-medium">
                        {format(new Date(currentSubscription.currentPeriodEnd), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Usage Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-gray-400">Monthly Searches</p>
                        <p className="text-white font-medium">
                          {currentSubscription.usage.searchesUsed} / {
                            currentSubscription.usage.searchesLimit === -1 
                              ? '∞' 
                              : currentSubscription.usage.searchesLimit
                          }
                        </p>
                      </div>
                      <Progress 
                        value={getUsagePercentage(
                          currentSubscription.usage.searchesUsed, 
                          currentSubscription.usage.searchesLimit
                        )}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-gray-400">API Calls</p>
                        <p className="text-white font-medium">
                          {currentSubscription.usage.apiCallsUsed.toLocaleString()}
                        </p>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setActiveTab('plans')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelSubscription}
                      className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Active Subscription</h3>
                  <p className="text-gray-400 mb-4">Choose a plan to get started with advanced features</p>
                  <Button
                    onClick={() => setActiveTab('plans')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    View Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">This Month</p>
                    <p className="text-2xl font-bold text-white">
                      {currentSubscription?.usage.searchesUsed || 0}
                    </p>
                    <p className="text-gray-400 text-sm">Searches Used</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Average Accuracy</p>
                    <p className="text-2xl font-bold text-white">94.2%</p>
                    <p className="text-gray-400 text-sm">AI Recognition</p>
                  </div>
                  <Zap className="w-8 h-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/20 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Storage Used</p>
                    <p className="text-2xl font-bold text-white">
                      {currentSubscription?.usage.storageUsed || 0} GB
                    </p>
                    <p className="text-gray-400 text-sm">Image Storage</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
            <p className="text-gray-400">Select the perfect plan for your needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`bg-black/20 backdrop-blur-xl border-white/10 relative ${
                  plan.recommended ? 'ring-2 ring-purple-500/50' : ''
                }`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-500/30">
                        <Star className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                        <Crown className="w-3 h-3 mr-1" />
                        Recommended
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-gray-400">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-gray-400">/{plan.billingCycle}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      onClick={() => handleUpgradeSubscription(plan)}
                      disabled={currentPlan?.id === plan.id}
                      className={`w-full ${
                        currentPlan?.id === plan.id
                          ? 'bg-gray-600 cursor-not-allowed'
                          : plan.recommended
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {currentPlan?.id === plan.id ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Billing History
              </CardTitle>
              <CardDescription className="text-gray-400">
                View your past invoices and payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {billingHistory.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        invoice.status === 'paid' ? 'bg-green-600/20' :
                        invoice.status === 'pending' ? 'bg-orange-600/20' :
                        'bg-red-600/20'
                      }`}>
                        <DollarSign className={`w-4 h-4 ${
                          invoice.status === 'paid' ? 'text-green-400' :
                          invoice.status === 'pending' ? 'text-orange-400' :
                          'text-red-400'
                        }`} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{invoice.description}</p>
                        <p className="text-gray-400 text-sm">{format(new Date(invoice.date), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-white font-bold">${invoice.amount.toFixed(2)}</p>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card className="bg-black/20 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Usage Analytics</CardTitle>
              <CardDescription className="text-gray-400">
                Track your API usage and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4" />
                <p>Usage analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Upgrade Subscription</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedPlan ? `Upgrade to ${selectedPlan.name} plan` : 'Confirm your subscription upgrade'}
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-semibold mb-2">{selectedPlan.name}</h4>
                <p className="text-gray-400 text-sm mb-3">{selectedPlan.description}</p>
                <p className="text-2xl font-bold text-white">
                  ${selectedPlan.price}
                  <span className="text-gray-400 text-base font-normal">/{selectedPlan.billingCycle}</span>
                </p>
              </div>
              <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-purple-300 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  What you'll get:
                </p>
                <ul className="mt-2 space-y-1">
                  {selectedPlan.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="text-purple-200 text-sm flex items-center gap-2">
                      <CheckCircle className="w-3 h-3" />
                      {feature}
                    </li>
                  ))}
                  {selectedPlan.features.length > 3 && (
                    <li className="text-purple-300 text-sm">
                      +{selectedPlan.features.length - 3} more features
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpgrade}>
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionManager 