import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShieldX, ArrowLeft, Home, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const Unauthorized = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const requiredRole = (location.state as any)?.requiredRole as
    | 'admin'
    | 'super_admin'
    | 'user'
    | undefined

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-orange-900/20" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Glassmorphism Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-white/[0.02] to-transparent backdrop-blur-3xl rounded-3xl border border-white/10" />
            <div className="relative bg-gray-900/20 backdrop-blur-3xl rounded-3xl border border-red-500/20 shadow-2xl shadow-red-500/10 p-8">
              
              {/* Error Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                  <div className="relative w-16 h-16 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center">
                    <ShieldX className="w-8 h-8 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl font-bold text-white mb-3">
                  Access Denied
                </h1>
                <p className="text-gray-300 text-lg mb-4">
                  You don't have permission to access this page
                </p>
                
                {user ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 text-red-300">
                      <Lock className="w-5 h-5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-medium">Signed in as: {user.email}</p>
                        <p className="text-sm text-red-400">Role: {user.role}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {requiredRole === 'super_admin'
                            ? 'This area requires super admin privileges.'
                            : requiredRole === 'admin'
                            ? 'This area requires administrator privileges.'
                            : 'You do not have permission to access this page.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
                    <p className="text-orange-300 font-medium">
                      Please sign in to access this area.
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="space-y-4"
              >
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  className="w-full h-12 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 rounded-xl"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Go Back
                </Button>

                <Button
                  asChild
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl"
                >
                  <Link to="/dashboard">
                    <Home className="w-5 h-5 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>

                {!user && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-12 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 rounded-xl"
                  >
                    <Link to="/login">
                      Sign In
                    </Link>
                  </Button>
                )}
              </motion.div>

              {/* Help Text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-400 text-sm">
                  Need admin access?{' '}
                  <Link 
                    to="/contact" 
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Contact Support
                  </Link>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Unauthorized 