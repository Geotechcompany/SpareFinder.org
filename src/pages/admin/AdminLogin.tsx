import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Shield, Lock, Chrome, Sparkles, AlertTriangle, Server } from 'lucide-react';
import { useState } from 'react';

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Admin authentication logic
    console.log('Admin login attempt:', { email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
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
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-700/5 rounded-full blur-2xl opacity-30"
          animate={{
            scale: [0.8, 1.1, 0.8],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Security Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6 p-4 bg-red-900/30 backdrop-blur-xl rounded-2xl border border-red-800/50"
        >
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </motion.div>
            <div>
              <p className="text-red-200 font-medium text-sm">Restricted Access Zone</p>
              <p className="text-red-300/80 text-xs">Administrative privileges required</p>
            </div>
          </div>
        </motion.div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-rose-600/10 rounded-3xl blur-xl opacity-60" />
          <Card className="relative backdrop-blur-xl bg-black/20 border-red-800/30 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-full blur-xl"
                    />
                    <div className="relative w-16 h-16 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600/20 to-rose-600/20 rounded-full border border-red-500/30 backdrop-blur-xl mb-4"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Server className="w-4 h-4 text-red-400" />
                  </motion.div>
                  <span className="text-red-300 text-sm font-semibold">System Administration</span>
                </motion.div>

                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white via-red-100 to-rose-100 bg-clip-text text-transparent mb-3">
                  Admin Portal
                </CardTitle>
                <CardDescription className="text-red-200/80 text-lg">
                  Secure access to system administration
                </CardDescription>
              </motion.div>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200 font-medium">Administrator Email</Label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-4 h-5 w-5 text-red-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@geotech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-14 bg-white/5 border-red-800/30 text-white placeholder:text-gray-400 focus:border-red-400 focus:ring-red-400/30 rounded-xl backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-200 font-medium">Master Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-red-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-14 bg-white/5 border-red-800/30 text-white placeholder:text-gray-400 focus:border-red-400 focus:ring-red-400/30 rounded-xl backdrop-blur-sm"
                      required
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </motion.button>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    className="w-full h-14 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold text-lg shadow-lg shadow-red-500/25 rounded-xl"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Authenticate Access
                  </Button>
                </motion.div>
              </motion.form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-red-800/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-4 text-red-300/80 font-medium">Enterprise Authentication</span>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-12 bg-white/5 border-red-800/30 text-red-200 hover:bg-red-800/10 hover:border-red-600/50 rounded-xl backdrop-blur-sm"
                >
                  <Chrome className="mr-3 h-5 w-5" />
                  Google Workspace SSO
                </Button>
              </motion.div>

              <div className="mt-8 text-center space-y-3">
                <p className="text-red-300/70 text-sm">
                  <Link to="/login" className="hover:text-red-200 underline underline-offset-4 font-medium transition-colors">
                    ← Back to user login
                  </Link>
                </p>
                <p className="text-red-300/70 text-sm">
                  <Link to="/admin/forgot-password" className="hover:text-red-200 underline underline-offset-4 font-medium transition-colors">
                    Forgot master password?
                  </Link>
                </p>
                <div className="pt-4 border-t border-red-900/30">
                  <p className="text-red-400/60 text-xs">
                    All admin access attempts are logged and monitored
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin; 