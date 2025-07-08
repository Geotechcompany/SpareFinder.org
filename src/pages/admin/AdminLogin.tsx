import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { client, apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowLeft,
  Server,
  Crown,
  Loader2
} from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in as admin
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      console.log('🔐 Existing admin session found, redirecting');
      window.location.href = '/admin/dashboard';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      console.group('🔐 Admin Login Process');
      console.log('Login Attempt:', { email });
      
      // Log full client object for debugging
      console.log('Client Object:', {
        methods: Object.keys(client),
        adminLoginExists: 'adminLogin' in client
      });

      // Attempt login using different methods
      let response;
      try {
        // Method 1: Direct client.adminLogin
        response = await client.adminLogin({ email, password });
        console.log('Method 1 (client.adminLogin) Response:', response);
      } catch (method1Error) {
        console.error('Method 1 Failed:', method1Error);
        
        try {
          // Method 2: Fallback to apiClient
          response = await apiClient.post('/api/auth/login', { 
            email, 
            password,
            isAdminLogin: true 
          });
          console.log('Method 2 (apiClient) Response:', response);
        } catch (method2Error) {
          console.error('Method 2 Failed:', method2Error);
          throw method2Error;
        }
      }

      // Detailed response logging
      console.log('Full Response:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      });

      // Check for successful login
      if (response.data && response.data.success) {
        const loginData = response.data;
        
        console.log('Login Data:', {
          userId: loginData.user?.id,
          email: loginData.user?.email,
          role: loginData.user?.role
        });

        // Set the token and user data manually since we're using admin login
        client.setToken(loginData.token);
        
        // Store token in localStorage for authentication
        localStorage.setItem('auth_token', loginData.token);
        
        // Store admin session info in localStorage for persistence
        const adminSession = {
          isAdminLogin: true,
          user: loginData.user,
          loginTime: new Date().toISOString(),
          role: loginData.user.role
        };
        localStorage.setItem('admin_session', JSON.stringify(adminSession));
        
        console.log('Admin Session Stored:', adminSession);
        
        toast({
          title: "Admin Login Successful",
          description: "Welcome to the admin console.",
        });
        
        // Multiple navigation attempts
        console.log('Attempting to navigate to /admin/dashboard');
        
        // Try multiple navigation methods
        setTimeout(() => {
          try {
            // Method 1: React Router
            navigate('/admin/dashboard');
          } catch (navError) {
            console.error('React Router Navigation Failed:', navError);
            
            // Method 2: Window location
            window.location.href = '/admin/dashboard';
          }
        }, 100);
      } else {
        // Detailed error handling
        const errorMessage = response.data?.error 
          || response.data?.message 
          || 'Admin login failed';
        
        console.error('Login Failed:', errorMessage);
        
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Admin Login Failed",
          description: errorMessage,
        });
      }

      console.groupEnd();
    } catch (err) {
      console.error('🔐 Admin Login Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Admin login failed';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Admin Login Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900/20 to-orange-900/20 relative overflow-hidden">
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
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl opacity-40"
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

      {/* Back to Main Site Link */}
      <Link 
        to="/"
        className="absolute top-6 left-6 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Main Site</span>
      </Link>

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4 relative z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-orange-600/10 rounded-3xl blur-xl opacity-60" />
        
        <Card className="relative bg-black/40 backdrop-blur-xl border-red-500/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            {/* Admin Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-full blur-lg" />
              <div className="relative w-16 h-16 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-200 to-orange-200 bg-clip-text text-transparent">
              Admin Console
            </CardTitle>
            <CardDescription className="text-gray-400">
              Restricted Access - Administrators Only
            </CardDescription>

            {/* Security Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-full border border-red-500/30 backdrop-blur-xl mt-2"
            >
              <Crown className="w-3 h-3 text-red-400 mr-2" />
              <span className="text-red-300 text-xs font-semibold">Secure Admin Portal</span>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert variant="destructive" className="bg-red-900/20 border-red-500/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="email" className="text-gray-300 flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Admin Email</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  className="bg-black/20 border-red-500/30 text-white placeholder-gray-500 focus:border-red-400 focus:ring-red-400/20"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="text-gray-300 flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>Admin Password</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your admin password"
                    required
                    className="bg-black/20 border-red-500/30 text-white placeholder-gray-500 focus:border-red-400 focus:ring-red-400/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-2"
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-3 shadow-lg shadow-red-500/25 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Access Admin Console
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Security Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-4 border-t border-red-500/20"
            >
              <div className="flex items-start space-x-3 text-sm text-gray-400">
                <Server className="w-4 h-4 mt-0.5 text-red-400" />
                <div>
                  <p className="font-medium text-red-300">Security Notice</p>
                  <p className="text-xs">
                    This is a restricted admin portal. All access attempts are logged and monitored.
                    Only authorized administrators should access this system.
                  </p>
                </div>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-6 space-y-2"
        >
          <p className="text-gray-500 text-sm">
            Need regular user access?{' '}
            <Link to="/login" className="text-red-400 hover:text-red-300 transition-colors">
              User Login
            </Link>
          </p>
          <p className="text-gray-600 text-xs">
            © 2024 SpareFinder - Admin Console
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminLogin; 