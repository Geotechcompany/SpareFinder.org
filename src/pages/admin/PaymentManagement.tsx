import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { PLAN_CONFIG } from "@/lib/plans";
import { SpinningLogoLoader } from "@/components/brand/spinning-logo-loader";
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
  Trash2,
} from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  secret_key: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  transactions_count?: number | null;
  revenue?: number | null;
  fees?: number | null;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface StripeInvoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  invoice_url?: string | null;
}

const PaymentManagement = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [estimatedRevenue, setEstimatedRevenue] = useState<number | null>(null);
  const [estimatedTransactions, setEstimatedTransactions] = useState<
    number | null
  >(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [estimatedFees, setEstimatedFees] = useState<number | null>(null);
  
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

      // Fetch payment methods
      const methodsResponse = await api.admin.getPaymentMethods();

      if (methodsResponse.success && methodsResponse.data?.methods) {
        setMethods(methodsResponse.data.methods);
      } else {
        throw new Error(methodsResponse.message || 'Failed to fetch payment methods');
      }

      // Best-effort fetch of subscriber stats to estimate revenue/transactions
      try {
        const subscribersResponse = await api.admin.getSubscribers(
          1,
          1,
          "all",
          "all"
        );

        const statsData = (subscribersResponse.data as any)?.statistics;

        if (subscribersResponse.success && statsData) {
          const byTier = (statsData.by_tier || {}) as {
            free?: number;
            pro?: number;
            enterprise?: number;
          };

          const byStatus = (statsData.by_status || {}) as {
            active?: number;
            canceled?: number;
            past_due?: number;
            unpaid?: number;
            trialing?: number;
          };

          const freeCount = byTier.free || 0;
          const proCount = byTier.pro || 0;
          const enterpriseCount = byTier.enterprise || 0;

          const totalRevenueFromPlans =
            freeCount * PLAN_CONFIG.free.price +
            proCount * PLAN_CONFIG.pro.price +
            enterpriseCount * PLAN_CONFIG.enterprise.price;

          setEstimatedRevenue(totalRevenueFromPlans);

          // Treat total subscriptions across all statuses as an
          // approximate transaction count for this period.
          const totalTransactionsFromSubs =
            (byStatus.active || 0) +
            (byStatus.canceled || 0) +
            (byStatus.past_due || 0) +
            (byStatus.unpaid || 0) +
            (byStatus.trialing || 0);

          setEstimatedTransactions(
            totalTransactionsFromSubs > 0 ? totalTransactionsFromSubs : null
          );
        } else {
          setEstimatedRevenue(null);
          setEstimatedTransactions(null);
        }

      // Best-effort fetch of Stripe invoices for transaction table
      try {
        setIsInvoicesLoading(true);
        setInvoicesError(null);

        const invoicesResponse = await api.billing.getInvoices({
          page: 1,
          limit: 20,
        });

        const invoicesData = (invoicesResponse as any)?.invoices as
          | StripeInvoice[]
          | undefined;

        if (Array.isArray(invoicesData) && invoicesData.length > 0) {
          setInvoices(invoicesData);

          // Approximate Stripe fees as a percentage of invoice amount.
          // This is a visual indicator only; for exact fees, we'd need
          // to query Stripe balance transactions.
          const STRIPE_FEE_RATE = 0.029; // 2.9% typical card fee
          const STRIPE_FIXED_FEE = 0.2; // £0.20 per transaction (approx)

          const totalEstimatedFees = invoicesData.reduce((sum, inv) => {
            const base = inv.amount || 0;
            return sum + base * STRIPE_FEE_RATE + STRIPE_FIXED_FEE;
          }, 0);

          setEstimatedFees(totalEstimatedFees);
        } else {
          setInvoices([]);
          setEstimatedFees(null);
        }
      } catch (invErr) {
        console.error("Error fetching Stripe invoices:", invErr);
        setInvoices([]);
        setInvoicesError(
          invErr instanceof Error
            ? invErr.message
            : "Failed to load Stripe transactions"
        );
      } finally {
        setIsInvoicesLoading(false);
      }
      } catch (subErr) {
        console.error("Error fetching subscriber statistics for revenue:", subErr);
        setEstimatedRevenue(null);
        setEstimatedTransactions(null);
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
    totalRevenue:
      estimatedRevenue ??
      methods.reduce((sum, method) => {
        const value =
          typeof method.revenue === "number"
            ? method.revenue
            : Number((method as any).revenue) || 0;
        return sum + value;
      }, 0),
    totalTransactions:
      estimatedTransactions ??
      methods.reduce((sum, method) => {
        const value =
          typeof method.transactions_count === "number"
            ? method.transactions_count
            : Number((method as any).transactions_count) || 0;
        return sum + value;
      }, 0),
    totalFees:
      estimatedFees ??
      methods.reduce((sum, method) => {
        const value =
          typeof method.fees === "number"
            ? method.fees
            : Number((method as any).fees) || 0;
        return sum + value;
      }, 0),
    activeMethods: methods.filter(method => method.status === 'active').length
  };

  const formatInvoiceDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-green-600/20 dark:text-green-300 dark:border-green-500/30";
      case "inactive":
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-600/20 dark:text-gray-300 dark:border-gray-500/30";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-yellow-600/20 dark:text-yellow-300 dark:border-yellow-500/30";
      default:
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-600/20 dark:text-red-300 dark:border-red-500/30";
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
    return <SpinningLogoLoader label="Loading payment methods…" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-[#F0F2F5] to-[#E8EBF1] dark:from-gray-900 dark:via-green-900/20 dark:to-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-green-500 mx-auto mb-4" />
          <p className="text-muted-foreground dark:text-gray-400 mb-4">{error}</p>
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
          {/* Header + Add Payment Method Modal */}
          <Dialog>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/5 to-green-500/5 blur-xl opacity-70 dark:from-green-600/10 dark:to-emerald-600/10" />
              <div className="relative rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-soft-elevated px-4 py-4 sm:px-6 sm:py-6 dark:bg-black/20 dark:border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full border border-emerald-200 text-emerald-700 backdrop-blur-xl mb-4 dark:border-green-500/30 dark:text-green-300"
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <CreditCard className="w-4 h-4 text-emerald-500 dark:text-green-400" />
                      </motion.div>
                      <span className="text-sm font-semibold">Payments</span>
                    </motion.div>
                    <motion.h1 
                      className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-green-100 dark:to-emerald-200 dark:bg-clip-text dark:text-transparent mb-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Payment Management
                    </motion.h1>
                    <motion.p 
                      className="text-muted-foreground text-lg"
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
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25 h-12 px-6">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Payment Method
                        </Button>
                      </DialogTrigger>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Add Payment Method Modal */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>
                  Configure a new payment gateway for the system.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="font-medium text-muted-foreground dark:text-gray-200"
                    >
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Payment method name"
                      className="h-12 bg-background border-border text-foreground rounded-xl dark:bg-white/5 dark:border-white/10 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="provider"
                      className="font-medium text-muted-foreground dark:text-gray-200"
                    >
                      Provider
                    </Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(value) =>
                        handleInputChange("provider", value)
                      }
                    >
                      <SelectTrigger className="h-12 bg-background border-border text-foreground rounded-xl dark:bg-white/5 dark:border-white/10 dark:text-white">
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
                    <Label
                      htmlFor="apikey"
                      className="font-medium text-muted-foreground dark:text-gray-200"
                    >
                      API Key
                    </Label>
                    <Input
                      id="apikey"
                      type="password"
                      value={formData.api_key}
                      onChange={(e) =>
                        handleInputChange("api_key", e.target.value)
                      }
                      placeholder="Enter API key"
                      className="h-12 bg-background border-border text-foreground rounded-xl dark:bg-white/5 dark:border-white/10 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="secretkey"
                      className="font-medium text-muted-foreground dark:text-gray-200"
                    >
                      Secret Key
                    </Label>
                    <Input
                      id="secretkey"
                      type="password"
                      value={formData.secret_key}
                      onChange={(e) =>
                        handleInputChange("secret_key", e.target.value)
                      }
                      placeholder="Enter secret key"
                      className="h-12 bg-background border-border text-foreground rounded-xl dark:bg-white/5 dark:border-white/10 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
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
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="font-medium text-muted-foreground dark:text-gray-200"
                  >
                    Description (Optional)
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Brief description of this payment method"
                    className="h-12 bg-background border-border text-foreground rounded-xl dark:bg-white/5 dark:border-white/10 dark:text-white"
                  />
                </div>
              </div>
              <DialogFooter />
            </DialogContent>
          </Dialog>

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
                <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated hover:border-primary/30 hover:shadow-lg dark:bg-black/20 dark:border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-foreground dark:text-white">
                          {stat.value}
                        </p>
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
            {methods.map((method, index) => {
              const safeTransactions =
                typeof method.transactions_count === "number"
                  ? method.transactions_count
                  : Number((method as any).transactions_count) || 0;
              const safeRevenue =
                typeof method.revenue === "number"
                  ? method.revenue
                  : Number((method as any).revenue) || 0;
              const safeFees =
                typeof method.fees === "number"
                  ? method.fees
                  : Number((method as any).fees) || 0;

              return (
                <motion.div
                  key={method.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="relative"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${getProviderColor(
                      method.provider
                    )} opacity-10 rounded-2xl blur-xl`}
                  />
                  <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated hover:border-primary/30 hover:shadow-lg dark:bg-black/20 dark:border-white/10">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getProviderColor(method.provider)} flex items-center justify-center text-2xl`}>
                          {getProviderIcon(method.provider)}
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground dark:text-white">
                            {method.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground dark:text-gray-300">
                      {method.description}
                    </p>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4 p-3 rounded-xl bg-muted/80 dark:bg-white/5">
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground dark:text-white">
                          {safeTransactions.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground dark:text-gray-400">
                          Transactions
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground dark:text-white">
                          £{safeRevenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground dark:text-gray-400">
                          Revenue
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground dark:text-white">
                          £{safeFees.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground dark:text-gray-400">
                          Fees
                        </div>
                      </div>
                    </div>

                    {/* API Keys */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground dark:text-gray-200">
                          API Key
                        </Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            type={showSecrets[method.id] ? 'text' : 'password'}
                            value={method.api_key}
                            readOnly
                            className="h-10 bg-muted/70 border-border text-foreground text-sm font-mono dark:bg-white/5 dark:border-white/10 dark:text-white"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSecretVisibility(method.id)}
                            className="h-10 w-10 p-0 border-border/60 hover:bg-muted dark:border-white/10 dark:hover:bg-white/10"
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
                        <Label className="text-sm text-muted-foreground dark:text-gray-200">
                          Secret Key
                        </Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            type={showSecrets[method.id] ? 'text' : 'password'}
                            value={method.secret_key}
                            readOnly
                            className="h-10 bg-muted/70 border-border text-foreground text-sm font-mono dark:bg-white/5 dark:border-white/10 dark:text-white"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSecretVisibility(method.id)}
                            className="h-10 w-10 p-0 border-border/60 hover:bg-muted dark:border-white/10 dark:hover:bg-white/10"
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
                          className="p-2 rounded-lg transition-colors hover:bg-muted dark:hover:bg-white/10"
                        >
                          <Settings className="w-4 h-4 text-blue-400" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg transition-colors hover:bg-muted dark:hover:bg-white/10"
                        >
                          <BarChart3 className="w-4 h-4 text-green-400" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg transition-colors hover:bg-muted dark:hover:bg-white/10"
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
                          <AlertDialogContent className="bg-card text-foreground border-border shadow-soft-elevated dark:bg-black/80 dark:text-white dark:border-white/10 backdrop-blur-xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-lg font-semibold text-foreground dark:text-white">
                                Delete Payment Method
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-sm text-muted-foreground dark:text-gray-400">
                                Are you sure you want to delete "{method.name}"? This action cannot be undone and will permanently remove this payment method from the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border bg-background/80 text-foreground hover:bg-muted dark:bg-white/10 dark:text-white dark:border-white/20 dark:hover:bg-white/20">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(method.id)}
                                className="bg-red-600 text-white hover:bg-red-700"
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
                          variant={method.status === "active" ? "outline" : "default"}
                          size="sm"
                          className={
                            method.status === "active"
                              ? "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-yellow-600/30 dark:text-yellow-400 dark:hover:bg-yellow-600/10"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }
                        >
                          {method.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              );
            })}
          </motion.div>

          {/* Stripe Transactions (Invoices) Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-green-600/5 rounded-3xl blur-xl opacity-60" />
            <Card className="relative bg-card/95 backdrop-blur-xl border-border shadow-soft-elevated dark:bg-black/20 dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground dark:text-white">
                  <Receipt className="w-5 h-5 text-emerald-500 dark:text-green-400" />
                  <span>Recent Stripe Transactions</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Latest invoices synced from your Stripe account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isInvoicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin text-emerald-500" />
                    <span className="text-sm text-muted-foreground">
                      Loading Stripe invoices...
                    </span>
                  </div>
                ) : invoicesError ? (
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-200">
                    <span>{invoicesError}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchPaymentMethods}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                  </div>
                ) : invoices.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No Stripe invoices found yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-sm">
                              {inv.id}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatInvoiceDate(inv.created_at)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className="bg-emerald-100 text-emerald-700 border-emerald-200 capitalize dark:bg-emerald-600/20 dark:text-emerald-200 dark:border-emerald-500/40"
                              >
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              £{inv.amount.toLocaleString()}{" "}
                              <span className="text-xs uppercase text-muted-foreground">
                                {inv.currency}
                              </span>
                            </TableCell>
                            <TableCell>
                              {inv.invoice_url ? (
                                <a
                                  href={inv.invoice_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-300"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentManagement; 