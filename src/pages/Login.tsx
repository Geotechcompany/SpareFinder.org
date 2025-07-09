import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LogIn, 
  Mail, 
  Lock, 
  Github, 
  Chrome, 
  Loader2 
} from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signInWithOAuth, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both email and password',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      // Error is already handled in AuthContext, just reset submission state
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setIsSubmitting(true);
      await signInWithOAuth(provider);
      // OAuth redirection is handled by Supabase
    } catch (error) {
      toast({
        title: 'OAuth Login Failed',
        description: `Failed to log in with ${provider}`,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent rendering login form if already authenticated
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center">
              <LogIn className="w-6 h-6 mr-2 text-purple-400" />
              Login to SpareFinderAI
            </CardTitle>
            <CardDescription className="text-gray-400">
              Access your automotive part identification dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <label htmlFor="email" className="text-gray-300">Email</label>
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <Lock className="w-4 h-4 mr-2 text-gray-400" />
                  <label htmlFor="password" className="text-gray-300">Password</label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging in...</>
                ) : (
                  <>Login</>
                )}
              </Button>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600"></span>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-black/40 text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('google')}
                  className="flex items-center justify-center"
                >
                  <Chrome className="w-4 h-4 mr-2" /> Google
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('github')}
                  className="flex items-center justify-center"
                >
                  <Github className="w-4 h-4 mr-2" /> GitHub
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
