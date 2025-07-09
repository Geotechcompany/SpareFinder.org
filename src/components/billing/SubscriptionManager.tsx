import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const SubscriptionManager: React.FC = () => {
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const response = await api.billing.getCurrentSubscription();
        
        if (response.success && response.data) {
          setSubscription(response.data);
        } else {
          toast.error('Failed to fetch subscription details');
        }
      } catch (error) {
        console.error('Subscription fetch error:', error);
        toast.error('Failed to fetch subscription details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const handleUpgradeSubscription = async (planType: string) => {
    if (!user) {
      toast.error('Please log in to upgrade subscription');
      return;
    }

    try {
      const response = await api.billing.upgradeSubscription(planType);
      
      if (response.success) {
        setSubscription(response.data);
        toast.success(`Successfully upgraded to ${planType} plan`);
      } else {
        toast.error('Failed to upgrade subscription');
      }
    } catch (error) {
      console.error('Subscription upgrade error:', error);
      toast.error('Failed to upgrade subscription');
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) {
      toast.error('Please log in to cancel subscription');
      return;
    }

    try {
      const response = await api.billing.cancelSubscription();
      
      if (response.success) {
        setSubscription(null);
        toast.success('Subscription cancelled successfully');
      } else {
        toast.error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          Loading subscription information...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Management</CardTitle>
      </CardHeader>
      <CardContent>
        {subscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{subscription.plan_name}</h3>
                <Badge 
                  variant={subscription.status === 'active' ? 'default' : 'destructive'}
                >
                  {subscription.status}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">${subscription.price}/month</p>
                <p className="text-sm text-muted-foreground">
                  Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline"
                onClick={() => handleUpgradeSubscription('pro')}
              >
                Upgrade Plan
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancelSubscription}
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p>No active subscription</p>
            <Button 
              onClick={() => handleUpgradeSubscription('basic')}
            >
              Choose a Plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 